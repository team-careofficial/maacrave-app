import { BadRequestException, Body, Controller, Get, HttpCode, Injectable, Logger, Module, NotFoundException, OnApplicationBootstrap, Param, Patch, Post, Query } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MealSlot, PlanPeriod } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AuthUser, CurrentUser, Public, Roles } from '../common/auth';
import { pointOf, roadKm } from '../common/geo';
import { computeFees } from '../common/pricing';
import { PrismaService } from '../common/prisma.service';
import { digits, orderCode } from '../common/util';
import { NotificationsService } from '../notifications/notifications.module';

/*
 * Meal plans (subscriptions). A cook offers e.g. "Weekday lunch box — 6 days/week, ৳140 per meal, monthly".
 * A customer subscribes for a week or a month. Every delivery day the server turns each active subscription
 * into a normal cash-on-delivery order, so cooking, riders, delivery codes and reviews all work as usual.
 * Generation is idempotent and also runs on demand, because free hosting can sleep through a cron.
 */

const DHAKA_MS = 6 * 3600_000;
/** Today's date in Dhaka as YYYY-MM-DD, plus its weekday (0 = Sunday). */
function dhakaDay(offsetDays = 0) {
  const d = new Date(Date.now() + DHAKA_MS + offsetDays * 86400_000);
  return { iso: d.toISOString().slice(0, 10), weekday: d.getUTCDay() };
}
/** A Dhaka local date + "HH:MM" as a real instant. */
const dhakaInstant = (iso: string, hhmm: string) => new Date(`${iso}T${hhmm}:00+06:00`);

const cookPublic = { id: true, displayName: true, area: true, rating: true, ratingCount: true, lat: true, lng: true } as const;

class PlanDto {
  @IsString() @MinLength(3) @MaxLength(50) title: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsIn(['BREAKFAST', 'LUNCH', 'DINNER']) meal: MealSlot;
  @IsIn(['WEEKLY', 'MONTHLY']) period: PlanPeriod;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(7) @Type(() => Number) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) days: number[];
  @Type(() => Number) @IsInt() @Min(40) @Max(2000) pricePerMeal: number;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) deliverAt: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(200) capacity: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
class EditPlanDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(50) title?: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(40) @Max(2000) pricePerMeal?: number;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) deliverAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) capacity?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
class SkipDto { @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date: string; @IsOptional() @IsBoolean() skip?: boolean; }
class SubscribeDto {
  @IsString() addressId: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate: string;
  @IsOptional() @IsString() @MaxLength(200) notes?: string;
}

@Injectable()
export class PlansService implements OnApplicationBootstrap {
  private log = new Logger('Plans');
  private lastRun = '';
  constructor(private prisma: PrismaService, private notify: NotificationsService) {}

  /* ---------- browsing ---------- */
  list(q: { meal?: string; period?: string }) {
    return this.prisma.mealPlan.findMany({
      where: {
        active: true,
        ...(q.meal && ['BREAKFAST', 'LUNCH', 'DINNER'].includes(q.meal) ? { meal: q.meal as MealSlot } : {}),
        ...(q.period && ['WEEKLY', 'MONTHLY'].includes(q.period) ? { period: q.period as PlanPeriod } : {}),
        cook: { user: { suspended: false, roles: { some: { role: 'COOK', status: 'APPROVED' } } } },
      },
      orderBy: [{ cook: { rating: 'desc' } }, { pricePerMeal: 'asc' }], take: 60,
      include: { cook: { select: cookPublic }, _count: { select: { subscriptions: { where: { status: 'ACTIVE' } } } } },
    });
  }
  async get(id: string) {
    const p = await this.prisma.mealPlan.findUnique({ where: { id }, include: { cook: { select: cookPublic }, _count: { select: { subscriptions: { where: { status: 'ACTIVE' } } } } } });
    if (!p) throw new NotFoundException('Plan not found');
    return p;
  }

