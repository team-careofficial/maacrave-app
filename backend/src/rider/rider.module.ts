import { BadRequestException, Body, Controller, Get, HttpCode, Injectable, Module, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, Matches, Max, Min } from 'class-validator';
import { BusinessService } from '../business/business.module';
import { pointOf, roadKm } from '../common/geo';
import { AuthUser, CurrentUser, Roles } from '../common/auth';
import { PrismaService } from '../common/prisma.service';
import { OrdersModule } from '../orders/orders.module';
import { OrdersService } from '../orders/orders.service';

class StatusDto { @IsBoolean() online: boolean; }
class DeliverDto { @Matches(/^\d{4}$/) code: string; }
// Bangladesh bounds
class LocationDto { @Type(() => Number) @IsNumber() @Min(20.5) @Max(26.7) lat: number; @Type(() => Number) @IsNumber() @Min(88) @Max(92.7) lng: number; }
/** For this long after an order is ready only the 3 nearest riders see it; then everyone online does. */
const NEAREST_FIRST_MS = 90_000;

const groupKey = (o: { batchId: string | null; id: string }) => o.batchId || o.id;

@Injectable()
export class RiderService {
  constructor(private prisma: PrismaService, private orders: OrdersService, private business: BusinessService) {}

  async setStatus(user: AuthUser, online: boolean) {
    if (!user.rider) throw new BadRequestException('No rider profile.');
    if (online) await this.business.requireAccepted(user.id, 'RIDER');
    return this.prisma.riderProfile.update({ where: { id: user.rider.id }, data: { online } });
  }

  /** The rider app sends this every ~20 s while online. Used for nearest-first offers and the customer's live map. */
  async location(user: AuthUser, lat: number, lng: number) {
    if (!user.rider) throw new BadRequestException('No rider profile.');
    await this.prisma.riderProfile.update({ where: { id: user.rider.id }, data: { lat, lng, locatedAt: new Date() } });
    return { ok: true };
  }

  /** Customer cash the rider is holding, what they've earned, and what's settled. */
  async wallet(riderUserId: string) {
    const [cod, earned, ledger, s, charged] = await Promise.all([
      this.prisma.order.aggregate({ where: { riderId: riderUserId, status: 'DELIVERED', payment: { method: 'COD' } }, _sum: { total: true } }),
      this.prisma.order.aggregate({ where: { riderId: riderUserId, status: 'DELIVERED' }, _sum: { riderPayout: true, tip: true } }),
      this.prisma.riderLedger.groupBy({ by: ['kind'], where: { riderId: riderUserId }, _sum: { amount: true } }),
      this.prisma.platformSetting.findUniqueOrThrow({ where: { id: 1 } }),
      this.prisma.complaint.aggregate({ where: { chargedTo: 'RIDER', order: { riderId: riderUserId } }, _sum: { refundedAmount: true } }),
    ]);
    const sum = (k: string) => ledger.find((l) => l.kind === k)?._sum.amount || 0;
    const cashCollected = cod._sum.total || 0, deposited = sum('CASH_DEPOSIT');
    const deductions = charged._sum.refundedAmount || 0;
    const earnedTotal = (earned._sum.riderPayout || 0) + (earned._sum.tip || 0) - deductions, paidOut = sum('PAYOUT');
    const cashInHand = cashCollected - deposited;
    const unpaidEarnings = earnedTotal - paidOut;
    // Positive: rider owes MaaCrave. Negative: MaaCrave owes the rider.
    const balance = cashInHand - unpaidEarnings;
    return { cashCollected, deposited, cashInHand, earnedTotal, deductions, paidOut, unpaidEarnings, balance, cashLimit: s.riderCashLimit, overLimit: cashInHand > s.riderCashLimit };
  }

