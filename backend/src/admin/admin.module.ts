import {
  BadRequestException, Body, CanActivate, Controller, ExecutionContext, Get, HttpCode, Injectable, Logger, Module, NotFoundException, Param, Post, Query,
  UnauthorizedException, UseGuards, createParamDecorator, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { ComplaintStatus, OrderStatus, RoleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { BusinessService } from '../business/business.module';
import { rateCard } from '../common/pricing';
import { RiderModule, RiderService } from '../rider/rider.module';
import { Public } from '../common/auth';
import { PrismaService } from '../common/prisma.service';
import { digits, sha256 } from '../common/util';
import { NotificationsService } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { OrdersService } from '../orders/orders.service';
import { EmailService } from '../sms/email.service';

/**
 * Internal admin API used only by the separate MaaCrave Admin website.
 *  - Nobody can become an admin from the app: admins are the email addresses listed in ADMIN_EMAILS.
 *  - Admin sessions are signed with their own secret (ADMIN_JWT_SECRET), so a customer token can never open these routes.
 *  - Every change is written to AdminLog.
 */
const ADMIN_TTL = '8h';
const OTP_TTL_MS = 5 * 60_000;
// Tolerates spaces, quotes and semicolons people often paste into the dashboard.
const adminEmails = () => (process.env.ADMIN_EMAILS || '').split(/[,;\s]+/).map((s) => s.replace(/["']/g, '').trim().toLowerCase()).filter(Boolean);
/** Support staff (SUPPORT_EMAILS): can answer customers, handle reports and orders, but can't touch money, rates, approvals or content. */
const supportEmails = () => (process.env.SUPPORT_EMAILS || '').split(/[,;\s]+/).map((s) => s.replace(/["']/g, '').trim().toLowerCase()).filter(Boolean);
const roleOf = (email: string): 'admin' | 'support' | null => (adminEmails().includes(email) ? 'admin' : supportEmails().includes(email) ? 'support' : null);
const SUPPORT_PATHS = /^\/v1\/admin\/(me|stats|tickets(\/.*)?|complaints(\/.*)?|orders(\/.*)?|activity)$/;
const adminSecret = () => {
  const s = process.env.ADMIN_JWT_SECRET;
  if (!s || s.length < 24) throw new UnauthorizedException('Admin access is not configured on the server.');
  return s;
};

const CurrentAdmin = createParamDecorator((_: unknown, ctx: ExecutionContext): string => ctx.switchToHttp().getRequest().adminEmail);

@Injectable()
class AdminGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Admin sign-in required.');
    try {
      const p = await this.jwt.verifyAsync<{ sub: string; typ: string }>(token, { secret: adminSecret() });
      // Removing an email from ADMIN_EMAILS revokes access immediately.
      const role = p.typ === 'admin' ? roleOf(p.sub) : null;
      if (!role) throw new Error('not admin');
      req.adminEmail = p.sub;
      req.adminRole = role;
    } catch {
      throw new UnauthorizedException('Admin session expired. Sign in again.');
    }
    const path = String(req.originalUrl || req.url || '').split('?')[0];
    if (req.adminRole === 'support' && !SUPPORT_PATHS.test(path)) throw new ForbiddenException('Support accounts can’t open this. Ask an admin.');
    return true;
  }
}

class AdminOtpDto { @IsEmail() email: string; }
class AdminVerifyDto extends AdminOtpDto { @IsString() @Length(6, 6) code: string; }
class DecisionDto { @IsOptional() @IsString() @MaxLength(300) note?: string; }
class ComplaintDto {
  @IsIn(['INVESTIGATING', 'RESOLVED']) status: ComplaintStatus;
  @IsOptional() @IsBoolean() refund?: boolean;
  /** Partial refund in taka; leave out for the full amount. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) refundAmount?: number;
  /** Who bears the refund. COOK and RIDER have it deducted from their earnings. */
  @IsOptional() @IsIn(['COOK', 'RIDER', 'MAACRAVE']) chargedTo?: 'COOK' | 'RIDER' | 'MAACRAVE';
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}
class RatesDto {
  @Type(() => Number) @IsNumber() @Min(0) @Max(40) commissionPct: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(100) serviceFee: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(300) deliveryFee: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(300) batchDeliveryFee: number;
  @Type(() => Number) @IsNumber() @Min(0) @Max(20) freeKm: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(100) deliveryPerKm: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(300) riderBase: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(100) riderPerKm: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(300) riderBatchDrop: number;
  @Type(() => Number) @IsInt() @Min(500) @Max(50000) riderCashLimit: number;
  /** One line telling partners what changed; sent with the notification. */
  @IsString() @MinLength(5) @MaxLength(200) summary: string;
}
class LedgerDto {
  @IsIn(['CASH_DEPOSIT', 'PAYOUT']) kind: 'CASH_DEPOSIT' | 'PAYOUT';
  @Type(() => Number) @IsInt() @Min(1) @Max(500000) amount: number;
  @IsOptional() @IsString() @MaxLength(60) reference?: string;
}
class OrderActionDto { @IsString() @MinLength(3) @MaxLength(200) reason: string; }
class TicketReplyDto { @IsString() @MinLength(1) @MaxLength(1500) body: string; @IsOptional() @IsBoolean() close?: boolean; }
export const SPOT_ICONS = ['soup', 'fish', 'drumstick', 'beef', 'leaf', 'cake', 'cookie', 'sun', 'moon', 'flame', 'sparkles', 'users', 'gift', 'heart', 'utensils', 'request', 'percent', 'coffee'];
export const SPOT_THEMES = ['crimson', 'saffron', 'forest', 'night', 'rose', 'ocean'];
export const SPOT_ANIMS = ['float', 'steam', 'pulse', 'shine', 'wiggle', 'spin'];
class SpotlightDto {
  @IsString() @Length(2, 40) title: string;
  @IsString() @Length(2, 40) titleBn: string;
  @IsString() @Length(2, 70) subtitle: string;
  @IsString() @Length(2, 70) subtitleBn: string;
  @IsIn(SPOT_ICONS) icon: string;
  @IsIn(SPOT_THEMES) theme: string;
  @IsIn(SPOT_ANIMS) animation: string;
  @Matches(/^(browse|request|groups|plans|category:[a-z]+|maxPrice:\d{2,4})$/) action: string;
  @IsIn(['arch', 'poster']) layout: string;
  @IsBoolean() active: boolean;
  /** New picture as a data URL; leave out to keep the current one. */
  @IsOptional() @Matches(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/) @MaxLength(1_500_000) image?: string;
  @IsOptional() @IsBoolean() removeImage?: boolean;
}
class FestivalDto {
  @IsString() @MinLength(2) @MaxLength(60) title: string;
  @IsString() @MinLength(2) @MaxLength(60) titleBn: string;
  @IsOptional() @IsString() @MaxLength(240) blurb?: string;
  @IsOptional() @IsString() @MaxLength(240) blurbBn?: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}T/) opensAt: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}T/) closesAt: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}T/) deliverOn: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
class PauseDto { @Type(() => Number) @IsInt() @Min(1) @Max(365) days: number; @IsString() @MinLength(3) @MaxLength(200) reason: string; }
class FeaturedDto { @IsOptional() @IsString() @MaxLength(40) cookId?: string | null; }
class PayoutDto { @IsIn(['PROCESSING', 'PAID', 'FAILED']) status: 'PROCESSING' | 'PAID' | 'FAILED'; @IsOptional() @IsString() @MaxLength(60) reference?: string; }

@Injectable()
export class AdminService {
  private log = new Logger('Admin');
  constructor(private prisma: PrismaService, private jwt: JwtService, private email: EmailService, private notify: NotificationsService, private orders: OrdersService, private business: BusinessService, private riders: RiderService) {}

  private audit(adminEmail: string, action: string, targetId?: string, detail?: string) {
    return this.prisma.adminLog.create({ data: { adminEmail, action, targetId, detail: detail?.slice(0, 500) } });
  }

  /* ---------- sign-in ---------- */
  async requestCode(raw: string) {
    const email = raw.trim().toLowerCase();
    // Same answer whether or not the email is an admin, so the list can't be probed.
    if (!adminEmails().length) this.log.error('ADMIN_EMAILS is empty — nobody can sign in to the admin panel.');
    if (!roleOf(email)) { this.log.warn(`Admin code requested for an email that is not in ADMIN_EMAILS (${email.replace(/(.{2}).*@/, '$1***@')})`); return { sent: true }; }
    const target = `admin:${email}`;
    const recent = await this.prisma.otpCode.count({ where: { target, createdAt: { gt: new Date(Date.now() - 10 * 60_000) } } });
    if (recent >= 3) throw new BadRequestException('Too many codes requested. Wait 10 minutes.');
    const code = digits(6);
    await this.prisma.otpCode.create({ data: { target, codeHash: sha256(`${target}:${code}:${process.env.OTP_SECRET}`), expiresAt: new Date(Date.now() + OTP_TTL_MS) } });
    await this.email.sendCode(email, code);
    this.log.log(`Admin sign-in code sent to ${email.replace(/(.{2}).*@/, '$1***@')}`);
    return { sent: true };
  }

  async verifyCode(raw: string, code: string) {
    const email = raw.trim().toLowerCase();
    const target = `admin:${email}`;
    const otp = await this.prisma.otpCode.findFirst({ where: { target, consumedAt: null }, orderBy: { createdAt: 'desc' } });
    if (!roleOf(email) || !otp || otp.expiresAt < new Date() || otp.attempts >= 5) throw new UnauthorizedException('Code expired or invalid. Request a new one.');
    if (otp.codeHash !== sha256(`${target}:${code}:${process.env.OTP_SECRET}`)) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException('That code isn’t right.');
    }
    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    await this.audit(email, 'SIGN_IN');
    return { token: await this.jwt.signAsync({ sub: email, typ: 'admin' }, { secret: adminSecret(), expiresIn: ADMIN_TTL }), email };
  }

  /* ---------- dashboard ---------- */
  async stats() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [users, cooks, riders, pendingApps, openComplaints, ordersToday, activeOrders, salesToday, pendingPayouts] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.userRole.count({ where: { role: 'COOK', status: 'APPROVED' } }),
      this.prisma.userRole.count({ where: { role: 'RIDER', status: 'APPROVED' } }),
      this.prisma.userRole.count({ where: { role: { in: ['COOK', 'RIDER'] }, status: 'PENDING' } }),
      this.prisma.complaint.count({ where: { status: { not: 'RESOLVED' } } }),
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.count({ where: { status: { notIn: ['DELIVERED', 'CANCELLED', 'AWAITING_PAYMENT'] } } }),
      this.prisma.order.aggregate({ where: { status: 'DELIVERED', updatedAt: { gte: today } }, _sum: { total: true, commission: true } }),
      this.prisma.payout.count({ where: { status: { in: ['REQUESTED', 'PROCESSING'] } } }),
    ]);
    const openTickets = await this.prisma.supportTicket.count({ where: { status: 'OPEN' } });
    // Orders that need a human: ready but no rider for 12+ minutes.
    const stuck = await this.prisma.order.findMany({ where: { status: 'READY', riderId: null, updatedAt: { lt: new Date(Date.now() - 12 * 60_000) } }, select: { id: true, code: true, area: true, updatedAt: true, cook: { select: { displayName: true, area: true } } }, take: 20 });
    // What MaaCrave really keeps per delivered order over the last 30 days, after gateway fees and refunds it paid.
    const since = new Date(Date.now() - 30 * 86400_000);
    const gatewayPct = Number(process.env.GATEWAY_PCT || 1.5);
    const [m, online, refunds] = await Promise.all([
      this.prisma.order.aggregate({ where: { status: 'DELIVERED', updatedAt: { gte: since } }, _count: true, _sum: { total: true, commission: true, serviceFee: true, deliveryFee: true, riderPayout: true, discount: true } }),
      this.prisma.order.aggregate({ where: { status: 'DELIVERED', updatedAt: { gte: since }, payment: { method: { in: ['BKASH', 'SSLCOMMERZ'] } } }, _sum: { total: true } }),
      this.prisma.complaint.aggregate({ where: { chargedTo: 'MAACRAVE', createdAt: { gte: since } }, _sum: { refundedAmount: true } }),
    ]);
    const s30 = m._sum;
    const gross = (s30.commission || 0) + (s30.serviceFee || 0) + (s30.deliveryFee || 0) - (s30.riderPayout || 0) - (s30.discount || 0);
    const gateway = Math.round((online._sum.total || 0) * gatewayPct / 100);
    const net = gross - gateway - (refunds._sum.refundedAmount || 0);
    const margin = { orders: m._count, sales: s30.total || 0, gross, gateway, refunds: refunds._sum.refundedAmount || 0, net, perOrder: m._count ? Math.round(net / m._count) : 0, gatewayPct };
    return { stuck, margin, users, cooks, riders, pendingApps, openComplaints, ordersToday, activeOrders, salesToday: salesToday._sum.total || 0, commissionToday: salesToday._sum.commission || 0, pendingPayouts, openTickets };
  }

  /* ---------- cook & rider applications ---------- */
  async applications(status: string, role?: string) {
    const list = await this.prisma.userRole.findMany({
      where: { role: role === 'RIDER' ? 'RIDER' : role === 'COOK' ? 'COOK' : { in: ['COOK', 'RIDER'] }, status: (['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].includes(status) ? status : 'PENDING') as RoleStatus },
      orderBy: { updatedAt: 'desc' }, take: 100,
      include: { user: { select: { id: true, name: true, phone: true, email: true, area: true, createdAt: true, cook: true, rider: true, documents: { select: { id: true, kind: true, role: true, createdAt: true } } } } },
    });
    return list.map((r) => ({ ...r, user: { ...r.user, documents: r.user.documents.filter((d) => d.role === r.role) } }));
  }

  async document(id: string) {
    const d = await this.prisma.document.findUnique({ where: { id } });
    if (!d) throw new NotFoundException();
    return { mime: d.mime, data: d.data, kind: d.kind };
  }

  async decide(admin: string, roleId: string, decision: 'APPROVED' | 'REJECTED' | 'SUSPENDED', note?: string) {
    const r = await this.prisma.userRole.findUnique({ where: { id: roleId } });
    if (!r || r.role === 'CUSTOMER' || r.role === 'ADMIN') throw new NotFoundException();
    if (decision === 'REJECTED' && !note) throw new BadRequestException('Write a short reason so the applicant knows what to fix.');
    await this.prisma.userRole.update({ where: { id: roleId }, data: { status: decision, note: note || null } });
    if (decision !== 'APPROVED' && r.role === 'COOK') await this.prisma.cookProfile.updateMany({ where: { userId: r.userId }, data: { accepting: false } });
    if (decision !== 'APPROVED' && r.role === 'RIDER') await this.prisma.riderProfile.updateMany({ where: { userId: r.userId }, data: { online: false } });
    const who = r.role === 'COOK' ? 'Mother / Cook' : 'Rider';
    const msg: Record<typeof decision, [string, string]> = {
      APPROVED: [`You're approved as a ${who} 🎉`, `Open Account and switch to ${who} mode to get started.`],
      REJECTED: [`${who} application needs changes`, note || 'Please check your details and apply again.'],
      SUSPENDED: [`${who} account suspended`, note || 'Contact support@maacrave.app for details.'],
    };
    await this.notify.notify(r.userId, 'CUSTOMER', msg[decision][0], msg[decision][1]);
    await this.audit(admin, `${r.role}_${decision}`, r.userId, note);
    return { ok: true };
  }

  /* ---------- reports / complaints ---------- */
  complaints(status?: string) {
    return this.prisma.complaint.findMany({
      where: status === 'ALL' ? {} : status === 'RESOLVED' ? { status: 'RESOLVED' } : { status: { not: 'RESOLVED' } },
      orderBy: { createdAt: 'desc' }, take: 100,
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        order: { select: { id: true, code: true, total: true, subtotal: true, status: true, cook: { select: { displayName: true, userId: true } }, rider: { select: { name: true } }, payment: { select: { method: true, status: true } } } },
      },
    });
  }

  async handleComplaint(admin: string, id: string, dto: ComplaintDto) {
    const c = await this.prisma.complaint.findUnique({ where: { id }, include: { order: true } });
    if (!c) throw new NotFoundException();
    const pay = await this.prisma.payment.findUnique({ where: { orderId: c.orderId } });
    const amount = dto.refund ? Math.min(dto.refundAmount || c.order.total, c.order.total) : 0;
    let how = '';
    if (dto.refund) {
      if (pay?.status === 'PAID' && pay.method !== 'COD' && amount >= c.order.total) { await this.orders.refund(c.orderId, `Complaint: ${c.type}`); how = `৳${amount} is being refunded to your original payment method.`; }
      else how = `৳${amount} will be sent to your bKash number within 3 working days.`;
    }
    const resolution = [dto.note, how].filter(Boolean).join(' ') || null;
    const chargedTo = dto.refund ? dto.chargedTo || 'MAACRAVE' : c.chargedTo;
    await this.prisma.complaint.update({ where: { id }, data: { status: dto.status, resolution, refundedAmount: amount || c.refundedAmount, chargedTo } });
    if (dto.refund && chargedTo === 'COOK') {
      const cook = await this.prisma.cookProfile.findUnique({ where: { id: c.order.cookId } });
      if (cook) await this.notify.notify(cook.userId, 'COOK', `৳${amount} refund on ${c.order.code}`, `A customer was refunded for “${c.type}”. It is deducted from your balance. Reply through Help & support if you disagree.`);
    }
    if (dto.refund && chargedTo === 'RIDER' && c.order.riderId) {
      await this.notify.notify(c.order.riderId, 'RIDER', `৳${amount} refund on ${c.order.code}`, `A customer was refunded for “${c.type}”. It is deducted from your earnings. Reply through Help & support if you disagree.`);
    }
    await this.notify.notify(c.userId, 'CUSTOMER', dto.status === 'RESOLVED' ? `Report on ${c.order.code} resolved` : `We're looking into ${c.order.code}`,
      resolution || 'Thanks for telling us. Our team will follow up.');
    await this.audit(admin, `COMPLAINT_${dto.status}${dto.refund ? '_REFUND' : ''}`, id, dto.note);
    return { ok: true };
  }

  /* ---------- people ---------- */
  users(q?: string) {
    const term = q?.trim();
    return this.prisma.user.findMany({
      where: term ? { OR: [{ name: { contains: term, mode: 'insensitive' } }, { email: { contains: term, mode: 'insensitive' } }, { phone: { contains: term } }] } : {},
      orderBy: { createdAt: 'desc' }, take: 60,
      select: { id: true, name: true, phone: true, email: true, area: true, suspended: true, deletedAt: true, createdAt: true, roles: { select: { role: true, status: true } }, _count: { select: { orders: true } } },
    });
  }

  async setSuspended(admin: string, id: string, suspended: boolean, note?: string) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u || u.deletedAt) throw new NotFoundException();
    await this.prisma.user.update({ where: { id }, data: { suspended } });
    if (suspended) {
      await this.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.prisma.cookProfile.updateMany({ where: { userId: id }, data: { accepting: false } });
      await this.prisma.riderProfile.updateMany({ where: { userId: id }, data: { online: false } });
    }
    await this.audit(admin, suspended ? 'USER_SUSPEND' : 'USER_RESTORE', id, note);
    return { ok: true };
  }

  /* ---------- orders & payouts ---------- */
  orderList(status?: string) {
    const valid = Object.values(OrderStatus) as string[];
    return this.prisma.order.findMany({
      where: status && valid.includes(status) ? { status: status as OrderStatus } : {},
      orderBy: { createdAt: 'desc' }, take: 80,
      select: { id: true, code: true, status: true, total: true, area: true, createdAt: true, batchId: true, customer: { select: { name: true, phone: true } }, cook: { select: { displayName: true } }, rider: { select: { name: true, phone: true } }, payment: { select: { method: true, status: true } } },
    });
  }

  async orderAction(admin: string, id: string, action: 'cancel' | 'release', reason: string) {
    if (action === 'cancel') await this.orders.adminCancel(id, reason); else await this.orders.releaseRider(id);
    await this.audit(admin, action === 'cancel' ? 'ORDER_CANCEL' : 'ORDER_RELEASE_RIDER', id, reason);
  }

  payouts(status?: string) {
    return this.prisma.payout.findMany({
      where: status === 'ALL' ? {} : { status: { in: ['REQUESTED', 'PROCESSING'] } },
      orderBy: { createdAt: 'desc' }, take: 100,
      include: { cook: { select: { displayName: true, payoutWallet: true, user: { select: { phone: true } } } } },
    });
  }

  async setPayout(admin: string, id: string, dto: PayoutDto) {
    const p = await this.prisma.payout.findUnique({ where: { id }, include: { cook: true } });
    if (!p) throw new NotFoundException();
    await this.prisma.payout.update({ where: { id }, data: { status: dto.status, providerRef: dto.reference ?? p.providerRef } });
    if (dto.status === 'PAID') await this.notify.notify(p.cook.userId, 'COOK', 'Payout sent', `৳${p.amount} was sent to ${p.method}.${dto.reference ? ` Ref ${dto.reference}` : ''}`);
    if (dto.status === 'FAILED') await this.notify.notify(p.cook.userId, 'COOK', 'Payout failed', 'Check your bKash number in Kitchen settings, then request again.');
    await this.audit(admin, `PAYOUT_${dto.status}`, id, dto.reference);
    return { ok: true };
  }

  activity() { return this.prisma.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }); }

  /* ---------- rates ---------- */
  async rates() { return rateCard(await this.business.settings()); }
  async setRates(admin: string, dto: RatesDto) {
    const { summary, ...data } = dto;
    const s = await this.prisma.platformSetting.update({ where: { id: 1 }, data: { ...data, ratesVersion: { increment: 1 }, ratesUpdatedAt: new Date() } });
    const told = await this.business.announceNewRates(summary);
    await this.audit(admin, 'RATES_UPDATE', String(s.ratesVersion), `${summary} · commission ${s.commissionPct}% · rider ${s.riderBase}+${s.riderPerKm}/km`);
    return { ...rateCard(s), told };
  }

  /* ---------- rider cash & payouts ---------- */
  async riderWallets() {
    const riders = await this.prisma.riderProfile.findMany({ where: { user: { roles: { some: { role: 'RIDER', status: { in: ['APPROVED', 'SUSPENDED'] } } } } }, include: { user: { select: { id: true, name: true, phone: true } } }, take: 200 });
    const rows = await Promise.all(riders.map(async (r) => ({ userId: r.userId, name: r.user.name, phone: r.user.phone, vehicle: r.vehicle, online: r.online, ...(await this.riders.wallet(r.userId)) })));
    return rows.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  }
  async riderLedger(admin: string, riderUserId: string, dto: LedgerDto) {
    const r = await this.prisma.riderProfile.findUnique({ where: { userId: riderUserId } });
    if (!r) throw new NotFoundException();
    const w = await this.riders.wallet(riderUserId);
    if (dto.kind === 'CASH_DEPOSIT' && dto.amount > w.cashInHand) throw new BadRequestException(`The rider is only holding ৳${w.cashInHand}.`);
    if (dto.kind === 'PAYOUT' && dto.amount > w.unpaidEarnings) throw new BadRequestException(`Only ৳${w.unpaidEarnings} of earnings is unpaid.`);
    await this.prisma.riderLedger.create({ data: { riderId: riderUserId, kind: dto.kind, amount: dto.amount, reference: dto.reference, adminEmail: admin } });
    await this.notify.notify(riderUserId, 'RIDER', dto.kind === 'PAYOUT' ? 'Earnings paid' : 'Cash deposit received', `৳${dto.amount}${dto.reference ? ` · Ref ${dto.reference}` : ''}. See Earnings for your balance.`);
    await this.audit(admin, `RIDER_${dto.kind}`, riderUserId, `৳${dto.amount} ${dto.reference || ''}`);
    return this.riders.wallet(riderUserId);
  }

  /* ---------- support inbox ---------- */
  tickets(status?: string) {
    return this.prisma.supportTicket.findMany({
      where: status === 'ALL' ? {} : status === 'CLOSED' ? { status: 'CLOSED' } : { status: { not: 'CLOSED' } },
      orderBy: { updatedAt: 'desc' }, take: 100,
      include: { user: { select: { name: true, phone: true, email: true } }, messages: { orderBy: { createdAt: 'asc' } } },
    });
  }
  async replyTicket(admin: string, id: string, dto: TicketReplyDto) {
    const t = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!t) throw new NotFoundException();
    await this.prisma.supportTicket.update({ where: { id }, data: { status: dto.close ? 'CLOSED' : 'ANSWERED', messages: { create: { body: dto.body.trim(), fromAdmin: true, adminEmail: admin } } } });
    await this.notify.notify(t.userId, t.role, 'MaaCrave support replied', `${t.subject}: ${dto.body.slice(0, 90)}`);
    await this.audit(admin, dto.close ? 'TICKET_CLOSE' : 'TICKET_REPLY', id);
    return { ok: true };
  }

  /* ---------- kitchen safety: inspections, pauses ---------- */
  async kitchens() {
    const since = new Date(Date.now() - 30 * 86400_000);
    const cooks = await this.prisma.cookProfile.findMany({ where: { user: { roles: { some: { role: 'COOK', status: 'APPROVED' } } } }, orderBy: { displayName: 'asc' }, take: 300,
      select: { id: true, displayName: true, area: true, rating: true, ratingCount: true, completedOrders: true, hygieneChecks: true, inspectedAt: true, pausedUntil: true, pauseReason: true, awayUntil: true, accepting: true, foodLicence: true } });
    const reports = await this.prisma.complaint.groupBy({ by: ['orderId'], where: { createdAt: { gte: since }, type: { in: ['Food quality', 'Hygiene concern', 'Wrong allergen info'] } }, _count: true });
    const orders = reports.length ? await this.prisma.order.findMany({ where: { id: { in: reports.map((r) => r.orderId) } }, select: { id: true, cookId: true } }) : [];
    const per: Record<string, number> = {};
    for (const o of orders) per[o.cookId] = (per[o.cookId] || 0) + 1;
    return cooks.map((c) => ({ ...c, safetyReports30d: per[c.id] || 0, paused: !!(c.pausedUntil && c.pausedUntil > new Date()) })).sort((a, b) => b.safetyReports30d - a.safetyReports30d || Number(b.paused) - Number(a.paused));
  }
  async pauseKitchen(admin: string, id: string, dto: PauseDto) {
    const c = await this.prisma.cookProfile.update({ where: { id }, data: { accepting: false, pausedUntil: new Date(Date.now() + dto.days * 86400_000), pauseReason: dto.reason } });
    await this.audit(admin, 'KITCHEN_PAUSE', id, `${dto.days}d · ${dto.reason}`);
    await this.notify.notify(c.userId, 'COOK', 'Your kitchen is paused', `${dto.reason} The MaaCrave team will contact you.`);
    return { ok: true };
  }
  async resumeKitchen(admin: string, id: string) {
    const c = await this.prisma.cookProfile.update({ where: { id }, data: { pausedUntil: null, pauseReason: null } });
    await this.audit(admin, 'KITCHEN_RESUME', id);
    await this.notify.notify(c.userId, 'COOK', 'Your kitchen can reopen', 'Thank you. Turn on “Taking orders” when you are ready.');
    return { ok: true };
  }
  async inspected(admin: string, id: string, note?: string) {
    await this.prisma.cookProfile.update({ where: { id }, data: { inspectedAt: new Date() } });
    await this.audit(admin, 'KITCHEN_INSPECTED', id, note);
    return { ok: true };
  }

  /* ---------- Festivals, mother of the week, photos ---------- */
  festivals() { return this.prisma.festival.findMany({ orderBy: { closesAt: 'desc' }, take: 50 }); }
  async saveFestival(admin: string, id: string | null, dto: FestivalDto) {
    const opensAt = new Date(dto.opensAt), closesAt = new Date(dto.closesAt), deliverOn = new Date(dto.deliverOn);
    if ([opensAt, closesAt, deliverOn].some((d) => isNaN(d.getTime()))) throw new BadRequestException('Check the dates.');
    if (!(opensAt < closesAt && closesAt <= deliverOn)) throw new BadRequestException('Orders must open before they close, and close before the delivery day.');
    const data = { ...dto, blurb: dto.blurb || '', blurbBn: dto.blurbBn || '', opensAt, closesAt, deliverOn };
    const f = id ? await this.prisma.festival.update({ where: { id }, data }) : await this.prisma.festival.create({ data });
    await this.audit(admin, id ? 'FESTIVAL_EDIT' : 'FESTIVAL_CREATE', f.id, dto.title);
    if (!id && f.active) {
      // Tell every approved cook so they can add festival dishes.
      const cooks = await this.prisma.userRole.findMany({ where: { role: 'COOK', status: 'APPROVED' }, select: { userId: true } });
      await Promise.all(cooks.map((c) => this.notify.notify(c.userId, 'COOK', `${dto.title} pre-orders`, `Add your ${dto.title} special to the festival menu: Kitchen → Menu → add dish → Festival.`)));
    }
    return f;
  }
  async featured() {
    const s = await this.prisma.settings();
    const cooks = await this.prisma.cookProfile.findMany({ where: { user: { suspended: false, deletedAt: null, roles: { some: { role: 'COOK', status: 'APPROVED' } } } }, orderBy: [{ rating: 'desc' }, { completedOrders: 'desc' }], take: 100,
      select: { id: true, displayName: true, area: true, rating: true, ratingCount: true, completedOrders: true, story: true, portraitId: true, region: true } });
    return { featuredCookId: s.featuredCookId, cooks };
  }
  async setFeatured(admin: string, cookId: string | null | undefined) {
    if (cookId && !(await this.prisma.cookProfile.findUnique({ where: { id: cookId } }))) throw new NotFoundException();
    await this.prisma.platformSetting.update({ where: { id: 1 }, data: { featuredCookId: cookId || null } });
    await this.audit(admin, 'FEATURED_COOK', cookId || undefined);
    if (cookId) {
      const c = await this.prisma.cookProfile.findUniqueOrThrow({ where: { id: cookId } });
      await this.notify.notify(c.userId, 'COOK', 'You’re this week’s mother! 🌼', 'Your kitchen is featured on the MaaCrave home page this week. Thank you for cooking with love.');
    }
    return this.featured();
  }
  async photos(kind?: string) {
    const rows = await this.prisma.mediaImage.findMany({ where: { removed: false, ...(kind ? { kind } : {}) }, orderBy: { createdAt: 'desc' }, take: 120, select: { id: true, ownerId: true, kind: true, createdAt: true } });
    const owners = await this.prisma.cookProfile.findMany({ where: { userId: { in: [...new Set(rows.map((r) => r.ownerId))] } }, select: { userId: true, displayName: true } });
    return rows.map((r) => ({ ...r, cook: owners.find((o) => o.userId === r.ownerId)?.displayName || '—' }));
  }
  async removePhoto(admin: string, id: string, note?: string) {
    const m = await this.prisma.mediaImage.findUnique({ where: { id } });
    if (!m) throw new NotFoundException();
    await this.prisma.$transaction([
      this.prisma.mediaImage.update({ where: { id }, data: { removed: true, data: '' } }),
      this.prisma.dish.updateMany({ where: { photoId: id }, data: { photoId: null } }),
      this.prisma.cookProfile.updateMany({ where: { portraitId: id }, data: { portraitId: null } }),
      this.prisma.cookProfile.updateMany({ where: { kitchenPhotoId: id }, data: { kitchenPhotoId: null } }),
    ]);
    await this.audit(admin, 'PHOTO_REMOVE', id, note);
    await this.notify.notify(m.ownerId, 'COOK', 'A photo was removed', `One of your photos was taken down by the MaaCrave team${note ? `: ${note}` : '.'} Please upload a clear, real photo of your own food or kitchen.`);
    return { ok: true };
  }

  /* ---------- Home spotlight cards ---------- */
  async spotlights() {
    const rows = await this.prisma.spotlight.findMany({ orderBy: { slot: 'asc' } });
    return rows.map(({ imageData, ...r }) => ({ ...r, hasImage: !!imageData }));
  }
  async saveSpotlight(admin: string, slot: number, dto: SpotlightDto) {
    if (![1, 2, 3, 4, 5].includes(slot)) throw new BadRequestException('Slot must be 1–5.');
    const { image, removeImage, ...fields } = dto;
    const pic = image ? /^data:(image\/[a-z]+);base64,(.+)$/.exec(image) : null;
    const imageFields = pic ? { imageMime: pic[1], imageData: pic[2] } : removeImage ? { imageMime: null, imageData: null } : {};
    const { imageData: _d, ...row } = await this.prisma.spotlight.upsert({ where: { slot }, update: { ...fields, ...imageFields }, create: { slot, ...fields, ...imageFields } });
    await this.audit(admin, 'SPOTLIGHT_SAVE', String(slot), `${dto.title} · ${dto.animation}`);
    return row;
  }
}