  /* ---------- customer ---------- */
  async subscribe(user: AuthUser, planId: string, dto: SubscribeDto) {
    const plan = await this.get(planId);
    if (!plan.active) throw new BadRequestException('This plan is not taking new subscribers.');
    if (user.cook?.id === plan.cookId) throw new BadRequestException('You can’t subscribe to your own plan.');
    if (plan._count.subscriptions >= plan.capacity) throw new BadRequestException('This plan is full right now. Try another kitchen.');
    const dup = await this.prisma.subscription.findFirst({ where: { planId, customerId: user.id, status: { in: ['ACTIVE', 'PAUSED'] } } });
    if (dup) throw new BadRequestException('You already have this plan.');
    const address = await this.prisma.address.findFirst({ where: { id: dto.addressId, userId: user.id } });
    if (!address) throw new BadRequestException('Choose a delivery address.');
    if (dto.startDate < dhakaDay(1).iso) throw new BadRequestException('Plans can start from tomorrow.');
    const start = new Date(`${dto.startDate}T00:00:00+06:00`);
    const end = new Date(start.getTime() + (plan.period === 'WEEKLY' ? 7 : 30) * 86400_000 - 1);
    const addressText = [address.house, address.road, address.floor, address.area].filter(Boolean).join(', ') + (address.landmark ? ` (${address.landmark})` : '');
    const sub = await this.prisma.subscription.create({
      data: { planId, customerId: user.id, startDate: start, endDate: end, addressText, area: address.area, lat: address.lat, lng: address.lng, notes: dto.notes },
    });
    const cook = await this.prisma.cookProfile.findUniqueOrThrow({ where: { id: plan.cookId } });
    await this.notify.notify(cook.userId, 'COOK', 'New meal plan subscriber', `${user.name || 'A customer'} joined “${plan.title}” from ${dto.startDate}.`);
    return sub;
  }
  mine(user: AuthUser) {
    return this.prisma.subscription.findMany({
      where: { customerId: user.id }, orderBy: { createdAt: 'desc' }, take: 30,
      include: { plan: { include: { cook: { select: cookPublic } } } },
    });
  }
  async change(user: AuthUser, id: string, action: 'pause' | 'resume' | 'cancel') {
    const s = await this.prisma.subscription.findFirst({ where: { id, customerId: user.id }, include: { plan: { include: { cook: true } } } });
    if (!s) throw new NotFoundException();
    const from = { pause: ['ACTIVE'], resume: ['PAUSED'], cancel: ['ACTIVE', 'PAUSED'] }[action];
    if (!from.includes(s.status)) throw new BadRequestException('This plan can’t be changed now.');
    const status = action === 'pause' ? 'PAUSED' : action === 'resume' ? 'ACTIVE' : 'CANCELLED';
    await this.prisma.subscription.update({ where: { id }, data: { status } });
    await this.notify.notify(s.plan.cook.userId, 'COOK', `Meal plan ${action === 'pause' ? 'paused' : action === 'resume' ? 'resumed' : 'cancelled'}`, `${user.name || 'A customer'} · ${s.plan.title}`);
    return this.mine(user);
  }

  /** Skip one delivery day (or undo it). Only days from tomorrow onward can change. */
  async skip(user: AuthUser, id: string, date: string, skip: boolean) {
    const s = await this.prisma.subscription.findFirst({ where: { id, customerId: user.id }, include: { plan: { include: { cook: true } } } });
    if (!s) throw new NotFoundException();
    if (!['ACTIVE', 'PAUSED'].includes(s.status)) throw new BadRequestException('This plan has ended.');
    if (date <= dhakaDay().iso) throw new BadRequestException('You can skip days from tomorrow onward.');
    const at = new Date(`${date}T00:00:00+06:00`);
    if (at > s.endDate) throw new BadRequestException('That day is after your plan ends.');
    const set = new Set(s.skipDates);
    if (skip) set.add(date); else set.delete(date);
    await this.prisma.subscription.update({ where: { id }, data: { skipDates: [...set].sort().slice(-60) } });
    if (skip) await this.notify.notify(s.plan.cook.userId, 'COOK', 'A meal plan day was skipped', `${user.name || 'A customer'} skips ${s.plan.title} on ${date}.`);
    return this.mine(user);
  }