  async tasks(user: AuthUser) {
    if (!user.rider?.online) return [];
    const ready = await this.prisma.order.findMany({ where: { status: 'READY', riderId: null }, include: { items: true, payment: { select: { method: true } }, cook: { select: { displayName: true, area: true, lat: true, lng: true } } }, orderBy: { updatedAt: 'asc' }, take: 100 });
    const me = user.rider.lat != null && user.rider.lng != null ? { lat: user.rider.lat, lng: user.rider.lng } : null;
    // Nearest-first: while an order is fresh, hide it from riders who aren't among the 3 closest.
    const online = await this.prisma.riderProfile.findMany({ where: { online: true, locatedAt: { gt: new Date(Date.now() - 15 * 60_000) } }, select: { userId: true, lat: true, lng: true } });
    const isNear = (cook: { lat: number | null; lng: number | null; area: string }) => {
      const k = pointOf(cook);
      const ranked = online.filter((r) => r.lat != null && r.lng != null).map((r) => ({ id: r.userId, km: roadKm({ lat: r.lat!, lng: r.lng! }, k) })).sort((a, b) => a.km - b.km);
      return !ranked.length || ranked.slice(0, 3).some((r) => r.id === user.id);
    };
    const visible = ready.filter((o) => Date.now() - o.updatedAt.getTime() > NEAREST_FIRST_MS || isNear(o.cook));
    const groups = new Map<string, typeof ready>();
    for (const o of visible) groups.set(groupKey(o), [...(groups.get(groupKey(o)) || []), o]);
    return [...groups.entries()].map(([key, os]) => ({
      key, isBatch: !!os[0].batchId, cook: { displayName: os[0].cook.displayName, area: os[0].cook.area }, drops: os.length,
      packages: os.reduce((a, o) => a + o.items.reduce((s, i) => s + i.quantity, 0), 0),
      dropAreas: [...new Set(os.map((o) => o.area))], earning: os.reduce((a, o) => a + o.riderPayout + o.tip, 0), tips: os.reduce((a, o) => a + o.tip, 0),
      cashToCollect: os.filter((o) => o.payment?.method === 'COD').reduce((a, o) => a + o.total, 0),
      tripKm: Math.round(os.reduce((a, o) => a + (o.distanceKm || 0), 0) * 10) / 10,
      kmToKitchen: me ? roadKm(me, pointOf(os[0].cook)) : null,
    })).sort((a, b) => (a.kmToKitchen ?? 99) - (b.kmToKitchen ?? 99));
  }

  async accept(user: AuthUser, key: string) {
    const w = await this.wallet(user.id);
    if (w.overLimit) {
      const cod = await this.prisma.order.count({ where: { status: 'READY', riderId: null, OR: [{ batchId: key }, { id: key }], payment: { method: 'COD' } } });
      if (cod) throw new BadRequestException(`You're holding ৳${w.cashInHand} in customer cash (limit ৳${w.cashLimit}). Deposit it with MaaCrave before taking cash orders.`);
    }
    const ids = await this.prisma.$transaction(async (tx) => {
      const os = await tx.order.findMany({ where: { status: 'READY', riderId: null, OR: [{ batchId: key }, { id: key }] } });
      if (!os.length) throw new BadRequestException('Another rider took this task.');
      const r = await tx.order.updateMany({ where: { id: { in: os.map((o) => o.id) }, riderId: null }, data: { riderId: user.id } });
      if (r.count !== os.length) throw new BadRequestException('Another rider took this task.');
      return os.map((o) => o.id);
    });
    for (const id of ids) await this.orders.transition(id, 'RIDER_ASSIGNED', user.id);
    return this.active(user);
  }

