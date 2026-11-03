import { BadRequestException, Body, Controller, ForbiddenException, Get, Global, HttpCode, Injectable, Logger, Module, NotFoundException, OnApplicationBootstrap, Param, Post, Query } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AuthUser, CurrentUser, hasRole } from '../common/auth';
import { rateCard } from '../common/pricing';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.module';

class RoleDto { @IsIn(['COOK', 'RIDER']) role: 'COOK' | 'RIDER'; }
class TicketDto {
  @IsIn(['CUSTOMER', 'COOK', 'RIDER']) role: Role;
  @IsString() @MinLength(3) @MaxLength(80) subject: string;
  @IsString() @MinLength(5) @MaxLength(1500) body: string;
  @IsOptional() @IsString() orderId?: string;
}
class MessageDto { @IsString() @MinLength(1) @MaxLength(1500) body: string; }

const supportContact = () => ({ phone: process.env.SUPPORT_PHONE || null, email: process.env.SUPPORT_EMAIL || 'support@maacrave.app', hours: '9 AM – 11 PM, every day' });

/**
 * Partner rates and terms, support tickets, and one-time data upgrades.
 * Cooks and riders must accept the current rate card before they can go online.
 */
@Injectable()
export class BusinessService implements OnApplicationBootstrap {
  private log = new Logger('Business');
  constructor(private prisma: PrismaService, private notify: NotificationsService) {}

  async onApplicationBootstrap() {
    try {
      const s = await this.prisma.platformSetting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
      // Upgrade 1 (Nov 2026): 12% commission, group delivery covers the rider's drop pay.
      if (s.upgrades < 1) {
        await this.prisma.platformSetting.update({ where: { id: 1 }, data: { commissionPct: 12, batchDeliveryFee: 30, upgrades: 1, ratesUpdatedAt: new Date() } });
        this.log.log('Applied rate upgrade 1 (12% commission, distance-based delivery).');
      }
    } catch (e) { this.log.error(`Settings upgrade failed: ${(e as Error).message}`); }
  }

  settings() { return this.prisma.platformSetting.findUniqueOrThrow({ where: { id: 1 } }); }

  async accepted(userId: string, role: 'COOK' | 'RIDER') {
    const s = await this.settings();
    const a = await this.prisma.partnerAgreement.findUnique({ where: { userId_role_version: { userId, role, version: s.ratesVersion } } });
    return { settings: s, agreement: a };
  }

  /** Throws unless the partner accepted the current rates. Used before going online. */
  async requireAccepted(userId: string, role: 'COOK' | 'RIDER') {
    const { agreement } = await this.accepted(userId, role);
    if (!agreement) throw new BadRequestException(role === 'COOK' ? 'Please read and accept the partner terms and rates first (Kitchen → Rates & terms).' : 'Please read and accept the rider terms and rates first (Account → Rates & terms).');
  }

  async terms(user: AuthUser, role: 'COOK' | 'RIDER') {
    const { settings, agreement } = await this.accepted(user.id, role);
    const last = agreement || await this.prisma.partnerAgreement.findFirst({ where: { userId: user.id, role }, orderBy: { version: 'desc' } });
    return { rates: rateCard(settings), accepted: !!agreement, acceptedAt: agreement?.acceptedAt ?? null, lastAcceptedVersion: last?.version ?? null, support: supportContact() };
  }

  async accept(user: AuthUser, role: 'COOK' | 'RIDER') {
    if (!hasRole(user, role)) throw new ForbiddenException('Your application isn’t approved yet.');
    const s = await this.settings();
    await this.prisma.partnerAgreement.upsert({
      where: { userId_role_version: { userId: user.id, role, version: s.ratesVersion } },
      update: {},
      create: { userId: user.id, role, version: s.ratesVersion, commissionPct: s.commissionPct, rates: rateCard(s) as unknown as Prisma.InputJsonValue },
    });
    return this.terms(user, role);
  }

  /** Called by the admin panel after rates change: everyone must accept again, and is told why. */
  async announceNewRates(summary: string) {
    const partners = await this.prisma.userRole.findMany({ where: { role: { in: ['COOK', 'RIDER'] }, status: 'APPROVED' }, select: { userId: true, role: true } });
    await Promise.all(partners.map((p) => this.notify.notify(p.userId, p.role, 'MaaCrave rates updated', `${summary} Please review and accept the new rates in the app to keep receiving orders.`)));
    return partners.length;
  }

  /* ---------- support ---------- */
  tickets(user: AuthUser) {
    return this.prisma.supportTicket.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' }, take: 50, include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } } });
  }
  async ticket(user: AuthUser, id: string) {
    const t = await this.prisma.supportTicket.findFirst({ where: { id, userId: user.id }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
    if (!t) throw new NotFoundException();
    return { ...t, support: supportContact() };
  }
  async open(user: AuthUser, dto: TicketDto) {
    if (dto.role !== 'CUSTOMER' && !hasRole(user, dto.role)) throw new ForbiddenException();
    if (dto.orderId) {
      const o = await this.prisma.order.findFirst({ where: { id: dto.orderId, OR: [{ customerId: user.id }, { riderId: user.id }, ...(user.cook ? [{ cookId: user.cook.id }] : [])] }, select: { id: true } });
      if (!o) throw new BadRequestException('That order isn’t yours.');
    }
    const openCount = await this.prisma.supportTicket.count({ where: { userId: user.id, status: { not: 'CLOSED' } } });
    if (openCount >= 5) throw new BadRequestException('You already have 5 open requests. We’ll reply soon.');
    const t = await this.prisma.supportTicket.create({ data: { userId: user.id, role: dto.role, orderId: dto.orderId, subject: dto.subject.trim(), messages: { create: { body: dto.body.trim() } } } });
    return this.ticket(user, t.id);
  }
  async reply(user: AuthUser, id: string, body: string) {
    const t = await this.prisma.supportTicket.findFirst({ where: { id, userId: user.id } });
    if (!t) throw new NotFoundException();
    await this.prisma.supportTicket.update({ where: { id }, data: { status: 'OPEN', messages: { create: { body: body.trim() } } } });
    return this.ticket(user, id);
  }
  async close(user: AuthUser, id: string) {
    const r = await this.prisma.supportTicket.updateMany({ where: { id, userId: user.id }, data: { status: 'CLOSED' } });
    if (!r.count) throw new NotFoundException();
    return this.ticket(user, id);
  }
}

@Controller('partner')
export class PartnerController {
  constructor(private b: BusinessService) {}
  @Get('terms') terms(@CurrentUser() u: AuthUser, @Query('role') role: string) { return this.b.terms(u, role === 'RIDER' ? 'RIDER' : 'COOK'); }
  @Post('terms/accept') @HttpCode(200) accept(@CurrentUser() u: AuthUser, @Body() dto: RoleDto) { return this.b.accept(u, dto.role); }
}

@Controller('support')
export class SupportController {
  constructor(private b: BusinessService) {}
  @Get() list(@CurrentUser() u: AuthUser) { return this.b.tickets(u); }
  @Get('contact') contact() { return supportContact(); }
  @Post() open(@CurrentUser() u: AuthUser, @Body() dto: TicketDto) { return this.b.open(u, dto); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.b.ticket(u, id); }
  @Post(':id/messages') @HttpCode(200) reply(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: MessageDto) { return this.b.reply(u, id, dto.body); }
  @Post(':id/close') @HttpCode(200) close(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.b.close(u, id); }
}

@Global()
@Module({ providers: [BusinessService], controllers: [PartnerController, SupportController], exports: [BusinessService] })
export class BusinessModule {}
