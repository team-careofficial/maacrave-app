import { Body, Controller, Get, HttpCode, Logger, Module, Param, Post, Query, Req, Res } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import type { Request, Response } from 'express';
import { AuthUser, CurrentUser, Public } from '../common/auth';
import { PrismaService } from '../common/prisma.service';
import { BkashGateway, SslCommerzGateway } from '../payments/gateways';
import { OrdersService } from './orders.service';

class LineDto { @IsString() dishId: string; @Type(() => Number) @IsInt() @Min(1) @Max(50) quantity: number; }
class CheckoutDto {
  @IsIn(['cart', 'batch', 'request']) kind: 'cart' | 'batch' | 'request';
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => LineDto) items?: LineDto[];
  @IsOptional() @IsString() batchId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) quantity?: number;
  @IsOptional() @IsString() requestId?: string;
  @IsOptional() @IsString() proposalId?: string;
  @IsOptional() @IsBoolean() allowGroup?: boolean;
  @IsOptional() @IsString() @MaxLength(20) couponCode?: string;
  /** Lets the quote price delivery by distance. */
  @IsOptional() @IsString() addressId?: string;
}
class PlaceDto extends CheckoutDto {
  @IsString() addressId: string;
  @IsIn(['BKASH', 'SSLCOMMERZ', 'COD']) paymentMethod: PaymentMethod;
  @IsOptional() @IsString() @MaxLength(300) notes?: string;
  @IsOptional() @IsString() scheduledFor?: string;
  @IsOptional() @IsString() @MaxLength(64) idempotencyKey?: string;
  @IsOptional() @IsIn(['app', 'web']) client?: 'app' | 'web';
}
class PayDto { @IsOptional() @IsIn(['app', 'web']) client?: 'app' | 'web'; }
class ReviewDto { @Type(() => Number) @IsInt() @Min(1) @Max(5) stars: number; @IsOptional() @IsString() @MaxLength(400) text?: string; }
class ComplaintDto {
  @IsIn(['Missing item', 'Food quality', 'Late delivery', 'Hygiene concern', 'Wrong order', 'Rider behaviour', 'Other']) type: string;
  @IsString() @MinLength(5) @MaxLength(800) text: string;
  @IsBoolean() refundRequested: boolean;
  @Type(() => Number) @IsInt() @Min(0) refundAmount: number;
}

@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}
  @Post('quote') @HttpCode(200) quote(@CurrentUser() u: AuthUser, @Body() dto: CheckoutDto) { return this.orders.quote(u, dto); }
  @Post() place(@CurrentUser() u: AuthUser, @Body() dto: PlaceDto) { return this.orders.place(u, dto); }
  @Get() list(@CurrentUser() u: AuthUser, @Query('scope') scope = 'active') { return this.orders.list(u, scope); }
  @Get('complaints') complaints(@CurrentUser() u: AuthUser) { return this.orders.complaints(u); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.orders.get(u, id); }
  @Post(':id/pay') @HttpCode(200) async pay(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: PayDto) { return { paymentUrl: await this.orders.startPayment(u, id, dto.client) }; }
  @Post(':id/cancel') @HttpCode(200) cancel(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.orders.cancelByCustomer(u, id); }
  @Post(':id/review') review(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: ReviewDto) { return this.orders.review(u, id, dto.stars, dto.text); }
  @Post(':id/complaint') complaint(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: ComplaintDto) { return this.orders.complaint(u, id, dto.type, dto.text, dto.refundRequested, dto.refundAmount); }
}

/** Gateway callbacks. Money is only trusted after the server re-checks it with the gateway. */
@Public()
@Controller('payments')
export class PaymentsController {
  private log = new Logger('Payments');
  constructor(private prisma: PrismaService, private orders: OrdersService, private bkash: BkashGateway, private ssl: SslCommerzGateway) {}

  private async back(res: Response, orderId: string | undefined, status: 'success' | 'failed' | 'cancelled') {
    const pay = orderId ? await this.prisma.payment.findUnique({ where: { orderId }, select: { returnTo: true } }) : null;
    const base = pay?.returnTo === 'web' && process.env.WEB_RETURN_URL ? process.env.WEB_RETURN_URL : process.env.APP_RETURN_URL || 'maacrave://payment-result';
    const sep = base.includes('?') ? '&' : '?';
    return res.redirect(302, `${base}${sep}status=${status}${orderId ? `&orderId=${orderId}` : ''}`);
  }

  @Get('bkash/callback')
  async bkashCallback(@Query('paymentID') paymentID: string, @Query('status') status: string, @Res() res: Response) {
    const pay = paymentID ? await this.prisma.payment.findFirst({ where: { providerRef: paymentID } }) : null;
    if (!pay) return this.back(res, undefined, 'failed');
    if (status !== 'success') { await this.orders.markPaymentFailed(pay.orderId, { status }); return this.back(res, pay.orderId, status === 'cancel' ? 'cancelled' : 'failed'); }
    try {
      let r = await this.bkash.execute(paymentID);
      if (r.transactionStatus !== 'Completed') r = { ...r, ...(await this.bkash.query(paymentID)) };
      if (r.transactionStatus === 'Completed' && Number(r.amount ?? pay.amount) >= pay.amount) {
        await this.orders.markPaid(pay.orderId, r.trxID, r);
        return this.back(res, pay.orderId, 'success');
      }
      await this.orders.markPaymentFailed(pay.orderId, r);
    } catch (e) { this.log.error(`bKash execute failed: ${(e as Error).message}`); }
    return this.back(res, pay.orderId, 'failed');
  }

  private async sslSettle(body: Record<string, string>) {
    const order = body.tran_id ? await this.prisma.order.findUnique({ where: { code: body.tran_id }, include: { payment: true } }) : null;
    if (!order || !order.payment) return { order: null, ok: false };
    if (body.status !== 'VALID' || !body.val_id) { await this.orders.markPaymentFailed(order.id, body); return { order, ok: false }; }
    const v = await this.ssl.validate(body.val_id);
    const ok = (v.status === 'VALID' || v.status === 'VALIDATED') && v.tran_id === order.code && Number(v.amount) >= order.payment.amount;
    if (ok) await this.orders.markPaid(order.id, v.bank_tran_id, v); else await this.orders.markPaymentFailed(order.id, v);
    return { order, ok };
  }

  @Post('sslcommerz/ipn') @HttpCode(200)
  async sslIpn(@Req() req: Request) { await this.sslSettle(req.body); return { ok: true }; }

  @Post('sslcommerz/return')
  async sslReturn(@Req() req: Request, @Res() res: Response) {
    const r = await this.sslSettle(req.body);
    return this.back(res, r.order?.id, r.ok ? 'success' : req.body?.status === 'CANCELLED' ? 'cancelled' : 'failed');
  }
}

@Module({ providers: [OrdersService, BkashGateway, SslCommerzGateway], controllers: [OrdersController, PaymentsController], exports: [OrdersService] })
export class OrdersModule {}