  async active(user: AuthUser) {
    const os = await this.prisma.order.findMany({
      where: { riderId: user.id, status: { in: ['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'] } },
      include: { items: true, payment: { select: { method: true } }, customer: { select: { name: true, phone: true } }, cook: { select: { displayName: true, area: true, user: { select: { phone: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    // Customer address and phone unlock only after pickup.
    return os.map(({ deliveryOtp: _otp, ...o }) => ({
      ...o,
      addressText: o.status === 'RIDER_ASSIGNED' ? null : o.addressText,
      customer: { name: (o.customer.name || 'Customer').split(' ')[0], phone: o.status === 'RIDER_ASSIGNED' ? null : o.customer.phone },
      cashToCollect: o.payment?.method === 'COD' ? o.total : 0,
      groupKey: groupKey(o),
    }));
  }

  private async moveGroup(user: AuthUser, key: string, from: 'RIDER_ASSIGNED' | 'PICKED_UP', to: 'PICKED_UP' | 'ON_THE_WAY') {
    const os = await this.prisma.order.findMany({ where: { riderId: user.id, status: from, OR: [{ batchId: key }, { id: key }] } });
    if (!os.length) throw new NotFoundException();
    for (const o of os) await this.orders.transition(o.id, to, user.id);
    return this.active(user);
  }
  pickup(user: AuthUser, key: string) { return this.moveGroup(user, key, 'RIDER_ASSIGNED', 'PICKED_UP'); }
  start(user: AuthUser, key: string) { return this.moveGroup(user, key, 'PICKED_UP', 'ON_THE_WAY'); }

  async deliver(user: AuthUser, id: string, code: string) {
    const o = await this.prisma.order.findFirst({ where: { id, riderId: user.id, status: 'ON_THE_WAY' } });
    if (!o) throw new NotFoundException();
    if (o.deliveryOtp !== code) throw new BadRequestException('That code doesn’t match. Ask the customer again.');
    await this.orders.transition(o.id, 'DELIVERED', user.id);
    await this.orders.onDelivered(o.id);
    return this.active(user);
  }

  async earnings(user: AuthUser) {
    const done = await this.prisma.order.findMany({ where: { riderId: user.id, status: 'DELIVERED' }, select: { id: true, code: true, area: true, riderPayout: true, tip: true, distanceKm: true, batchId: true, total: true, payment: { select: { method: true } }, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 200 });
    const [wallet, ledger] = await Promise.all([this.wallet(user.id), this.prisma.riderLedger.findMany({ where: { riderId: user.id }, orderBy: { createdAt: 'desc' }, take: 20 })]);
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d; });
    const last7Days = days.map((d) => ({ date: d.toISOString().slice(0, 10), amount: done.filter((o) => o.updatedAt >= d && o.updatedAt < new Date(d.getTime() + 86400_000)).reduce((a, o) => a + o.riderPayout + o.tip, 0) }));
    return { total: done.reduce((a, o) => a + o.riderPayout + o.tip, 0), tips: done.reduce((a, o) => a + o.tip, 0), drops: done.length, today: last7Days[6].amount, week: last7Days.reduce((a, d) => a + d.amount, 0), last7Days, recent: done.slice(0, 20).map(({ payment, ...o }) => ({ ...o, cash: payment?.method === 'COD' ? o.total : 0 })), wallet, ledger };
  }
}

@Roles('RIDER')
@Controller('rider')
export class RiderController {
  constructor(private r: RiderService) {}
  @Patch('status') status(@CurrentUser() u: AuthUser, @Body() dto: StatusDto) { return this.r.setStatus(u, dto.online); }
  @Get('tasks') tasks(@CurrentUser() u: AuthUser) { return this.r.tasks(u); }
  @Post('tasks/:key/accept') @HttpCode(200) accept(@CurrentUser() u: AuthUser, @Param('key') key: string) { return this.r.accept(u, key); }
  @Get('active') active(@CurrentUser() u: AuthUser) { return this.r.active(u); }
  @Post('groups/:key/pickup') @HttpCode(200) pickup(@CurrentUser() u: AuthUser, @Param('key') key: string) { return this.r.pickup(u, key); }
  @Post('groups/:key/start') @HttpCode(200) start(@CurrentUser() u: AuthUser, @Param('key') key: string) { return this.r.start(u, key); }
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } }) @Post('orders/:id/deliver') @HttpCode(200) deliver(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: DeliverDto) { return this.r.deliver(u, id, dto.code); }
  @Get('earnings') earnings(@CurrentUser() u: AuthUser) { return this.r.earnings(u); }
  @Throttle({ default: { limit: 12, ttl: 60_000 } }) @Post('location') @HttpCode(200) location(@CurrentUser() u: AuthUser, @Body() dto: LocationDto) { return this.r.location(u, dto.lat, dto.lng); }
}

@Module({ imports: [OrdersModule], providers: [RiderService], controllers: [RiderController], exports: [RiderService] })
export class RiderModule {}
