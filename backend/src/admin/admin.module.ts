import {
  BadRequestException, Body, CanActivate, Controller, ExecutionContext, Get, HttpCode, Injectable, Logger, Module, NotFoundException, Param, Post, Query,
  UnauthorizedException, UseGuards, createParamDecorator,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { ComplaintStatus, OrderStatus, RoleStatus } from '@prisma/client';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
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
      if (p.typ !== 'admin' || !adminEmails().includes(p.sub)) throw new Error('not admin');
      req.adminEmail = p.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Admin session expired. Sign in again.');
    }
  }
}

class AdminOtpDto { @IsEmail() email: string; }
class AdminVerifyDto extends AdminOtpDto { @IsString() @Length(6, 6) code: string; }
class DecisionDto { @IsOptional() @IsString() @MaxLength(300) note?: string; }
class ComplaintDto {
  @IsIn(['INVESTIGATING', 'RESOLVED']) status: ComplaintStatus;
  @IsOptional() @IsBoolean() refund?: boolean;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}
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
  @Matches(/^(browse|request|groups|category:[a-z]+|maxPrice:\d{2,4})$/) action: string;
  @IsBoolean() active: boolean;
}
class PayoutDto { @IsIn(['PROCESSING', 'PAID', 'FAILED']) status: 'PROCESSING' | 'PAID' | 'FAILED'; @IsOptional() @IsString() @MaxLength(60) reference?: string; }

@Injectable()
export class AdminService {
  private log = new Logger('Admin');
  constructor(private prisma: PrismaService, private jwt: JwtService, private email: EmailService, private notify: NotificationsService, private orders: OrdersService) {}

  private audit(adminEmail: string, action: string, targetId?: string, detail?: string) {
    return this.prisma.adminLog.create({ data: { adminEmail, action, targetId, detail: detail?.slice(0, 500) } });
  }

  /* ---------- sign-in ---------- */
  async requestCode(raw: string) {
    const email = raw.trim().toLowerCase();
    // Same answer whether or not the email is an admin, so the list can't be probed.
    if (!adminEmails().length) this.log.error('ADMIN_EMAILS is empty — nobody can sign in to the admin panel.');
    if (!adminEmails().includes(email)) { this.log.warn(`Admin code requested for an email that is not in ADMIN_EMAILS (${email.replace(/(.{2}).*@/, '$1***@')})`); return { sent: true }; }
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
    if (!adminEmails().includes(email) || !otp || otp.expiresAt < new Date() || otp.attempts >= 5) throw new UnauthorizedException('Code expired or invalid. Request a new one.');
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
    return { users, cooks, riders, pendingApps, openComplaints, ordersToday, activeOrders, salesToday: salesToday._sum.total || 0, commissionToday: salesToday._sum.commission || 0, pendingPayouts };
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
        order: { select: { id: true, code: true, total: true, subtotal: true, status: true, cook: { select: { displayName: true, userId: true } }, payment: { select: { method: true, status: true } } } },
      },
    });
  }

  async handleComplaint(admin: string, id: string, dto: ComplaintDto) {
    const c = await this.prisma.complaint.findUnique({ where: { id }, include: { order: true } });
    if (!c) throw new NotFoundException();
    await this.prisma.complaint.update({ where: { id }, data: { status: dto.status } });
    if (dto.refund) await this.orders.refund(c.orderId, `Complaint: ${c.type}`);
    await this.notify.notify(c.userId, 'CUSTOMER', dto.status === 'RESOLVED' ? `Report on ${c.order.code} resolved` : `We're looking into ${c.order.code}`,
      dto.note || (dto.refund ? 'A refund has been started to your original payment method.' : 'Thanks for telling us. Our team will follow up.'));
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
      select: { id: true, code: true, status: true, total: true, area: true, createdAt: true, batchId: true, customer: { select: { name: true } }, cook: { select: { displayName: true } }, rider: { select: { name: true } }, payment: { select: { method: true, status: true } } },
    });
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

  /* ---------- Home spotlight cards ---------- */
  spotlights() { return this.prisma.spotlight.findMany({ orderBy: { slot: 'asc' } }); }
  async saveSpotlight(admin: string, slot: number, dto: SpotlightDto) {
    if (![1, 2, 3, 4].includes(slot)) throw new BadRequestException('Slot must be 1–4.');
    const row = await this.prisma.spotlight.upsert({ where: { slot }, update: dto, create: { slot, ...dto } });
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
  @Get('me') me(@CurrentAdmin() email: string) { return { email }; }
  @Get('stats') stats() { return this.admin.stats(); }
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
  @Get('payouts') payouts(@Query('status') status?: string) { return this.admin.payouts(status); }
  @Post('payouts/:id') @HttpCode(200) payout(@CurrentAdmin() a: string, @Param('id') id: string, @Body() dto: PayoutDto) { return this.admin.setPayout(a, id, dto); }
  @Get('activity') activity() { return this.admin.activity(); }
  @Get('spotlights') spotlights() { return this.admin.spotlights(); }
  @Post('spotlights/:slot') @HttpCode(200) saveSpotlight(@CurrentAdmin() a: string, @Param('slot') slot: string, @Body() dto: SpotlightDto) { return this.admin.saveSpotlight(a, Number(slot), dto); }
}

@Module({ imports: [OrdersModule], providers: [AdminService, AdminGuard, EmailService], controllers: [AdminAuthController, AdminController] })
export class AdminModule {}
