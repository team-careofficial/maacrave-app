import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

/**
 * Sends SMS through a Bangladeshi gateway. Set SMS_PROVIDER=bulksmsbd with an API key in production.
 * SMS_PROVIDER=log prints the message to the server log and is refused when NODE_ENV=production.
 */
@Injectable()
export class SmsService {
  private log = new Logger('SMS');

  /** True when real SMS can be sent (a gateway is configured). */
  enabled() { return (process.env.SMS_PROVIDER || 'log') === 'bulksmsbd'; }

  async send(phone: string, message: string): Promise<void> {
    const provider = process.env.SMS_PROVIDER || 'log';
    if (provider === 'bulksmsbd') {
      const url = new URL('https://bulksmsbd.net/api/smsapi');
      url.searchParams.set('api_key', process.env.BULKSMSBD_API_KEY || '');
      url.searchParams.set('type', 'text');
      url.searchParams.set('number', '88' + phone);
      url.searchParams.set('senderid', process.env.BULKSMSBD_SENDER_ID || '');
      url.searchParams.set('message', message);
      const res = await fetch(url, { method: 'GET' });
      const body = await res.text();
      if (!res.ok || !/202|success/i.test(body)) {
        this.log.error(`SMS failed for ${phone.slice(0, 5)}***: ${body.slice(0, 200)}`);
        throw new ServiceUnavailableException('We couldn’t send the code. Please try again in a minute.');
      }
      return;
    }
    if (process.env.NODE_ENV === 'production') throw new ServiceUnavailableException('SMS provider is not configured.');
    this.log.warn(`[dev] SMS to ${phone}: ${message}`);
  }
}
