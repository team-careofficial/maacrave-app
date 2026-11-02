import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, HttpCode, Injectable, Module, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { batchFilled } from '../catalog/catalog.module';
import { AuthUser, CurrentUser, Roles } from '../common/auth';
import { PrismaService } from '../common/prisma.service';
import { CATEGORIES, DHAKA_AREAS } from '../common/util';
import { NotificationsService } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { orderInclude, OrdersService } from '../orders/orders.service';

class KitchenDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(20.5) @Max(26.8) lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(88) @Max(92.8) lng?: number;
  @IsOptional() @IsString() @MaxLength(300) intro?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) specialties?: string[];
  @IsOptional() @IsIn(DHAKA_AREAS) area?: string;
  @IsOptional() @IsString() @MaxLength(30) hours?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(300) dailyCapacity?: number;
  @IsOptional() @IsBoolean() accepting?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(5) hygieneChecks?: number;
  @IsOptional() @IsString() @MaxLength(20) payoutWallet?: string;
}
class DishDto {
  @IsString() @MinLength(2) @MaxLength(60) name: string;
  @IsOptional() @IsString() @MaxLength(60) nameBn?: string;
  @IsIn(CATEGORIES) category: string;
  @Type(() => Number) @IsInt() @Min(30) @Max(5000) price: number;
  @IsString() @MaxLength(40) portion: string;
  @Type(() => Number) @IsInt() @Min(5) @Max(600) prepMinutes: number;
  @IsArray() @IsString({ each: true }) ingredients: string[];
  @IsArray() @IsString({ each: true }) allergens: string[];
  @IsOptional() @IsString() @MaxLength(400) description?: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(3) spice: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(300) dailyCapacity: number;
  @IsOptional() @IsBoolean() available?: boolean;
}
class EditDishDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) name?: string;
  @IsOptional() @IsString() @MaxLength(60) nameBn?: string;
  @IsOptional() @IsIn(CATEGORIES) category?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(30) @Max(5000) price?: number;
  @IsOptional() @IsString() @MaxLength(40) portion?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(600) prepMinutes?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) ingredients?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) allergens?: string[];
  @IsOptional() @IsString() @MaxLength(400) description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(3) spice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(300) dailyCapacity?: number;
  @IsOptional() @IsBoolean() available?: boolean;
}
class ProposeDto { @Type(() => Number) @IsInt() @Min(30) @Max(5000) pricePerPortion: number; @IsOptional() @IsString() @MaxLength(140) note?: string; }
class BatchDto {
  @IsString() dishId: string;
  @Type(() => Number) @IsInt() @Min(30) pricePerPortion: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(200) minPortions: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(200) maxPortions: number;
  @Type(() => Number) @IsInt() @Min(30) @Max(720) closesInMinutes: number;
}
class CapacityDto { @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) maxPortions?: number; }

const ACTIVE: OrderStatus[] = ['SUBMITTED', 'COOK_ACCEPTED', 'CONFIRMED', 'PREPARING', 'READY'];

@Injectable()
export class KitchenService {
  constructor(private prisma: PrismaService, private orders: OrdersService, private notify: NotificationsService) {}

  private cookOf(user: AuthUser) { if (!user.cook) throw new ForbiddenException('No kitchen profile.'); return user.cook; }

