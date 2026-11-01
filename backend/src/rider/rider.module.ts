import { BadRequestException, Body, Controller, Get, HttpCode, Injectable, Module, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean, Matches } from 'class-validator';
import { AuthUser, CurrentUser, Roles } from '../common/auth';
import { PrismaService } from '../common/prisma.service';
import { OrdersModule } from '../orders/orders.module';
import { OrdersService } from '../orders/orders.service';

class StatusDto { @IsBoolean() online: boolean; }
class DeliverDto { @Matches(/^\d{4}$/) code: string; }

const groupKey = (o: { batchId: string | null; id: string }) => o.batchId || o.id;

@Injectable()
export class RiderService {
  constructor(private prisma: PrismaService, private orders: OrdersService) {}

  async setStatus(user: AuthUser, online: boolean) {
    if (!user.rider) throw new BadRequestException('No rider profile.');
    return this.prisma.riderProfile.update({ where: { id: user.rider.id }, data: { online } });
  }

  async tasks(user: AuthUser) {
    if (!user.rider?.online) return [];
    const ready = await this.prisma.order.findMany({ where: { status: 'READY', riderId: null }, include: { items: true, cook: { select: { displayName: true, area: true } } }, orderBy: { updatedAt: 'asc' }, take: 100 });
    const groups = new Map<string, typeof ready>();
    for (const o of ready) groups.set(groupKey(o), [...(groups.get(groupKey(o)) || []), o]);
    return [...groups.entries()].map(([key, os]) => ({
      key, isBatch: !!os[0].batchId, cook: os[0].cook, drops: os.length,
      packages: os.reduce((a, o) => a + o.items.reduce((s, i) => s + i.quantity, 0), 0),
      dropAreas: [...new Set(os.map((o) => o.area))], earning: os.reduce((a, o) => a + o.riderPayout, 0),
      cashToCollect: 0,
    }));
  }

  async accept(user: AuthUser, key: string) {
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
    const done = await this.prisma.order.findMany({ where: { riderId: user.id, status: 'DELIVERED' }, select: { id: true, code: true, area: true, riderPayout: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 200 });
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d; });
    const last7Days = days.map((d) => ({ date: d.toISOString().slice(0, 10), amount: done.filter((o) => o.updatedAt >= d && o.updatedAt < new Date(d.getTime() + 86400_000)).reduce((a, o) => a + o.riderPayout, 0) }));
    return { total: done.reduce((a, o) => a + o.riderPayout, 0), drops: done.length, today: last7Days[6].amount, week: last7Days.reduce((a, d) => a + d.amount, 0), last7Days, recent: done.slice(0, 20) };
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
}

@Module({ imports: [OrdersModule], providers: [RiderService], controllers: [RiderController] })
export class RiderModule {}