@Public()
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private admin: AdminService) {}
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) @Post('request') @HttpCode(200) request(@Body() dto: AdminOtpDto) { return this.admin.requestCode(dto.email); }
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) @Post('verify') @HttpCode(200) verify(@Body() dto: AdminVerifyDto) { return this.admin.verifyCode(dto.email, dto.code); }
}

@Public() // skips the customer guard; AdminGuard below does the checking
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private admin: AdminService) {}
  @Get('me') me(@CurrentAdmin() email: string) { return { email, role: roleOf(email) }; }
  @Get('stats') async stats(@CurrentAdmin() a: string) { const s = await this.admin.stats(); return roleOf(a) === 'support' ? { ...s, margin: undefined } : s; }
  @Get('applications') applications(@Query('status') status = 'PENDING', @Query('role') role?: string) { return this.admin.applications(status, role); }
  @Get('documents/:id') document(@Param('id') id: string) { return this.admin.document(id); }
  @Post('applications/:id/approve') @HttpCode(200) approve(@CurrentAdmin() a: string, @Param('id') id: string, @Body() dto: DecisionDto) { return this.admin.decide(a, id, 'APPROVED', dto.note); }
  @Post('applications/:id/reject') @HttpCode(200) reject(@CurrentAdmin() a: string, @Param('id') id: string, @Body() dto: DecisionDto) { return this.admin.decide(a, id, 'REJECTED', dto.note); }
  @Post('applications/:id/suspend') @HttpCode(200) suspendRole(@CurrentAdmin() a: string, @Param('id') id: string, @Body() dto: DecisionDto) { return this.admin.decide(a, id, 'SUSPENDED', dto.note); }
  @Get('complaints') complaints(@Query('status') status?: string) { return this.admin.complaints(status); }
  @Post('complaints/:id') @HttpCode(200) complaint(@CurrentAdmin() a: string, @Param('id') id: string, @Body() dto: ComplaintDto) { return this.admin.handleComplaint(a, id, dto); }
  @Get('users') users(@Query('q') q?: string) { return this.admin.users(q); }
  @Post('users/:id/suspend') @HttpCode(200) suspend(@CurrentAdmin() a: string, @Param('id') id: string, @Body() dto: DecisionDto) { return this.admin.setSuspended(a, id, true, dto.note); }
  @Post('users/:id/restore') @HttpCode(200) restore(@CurrentAdmin() a: string, @Param('id') id: string) { return this.admin.setSuspended(a, id, false); }
  @Get('orders') orderList(@Query('status') status?: string) { return this.admin.orderList(status); }
  @Post('orders/:id/cancel') @HttpCode(200) async cancelOrder(@CurrentAdmin() a: string, @Param('id') id: string, @Body() dto: OrderActionDto) { await this.admin.orderAction(a, id, 'cancel', dto.reason); return { ok: true }; }
  @Post('orders/:id/release-rider') @HttpCode(200) async releaseRider(@CurrentAdmin() a: string, @Param('id') id: string, @Body() dto: OrderActionDto) { await this.admin.orderAction(a, id, 'release', dto.reason); return { ok: true }; }
  @Get('payouts') payouts(@Query('status') status?: string) { return this.admin.payouts(status); }
  @Post('payouts/:id') @HttpCode(200) payout(@CurrentAdmin() a: string, @Param('id') id: string, @Body() dto: PayoutDto) { return this.admin.setPayout(a, id, dto); }
  @Get('activity') activity() { return this.admin.activity(); }
  @Get('rates') rates() { return this.admin.rates(); }
  @Post('rates') @HttpCode(200) setRates(@CurrentAdmin() a: string, @Body() dto: RatesDto) { return this.admin.setRates(a, dto); }
  @Get('riders/wallets') riderWallets() { return this.admin.riderWallets(); }
  @Post('riders/:id/ledger') @HttpCode(200) riderLedger(@CurrentAdmin() a: string, @Param('id') id: string, @Body() dto: LedgerDto) { return this.admin.riderLedger(a, id, dto); }
  @Get('tickets') tickets(@Query('status') status?: string) { return this.admin.tickets(status); }
  @Post('tickets/:id/reply') @HttpCode(200) replyTicket(@CurrentAdmin() a: string, @Param('id') id: string, @Body() dto: TicketReplyDto) { return this.admin.replyTicket(a, id, dto); }
  @Get('kitchens') kitchens() { return this.admin.kitchens(); }
  @Post('kitchens/:id/pause') @HttpCode(200) pauseKitchen(@CurrentAdmin() a: string, @Param('id') id: string, @Body() dto: PauseDto) { return this.admin.pauseKitchen(a, id, dto); }
  @Post('kitchens/:id/resume') @HttpCode(200) resumeKitchen(@CurrentAdmin() a: string, @Param('id') id: string) { return this.admin.resumeKitchen(a, id); }
  @Post('kitchens/:id/inspected') @HttpCode(200) inspected(@CurrentAdmin() a: string, @Param('id') id: string, @Body() dto: DecisionDto) { return this.admin.inspected(a, id, dto.note); }
  @Get('festivals') festivals() { return this.admin.festivals(); }
  @Post('festivals') @HttpCode(200) createFestival(@CurrentAdmin() a: string, @Body() dto: FestivalDto) { return this.admin.saveFestival(a, null, dto); }
  @Post('festivals/:id') @HttpCode(200) editFestival(@CurrentAdmin() a: string, @Param('id') id: string, @Body() dto: FestivalDto) { return this.admin.saveFestival(a, id, dto); }
  @Get('featured') featured() { return this.admin.featured(); }
  @Post('featured') @HttpCode(200) setFeatured(@CurrentAdmin() a: string, @Body() dto: FeaturedDto) { return this.admin.setFeatured(a, dto.cookId); }
  @Get('photos') photos(@Query('kind') kind?: string) { return this.admin.photos(kind); }
  @Post('photos/:id/remove') @HttpCode(200) removePhoto(@CurrentAdmin() a: string, @Param('id') id: string, @Body() dto: DecisionDto) { return this.admin.removePhoto(a, id, dto.note); }
  @Get('spotlights') spotlights() { return this.admin.spotlights(); }
  @Post('spotlights/:slot') @HttpCode(200) saveSpotlight(@CurrentAdmin() a: string, @Param('slot') slot: string, @Body() dto: SpotlightDto) { return this.admin.saveSpotlight(a, Number(slot), dto); }
}

@Module({ imports: [OrdersModule, RiderModule], providers: [AdminService, AdminGuard, EmailService], controllers: [AdminAuthController, AdminController] })
export class AdminModule {}