  /* ---------- cook ---------- */
  private cookId(user: AuthUser) { if (!user.cook) throw new BadRequestException('No kitchen profile.'); return user.cook.id; }
  kitchenPlans(user: AuthUser) {
    return this.prisma.mealPlan.findMany({ where: { cookId: this.cookId(user) }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { subscriptions: { where: { status: 'ACTIVE' } } } } } });
  }
  createPlan(user: AuthUser, dto: PlanDto) {
    return this.prisma.mealPlan.create({ data: { ...dto, days: [...new Set(dto.days)].sort(), description: dto.description || '', cookId: this.cookId(user) } });
  }
  async editPlan(user: AuthUser, id: string, dto: EditPlanDto) {
    const p = await this.prisma.mealPlan.findFirst({ where: { id, cookId: this.cookId(user) } });
    if (!p) throw new NotFoundException();
    return this.prisma.mealPlan.update({ where: { id }, data: dto });
  }
  async subscribers(user: AuthUser) {
    await this.generate(); // make sure today's plan orders exist
    return this.prisma.subscription.findMany({
      where: { plan: { cookId: this.cookId(user) }, status: { in: ['ACTIVE', 'PAUSED'] } }, orderBy: { startDate: 'asc' },
      include: { plan: { select: { title: true, meal: true, deliverAt: true } }, customer: { select: { name: true } } },
    });
  }

  /* ---------- daily orders ---------- */
  /** Creates today's orders for every active subscription. Safe to call any number of times. */
  async generate(force = false) {
    const today = dhakaDay();
    const stamp = `${today.iso}:${new Date().getUTCHours()}`;
    if (!force && this.lastRun === stamp) return 0; // at most once an hour per server
    this.lastRun = stamp;
    await this.prisma.subscription.updateMany({ where: { status: { in: ['ACTIVE', 'PAUSED'] }, endDate: { lt: new Date() } }, data: { status: 'ENDED' } });
    const dayStart = new Date(`${today.iso}T00:00:00+06:00`);
    const subs = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', startDate: { lte: dayStart }, endDate: { gte: dayStart }, NOT: { skipDates: { has: today.iso } }, plan: { active: true, days: { has: today.weekday } } },
      include: { plan: { include: { cook: true } } },
    });
    if (!subs.length) return 0;
    const s = await this.prisma.platformSetting.findUniqueOrThrow({ where: { id: 1 } });
    let made = 0;
    for (const sub of subs) {
      const key = `sub:${sub.id}:${today.iso}`;
      if (await this.prisma.order.findUnique({ where: { idempotencyKey: key }, select: { id: true } })) continue;
      const fees = computeFees(sub.plan.pricePerMeal, true, s, null, roadKm(pointOf(sub.plan.cook), pointOf(sub))); // plans ride with the cheaper group delivery rate
      try {
        const o = await this.prisma.order.create({
          data: {
            code: orderCode(), customerId: sub.customerId, cookId: sub.plan.cookId, status: 'CONFIRMED', subscriptionId: sub.id, idempotencyKey: key,
            subtotal: fees.subtotal, serviceFee: fees.serviceFee, deliveryFee: fees.deliveryFee, discount: 0, total: fees.total,
            commission: fees.commission, cookEarning: fees.cookEarning, riderPayout: fees.riderPayout, distanceKm: fees.distanceKm,
            addressText: sub.addressText, area: sub.area, lat: sub.lat, lng: sub.lng, deliveryOtp: digits(4), notes: sub.notes,
            scheduledFor: dhakaInstant(today.iso, sub.plan.deliverAt),
            items: { create: [{ name: sub.plan.title, unitPrice: sub.plan.pricePerMeal, quantity: 1 }] },
            events: { create: { status: 'CONFIRMED' } },
            payment: { create: { method: 'COD', amount: fees.total } },
          },
        });
        made++;
        await this.notify.notify(sub.customerId, 'CUSTOMER', `Today's ${sub.plan.meal.toLowerCase()} is booked`, `${sub.plan.title} · arrives around ${sub.plan.deliverAt} · ${o.code}`);
      } catch (e) {
        this.log.warn(`Plan order for ${sub.id} skipped: ${(e as Error).message}`);
      }
    }
    if (made) {
      const byCook = new Map<string, number>();
      subs.forEach((x) => byCook.set(x.plan.cook.userId, (byCook.get(x.plan.cook.userId) || 0) + 1));
      for (const [userId, n] of byCook) await this.notify.notify(userId, 'COOK', 'Meal plan orders for today', `${n} plan meal${n > 1 ? 's' : ''} to cook today. See Orders.`);
      this.log.log(`Created ${made} meal plan orders for ${today.iso}`);
    }
    return made;
  }

  /** Free hosting sleeps when idle; catch up as soon as the server wakes. */
  onApplicationBootstrap() { setTimeout(() => this.generate(true).catch((e) => this.log.error((e as Error).message)), 5000); }

  @Cron('0 * * * *') // hourly; generate() itself only acts once per hour
  hourly() { return this.generate().catch((e) => this.log.error((e as Error).message)); }
}

@Controller()
export class PlansController {
  constructor(private plans: PlansService) {}
  @Public() @Get('plans') list(@Query('meal') meal?: string, @Query('period') period?: string) { return this.plans.list({ meal, period }); }
  @Public() @Get('plans/:id') get(@Param('id') id: string) { return this.plans.get(id); }
  @Post('plans/:id/subscribe') subscribe(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: SubscribeDto) { return this.plans.subscribe(u, id, dto); }
  @Get('me/subscriptions') async mine(@CurrentUser() u: AuthUser) { await this.plans.generate(); return this.plans.mine(u); }
  @Post('subscriptions/:id/skip') @HttpCode(200) skipDay(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: SkipDto) { return this.plans.skip(u, id, dto.date, dto.skip !== false); }
  @Post('subscriptions/:id/:action') @HttpCode(200) change(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('action') action: string) {
    if (!['pause', 'resume', 'cancel'].includes(action)) throw new BadRequestException('Unknown action');
    return this.plans.change(u, id, action as 'pause' | 'resume' | 'cancel');
  }
  @Roles('COOK') @Get('kitchen/plans') kitchenPlans(@CurrentUser() u: AuthUser) { return this.plans.kitchenPlans(u); }
  @Roles('COOK') @Post('kitchen/plans') createPlan(@CurrentUser() u: AuthUser, @Body() dto: PlanDto) { return this.plans.createPlan(u, dto); }
  @Roles('COOK') @Patch('kitchen/plans/:id') editPlan(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: EditPlanDto) { return this.plans.editPlan(u, id, dto); }
  @Roles('COOK') @Get('kitchen/subscribers') subscribers(@CurrentUser() u: AuthUser) { return this.plans.subscribers(u); }
}

@Module({ providers: [PlansService], controllers: [PlansController], exports: [PlansService] })
export class PlansModule {}