  async dashboard(user: AuthUser) {
    const cook = this.cookOf(user);
    const since = new Date(Date.now() - 7 * 86400_000);
    const [requests, batches, active, delivered, payouts] = await Promise.all([
      this.inboxWhere(user).then((w) => this.prisma.foodRequest.count({ where: w })),
      this.prisma.batch.count({ where: { cookId: cook.id, status: { in: ['OPEN', 'FULL', 'CONFIRMED', 'COOKING', 'READY'] } } }),
      this.prisma.order.count({ where: { cookId: cook.id, status: { in: ACTIVE } } }),
      this.prisma.order.findMany({ where: { cookId: cook.id, status: 'DELIVERED', updatedAt: { gte: since } }, select: { cookEarning: true, updatedAt: true } }),
      this.payoutSummary(cook.id),
    ]);
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d; });
    const byDay = days.map((d) => ({ date: d.toISOString().slice(0, 10), amount: delivered.filter((o) => o.updatedAt >= d && o.updatedAt < new Date(d.getTime() + 86400_000)).reduce((a, o) => a + o.cookEarning, 0) }));
    return { kitchen: cook, newRequests: requests, activeBatches: batches, activeOrders: active, today: byDay[6].amount, last7Days: byDay, ...payouts };
  }

  async update(user: AuthUser, dto: KitchenDto) {
    const cook = this.cookOf(user);
    return this.prisma.cookProfile.update({ where: { id: cook.id }, data: dto });
  }

  dishes(user: AuthUser) { return this.prisma.dish.findMany({ where: { cookId: this.cookOf(user).id, deletedAt: null }, orderBy: { createdAt: 'desc' } }); }
  addDish(user: AuthUser, dto: DishDto) { return this.prisma.dish.create({ data: { ...dto, description: dto.description || '', cookId: this.cookOf(user).id } }); }
  async editDish(user: AuthUser, id: string, dto: EditDishDto) {
    const d = await this.prisma.dish.findFirst({ where: { id, cookId: this.cookOf(user).id, deletedAt: null } });
    if (!d) throw new NotFoundException();
    return this.prisma.dish.update({ where: { id }, data: dto });
  }
  async removeDish(user: AuthUser, id: string) {
    await this.prisma.dish.updateMany({ where: { id, cookId: this.cookOf(user).id }, data: { deletedAt: new Date(), available: false } });
    return { ok: true };
  }

  private async inboxWhere(user: AuthUser) {
    const cook = this.cookOf(user);
    return { status: { in: ['OPEN', 'PROPOSALS'] as ('OPEN' | 'PROPOSALS')[] }, area: cook.area, customerId: { not: user.id }, neededAt: { gt: new Date() }, NOT: { declinedBy: { has: cook.id } }, proposals: { none: { cookId: cook.id } } };
  }

  async inbox(user: AuthUser) {
    const list = await this.prisma.foodRequest.findMany({ where: await this.inboxWhere(user), orderBy: { createdAt: 'desc' }, take: 50, include: { customer: { select: { name: true } } } });
    return list.map((r) => ({ ...r, customer: { name: (r.customer.name || 'Customer').split(' ')[0] } }));
  }

  async propose(user: AuthUser, requestId: string, dto: ProposeDto) {
    const cook = this.cookOf(user);
    const r = await this.prisma.foodRequest.findFirst({ where: { id: requestId, status: { in: ['OPEN', 'PROPOSALS'] } } });
    if (!r) throw new BadRequestException('This request is no longer open.');
    if (r.customerId === user.id) throw new BadRequestException('You can’t reply to your own request.');
    await this.prisma.$transaction([
      this.prisma.proposal.create({ data: { requestId, cookId: cook.id, pricePerPortion: dto.pricePerPortion, note: dto.note } }),
      this.prisma.foodRequest.update({ where: { id: requestId }, data: { status: 'PROPOSALS' } }),
    ]);
    await this.notify.notify(r.customerId, 'CUSTOMER', 'New price for your request', `${cook.displayName} can cook ${r.dishName} for ৳${dto.pricePerPortion} each.`);
    return { ok: true };
  }

  async declineRequest(user: AuthUser, requestId: string) {
    const cook = this.cookOf(user);
    await this.prisma.foodRequest.update({ where: { id: requestId }, data: { declinedBy: { push: cook.id } } });
    return { ok: true };
  }

  proposals(user: AuthUser) {
    return this.prisma.proposal.findMany({ where: { cookId: this.cookOf(user).id }, orderBy: { createdAt: 'desc' }, take: 30, include: { request: { select: { dishName: true, portions: true, status: true } } } });
  }

  async listOrders(user: AuthUser, scope: string) {
    const list = await this.prisma.order.findMany({
      where: { cookId: this.cookOf(user).id, status: scope === 'done' ? 'DELIVERED' : { in: ACTIVE } },
      orderBy: { createdAt: scope === 'done' ? 'desc' : 'asc' }, take: 50,
      include: { ...orderInclude, customer: { select: { name: true } } },
    });
    // The delivery code is only for the customer; the cook never sees it.
    return list.map(({ deliveryOtp: _otp, ...o }) => ({ ...o, customer: { name: (o.customer.name || 'Customer').split(' ')[0] } }));
  }

  private async ownOrder(user: AuthUser, id: string) {
    const o = await this.prisma.order.findFirst({ where: { id, cookId: this.cookOf(user).id } });
    if (!o) throw new NotFoundException();
    if (o.batchId && !['SUBMITTED', 'COOK_ACCEPTED'].includes(o.status)) throw new BadRequestException('Manage this order from its group order.');
    return o;
  }

  async orderAction(user: AuthUser, id: string, action: string) {
    const o = await this.ownOrder(user, id);
    const flow: Record<string, [OrderStatus[], OrderStatus]> = {
      accept: [['SUBMITTED', 'COOK_ACCEPTED'], 'CONFIRMED'],
      start: [['CONFIRMED', 'COOK_ACCEPTED'], 'PREPARING'],
      ready: [['PREPARING'], 'READY'],
      decline: [['SUBMITTED', 'COOK_ACCEPTED', 'CONFIRMED'], 'CANCELLED'],
    };
    const step = flow[action];
    if (!step) throw new BadRequestException('Unknown action');
    if (!step[0].includes(o.status)) throw new BadRequestException('This order has already moved on.');
    await this.orders.transition(o.id, step[1], user.id);
    if (action === 'decline') await this.orders.refund(o.id, 'Declined by cook');
    if (action === 'ready') await this.alertRiders(1, this.cookOf(user).area);
    return { ok: true };
  }

  private async alertRiders(drops: number, area: string) {
    const riders = await this.prisma.riderProfile.findMany({ where: { online: true, user: { roles: { some: { role: 'RIDER', status: 'APPROVED' } } } }, select: { userId: true }, take: 30 });
    await Promise.all(riders.map((r) => this.notify.notify(r.userId, 'RIDER', 'Pickup ready', `${drops} drop${drops > 1 ? 's' : ''} ready in ${area}.`)));
  }

  async batches(user: AuthUser) {
    const list = await this.prisma.batch.findMany({ where: { cookId: this.cookOf(user).id }, orderBy: { createdAt: 'desc' }, take: 40, include: { orders: { include: { items: true } }, dish: true } });
    return list.map(({ orders, ...b }) => ({ ...b, filled: batchFilled(orders), drops: orders.filter((o) => o.status !== 'CANCELLED').length }));
  }

  async createBatch(user: AuthUser, dto: BatchDto) {
    const cook = this.cookOf(user);
    if (dto.maxPortions < dto.minPortions) throw new BadRequestException('Capacity must be at least the minimum.');
    const dish = await this.prisma.dish.findFirst({ where: { id: dto.dishId, cookId: cook.id, deletedAt: null } });
    if (!dish) throw new NotFoundException('Dish not found');
    const cutoffAt = new Date(Date.now() + dto.closesInMinutes * 60_000);
    return this.prisma.batch.create({ data: { cookId: cook.id, dishId: dish.id, title: dish.name, pricePerPortion: dto.pricePerPortion, minPortions: dto.minPortions, maxPortions: dto.maxPortions, cutoffAt, readyBy: new Date(cutoffAt.getTime() + (dish.prepMinutes + 20) * 60_000), area: cook.area } });
  }

  async batchAction(user: AuthUser, id: string, action: string, body?: CapacityDto) {
    const b = await this.prisma.batch.findFirst({ where: { id, cookId: this.cookOf(user).id }, include: { orders: { include: { items: true } } } });
    if (!b) throw new NotFoundException();
    const live = b.orders.filter((o) => o.status !== 'CANCELLED');
    const move = async (from: OrderStatus[], to: OrderStatus) => { for (const o of live.filter((x) => from.includes(x.status))) await this.orders.transition(o.id, to, user.id); };
    switch (action) {
      case 'close': if (b.status !== 'OPEN') throw new BadRequestException('Already closed.'); await this.prisma.batch.update({ where: { id }, data: { status: 'FULL' } }); break;
      case 'capacity': {
        const filled = batchFilled(b.orders);
        if (!body?.maxPortions || body.maxPortions < filled) throw new BadRequestException(`Capacity can’t be below ${filled}.`);
        await this.prisma.batch.update({ where: { id }, data: { maxPortions: body.maxPortions } }); break;
      }
      case 'confirm':
        if (!['OPEN', 'FULL'].includes(b.status)) throw new BadRequestException('Already confirmed.');
        if (!live.some((o) => o.status !== 'AWAITING_PAYMENT')) throw new BadRequestException('Nobody has joined yet.');
        await this.prisma.batch.update({ where: { id }, data: { status: 'CONFIRMED' } });
        for (const o of live.filter((x) => x.status === 'AWAITING_PAYMENT')) await this.orders.transition(o.id, 'CANCELLED', null);
        await move(['SUBMITTED', 'COOK_ACCEPTED'], 'CONFIRMED'); break;
      case 'cook':
        if (b.status !== 'CONFIRMED') throw new BadRequestException('Confirm the group order first.');
        await this.prisma.batch.update({ where: { id }, data: { status: 'COOKING' } });
        await move(['CONFIRMED'], 'PREPARING'); break;
      case 'ready':
        if (b.status !== 'COOKING') throw new BadRequestException('Start cooking first.');
        await this.prisma.batch.update({ where: { id }, data: { status: 'READY' } });
        await move(['PREPARING'], 'READY');
        await this.alertRiders(live.length, b.area); break;
      case 'cancel':
        if (!['OPEN', 'FULL'].includes(b.status)) throw new BadRequestException('Cooking has started; contact support.');
        await this.prisma.batch.update({ where: { id }, data: { status: 'FAILED' } });
        for (const o of live) { await this.orders.transition(o.id, 'CANCELLED', user.id); await this.orders.refund(o.id, 'Group order cancelled by cook'); }
        break;
      default: throw new BadRequestException('Unknown action');
    }
    return { ok: true };
  }

  private async payoutSummary(cookId: string) {
    const [earned, paid] = await Promise.all([
      this.prisma.order.aggregate({ where: { cookId, status: 'DELIVERED' }, _sum: { cookEarning: true, subtotal: true, commission: true }, _count: true }),
      this.prisma.payout.aggregate({ where: { cookId, status: { in: ['REQUESTED', 'PROCESSING', 'PAID'] } }, _sum: { amount: true } }),
    ]);
    const net = earned._sum.cookEarning || 0;
    return { delivered: earned._count, gross: earned._sum.subtotal || 0, commission: earned._sum.commission || 0, net, available: Math.max(0, net - (paid._sum.amount || 0)) };
  }

  async earnings(user: AuthUser) {
    const cook = this.cookOf(user);
    const [summary, recent, payouts] = await Promise.all([
      this.payoutSummary(cook.id),
      this.prisma.order.findMany({ where: { cookId: cook.id, status: 'DELIVERED' }, orderBy: { updatedAt: 'desc' }, take: 20, select: { id: true, code: true, updatedAt: true, subtotal: true, commission: true, cookEarning: true } }),
      this.prisma.payout.findMany({ where: { cookId: cook.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    return { ...summary, recent, payouts };
  }

  async requestPayout(user: AuthUser) {
    const cook = this.cookOf(user);
    if (!cook.payoutWallet) throw new BadRequestException('Add your bKash number in your kitchen profile first.');
    const { available } = await this.payoutSummary(cook.id);
    if (available < 100) throw new BadRequestException('You can withdraw once you have at least ৳100.');
    return this.prisma.payout.create({ data: { cookId: cook.id, amount: available, method: `bKash ${cook.payoutWallet}` } });
  }
}

@Roles('COOK')
@Controller('kitchen')
export class KitchenController {
  constructor(private k: KitchenService) {}
  @Get() dashboard(@CurrentUser() u: AuthUser) { return this.k.dashboard(u); }
  @Patch() update(@CurrentUser() u: AuthUser, @Body() dto: KitchenDto) { return this.k.update(u, dto); }
  @Get('dishes') dishes(@CurrentUser() u: AuthUser) { return this.k.dishes(u); }
  @Post('dishes') addDish(@CurrentUser() u: AuthUser, @Body() dto: DishDto) { return this.k.addDish(u, dto); }
  @Patch('dishes/:id') editDish(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: EditDishDto) { return this.k.editDish(u, id, dto); }
  @Delete('dishes/:id') removeDish(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.k.removeDish(u, id); }
  @Get('requests') inbox(@CurrentUser() u: AuthUser) { return this.k.inbox(u); }
  @Get('proposals') proposals(@CurrentUser() u: AuthUser) { return this.k.proposals(u); }
  @Post('requests/:id/propose') propose(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: ProposeDto) { return this.k.propose(u, id, dto); }
  @Post('requests/:id/decline') @HttpCode(200) decline(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.k.declineRequest(u, id); }
  @Get('orders') orders(@CurrentUser() u: AuthUser, @Query('scope') scope = 'active') { return this.k.listOrders(u, scope); }
  @Post('orders/:id/:action') @HttpCode(200) orderAction(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('action') action: string) { return this.k.orderAction(u, id, action); }
  @Get('batches') batches(@CurrentUser() u: AuthUser) { return this.k.batches(u); }
  @Post('batches') createBatch(@CurrentUser() u: AuthUser, @Body() dto: BatchDto) { return this.k.createBatch(u, dto); }
  @Post('batches/:id/:action') @HttpCode(200) batchAction(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('action') action: string, @Body() body: CapacityDto) { return this.k.batchAction(u, id, action, body); }
  @Get('earnings') earnings(@CurrentUser() u: AuthUser) { return this.k.earnings(u); }
  @Post('payouts') payout(@CurrentUser() u: AuthUser) { return this.k.requestPayout(u); }
}

@Module({ imports: [OrdersModule], providers: [KitchenService], controllers: [KitchenController] })
export class KitchenModule {}
