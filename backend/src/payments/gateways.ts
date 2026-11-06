import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

/**
 * bKash Tokenized Checkout (v1.2.0-beta).
 * Docs: https://developer.bka.sh — use the sandbox base URL until bKash approves the merchant for live.
 */
@Injectable()
export class BkashGateway {
  private log = new Logger('bKash');
  private token: { idToken: string; expires: number } | null = null;
  private get base() { return process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'; }
  configured() { return !!(process.env.BKASH_APP_KEY && process.env.BKASH_APP_SECRET && process.env.BKASH_USERNAME && process.env.BKASH_PASSWORD); }

  private async idToken(): Promise<string> {
    if (this.token && this.token.expires > Date.now()) return this.token.idToken;
    const res = await fetch(`${this.base}/tokenized/checkout/token/grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', username: process.env.BKASH_USERNAME!, password: process.env.BKASH_PASSWORD! },
      body: JSON.stringify({ app_key: process.env.BKASH_APP_KEY, app_secret: process.env.BKASH_APP_SECRET }),
    });
    const json = (await res.json()) as { id_token?: string; expires_in?: number; statusMessage?: string };
    if (!json.id_token) { this.log.error(`grant failed: ${JSON.stringify(json)}`); throw new ServiceUnavailableException('bKash is unavailable right now.'); }
    this.token = { idToken: json.id_token, expires: Date.now() + ((json.expires_in || 3600) - 120) * 1000 };
    return json.id_token;
  }

  private async call<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: await this.idToken(), 'X-APP-Key': process.env.BKASH_APP_KEY! },
      body: JSON.stringify(body),
    });
    return (await res.json()) as T;
  }

  async create(orderCode: string, amount: number, payerPhone: string, callbackURL: string) {
    if (!this.configured()) throw new ServiceUnavailableException('bKash payments are not set up yet. Choose cash on delivery.');
    const r = await this.call<{ paymentID?: string; bkashURL?: string; statusMessage?: string }>('/tokenized/checkout/create', {
      mode: '0011', payerReference: payerPhone, callbackURL, amount: amount.toFixed(2), currency: 'BDT', intent: 'sale', merchantInvoiceNumber: orderCode,
    });
    if (!r.paymentID || !r.bkashURL) throw new ServiceUnavailableException(r.statusMessage || 'Could not start bKash payment.');
    return { paymentId: r.paymentID, url: r.bkashURL };
  }

  execute(paymentID: string) {
    return this.call<{ transactionStatus?: string; trxID?: string; amount?: string; statusMessage?: string }>('/tokenized/checkout/execute', { paymentID });
  }

  query(paymentID: string) {
    return this.call<{ transactionStatus?: string; trxID?: string }>('/tokenized/checkout/payment/status', { paymentID });
  }

  refund(paymentID: string, trxID: string, amount: number, reason: string) {
    return this.call<{ refundTrxID?: string; transactionStatus?: string; statusMessage?: string }>('/tokenized/checkout/payment/refund', {
      paymentID, trxID, amount: amount.toFixed(2), sku: 'maacrave', reason: reason.slice(0, 100),
    });
  }
}

/** SSLCommerz hosted checkout — cards, Nagad, Rocket and other wallets. */
@Injectable()
export class SslCommerzGateway {
  private get base() { return process.env.SSLCZ_BASE_URL || 'https://sandbox.sslcommerz.com'; }
  configured() { return !!(process.env.SSLCZ_STORE_ID && process.env.SSLCZ_STORE_PASSWORD); }

  async create(o: { tranId: string; amount: number; name: string; phone: string; email?: string; address: string; area: string; product: string }) {
    if (!this.configured()) throw new ServiceUnavailableException('Card and wallet payments are not set up yet. Choose cash on delivery.');
    const api = process.env.API_PUBLIC_URL;
    const form = new URLSearchParams({
      store_id: process.env.SSLCZ_STORE_ID!, store_passwd: process.env.SSLCZ_STORE_PASSWORD!,
      total_amount: o.amount.toFixed(2), currency: 'BDT', tran_id: o.tranId,
      success_url: `${api}/payments/sslcommerz/return`, fail_url: `${api}/payments/sslcommerz/return`, cancel_url: `${api}/payments/sslcommerz/return`, ipn_url: `${api}/payments/sslcommerz/ipn`,
      cus_name: o.name, cus_email: o.email || 'customer@maacrave.app', cus_phone: o.phone, cus_add1: o.address.slice(0, 100), cus_city: 'Dhaka', cus_country: 'Bangladesh',
      shipping_method: 'NO', product_name: o.product.slice(0, 100), product_category: 'Food', product_profile: 'general', num_of_item: '1',
    });
    const res = await fetch(`${this.base}/gwprocess/v4/api.php`, { method: 'POST', body: form });
    const json = (await res.json()) as { status?: string; GatewayPageURL?: string; failedreason?: string };
    if (json.status !== 'SUCCESS' || !json.GatewayPageURL) throw new ServiceUnavailableException(json.failedreason || 'Could not start payment.');
    return { url: json.GatewayPageURL };
  }

  async validate(valId: string) {
    const u = new URL(`${this.base}/validator/api/validationserverAPI.php`);
    u.searchParams.set('val_id', valId); u.searchParams.set('store_id', process.env.SSLCZ_STORE_ID!); u.searchParams.set('store_passwd', process.env.SSLCZ_STORE_PASSWORD!); u.searchParams.set('format', 'json');
    const res = await fetch(u);
    return (await res.json()) as { status?: string; tran_id?: string; amount?: string; bank_tran_id?: string };
  }

  /** Sends the money back to the card or wallet (SSLCommerz refund API). The bank settles it in a few working days. */
  async refund(bankTranId: string, amount: number, remarks: string) {
    const u = new URL(`${this.base}/validator/api/merchantTransIDvalidationAPI.php`);
    u.searchParams.set('bank_tran_id', bankTranId); u.searchParams.set('refund_amount', amount.toFixed(2)); u.searchParams.set('refund_remarks', remarks.slice(0, 100));
    u.searchParams.set('store_id', process.env.SSLCZ_STORE_ID!); u.searchParams.set('store_passwd', process.env.SSLCZ_STORE_PASSWORD!); u.searchParams.set('v', '1'); u.searchParams.set('format', 'json');
    const res = await fetch(u);
    return (await res.json()) as { APIConnect?: string; status?: string; refund_ref_id?: string; errorReason?: string };
  }
}
