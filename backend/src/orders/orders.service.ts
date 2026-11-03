import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { AuthUser } from '../common/auth';
import { roadKm, pointOf } from '../common/geo';
import { computeFees, couponDiscount } from '../common/pricing';
import { PrismaService } from '../common/prisma.service';
import { digits, orderCode } from '../common/util';
import { NotificationsService } from '../notifications/notifications.module';
import { BkashGateway, SslCommerzGateway } from '../payments/gateways';

export type CheckoutKind = 'cart' | 'batch' | 'request';
export interface CheckoutInput {
  kind: CheckoutKind;
  items?: { dishId: string; quantity: number }[];
  batchId?: string;
  quantity?: number;
  requestId?: string;
  proposalId?: string;
  allowGroup?: boolean;
  couponCode?: string;
  addressId?: string;
  tip?: number;
}
export interface PlaceOrderInput extends CheckoutInput {
  addressId: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  scheduledFor?: string;
  idempotencyKey?: string;
  client?: 'app' | 'web';
}

type Tx = Prisma.TransactionClient;
const CANCELLABLE: OrderStatus[] = ['AWAITING_PAYMENT', 'SUBMITTED', 'COOK_ACCEPTED', 'CONFIRMED'];
const MESSAGES: Partial<Record<OrderStatus, [string, string]>> = {
  COOK_ACCEPTED: ['Order accepted', 'The cook accepted your order.'],
  CONFIRMED: ['Order confirmed', 'Cooking starts soon.'],
  PREPARING: ['Being cooked', 'Your food is being cooked fresh.'],
  READY: ['Packed and ready', 'Waiting for a rider to pick it up.'],
  RIDER_ASSIGNED: ['Rider on the way to the kitchen', 'A rider has accepted your delivery.'],
  PICKED_UP: ['Picked up', 'The rider has your food.'],
  ON_THE_WAY: ['On the way', 'Share your delivery code with the rider at the door.'],
  DELIVERED: ['Delivered', 'Enjoy your meal! Tap to rate it.'],
  CANCELLED: ['Order cancelled', 'If you paid online, your refund is on its way.'],
};

export const orderInclude = {
  items: true, events: { orderBy: { createdAt: 'asc' } }, payment: true, review: true,
  cook: { select: { id: true, displayName: true, area: true, userId: true, lat: true, lng: true } },
  rider: { select: { id: true, name: true } },
  batch: { select: { id: true, title: true, readyBy: true, status: true } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  private log = new Logger('Orders');
  constructor(private prisma: PrismaService, private notify: NotificationsService, private bkash: BkashGateway, private ssl: SslCommerzGateway) {}

  /** Road km from the kitchen to the address (pins if set, otherwise area centres). */
  private async distance(tx: Tx, cookId: string, address: { lat: number | null; lng: number | null; area: string } | null) {
    if (!address) return 2;
    const cook = await tx.cookProfile.findUniqueOrThrow({ where: { id: cookId }, select: { lat: true, lng: true, area: true } });
    return roadKm(pointOf(cook), pointOf(address));
  }

  /**
   * Tells the online riders nearest to the kitchen first. For the first 90 seconds only they see the task;
   * after that every online rider does (see RiderService.tasks).
   */
  async offerToRiders(cookId: string, drops: number) {
    const cook = await this.prisma.cookProfile.findUnique({ where: { id: cookId }, select: { lat: true, lng: true, area: true, displayName: true } });
    if (!cook) return;
    const k = pointOf(cook);
    const riders = await this.prisma.riderProfile.findMany({ where: { online: true, user: { suspended: false, roles: { some: { role: 'RIDER', status: 'APPROVED' } } } }, select: { userId: true, lat: true, lng: true, locatedAt: true } });
    const fresh = (r: { locatedAt: Date | null }) => r.locatedAt && Date.now() - r.locatedAt.getTime() < 15 * 60_000;
    const ranked = riders.map((r) => ({ ...r, km: r.lat != null && r.lng != null && fresh(r) ? roadKm({ lat: r.lat, lng: r.lng }, k) : 99 })).sort((a, b) => a.km - b.km);
    const first = ranked.filter((r) => r.km < 99).slice(0, 3);
    const notifyList = first.length ? first : ranked.slice(0, 10);
    await Promise.all(notifyList.map((r) => this.notify.notify(r.userId, 'RIDER', 'New pickup near you',
      `${drops} drop${drops > 1 ? 's' : ''} at ${cook.displayName}, ${cook.area}${r.km < 99 ? ` · ${r.km.toFixed(1)} km away` : ''}. Open Pickups to accept.`)));
  }

  /** Works out what is being bought, at what price, from whom. Prices always come from the database. */
  private async resolve(tx: Tx, user: AuthUser, input: CheckoutInput) {
    if (input.kind === 'cart') {
      const lines = (input.items || []).filter((i) => i.quantity > 0);
      if (!lines.length) throw new BadRequestException('Your cart is empty.');
      const dishes = await tx.dish.findMany({ where: { id: { in: lines.map((l) => l.dishId) }, deletedAt: null }, include: { cook: true } });
      if (dishes.length !== lines.length) throw new BadRequestException('Some dishes are no longer on the menu.');
      const cookIds = new Set(dishes.map((d) => d.cookId));
      if (cookIds.size !== 1) throw new BadRequestException('One order can only contain food from one kitchen.');
      const cook = dishes[0].cook;
      if (!cook.accepting) throw new BadRequestException(`${cook.displayName} isn’t taking orders right now.`);
      for (const d of dishes) if (!d.available) throw new BadRequestException(`${d.name} isn’t available today.`);
      const items = lines.map((l) => { const d = dishes.find((x) => x.id === l.dishId)!; return { dishId: d.id, name: d.name, unitPrice: d.price, quantity: Math.min(l.quantity, 50) }; });
      // Festival dishes are pre-orders: delivered on the festival day, and can't share a cart with today's food.
      const festIds = new Set(dishes.map((d) => d.festivalId || ''));
      if (festIds.size > 1) throw new BadRequestException('Festival pre-orders arrive on the festival day, so order them separately from today’s food.');
      const festId = dishes[0].festivalId;
      const fest = festId ? await tx.festival.findUnique({ where: { id: festId } }) : null;
      if (festId && (!fest || !fest.active || fest.opensAt > new Date() || fest.closesAt < new Date())) throw new BadRequestException('Pre-orders for this festival aren’t open right now.');
      // Each dish has a daily limit set by the cook; don't sell more than she can make today (Dhaka day).
      // For a festival dish the limit covers the whole pre-order window.
      const dayStart = fest ? fest.opensAt : new Date(new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10) + 'T00:00:00+06:00');
      for (const it of items) {
        const d = dishes.find((x) => x.id === it.dishId)!;
        const sold = await tx.orderItem.aggregate({ where: { dishId: d.id, order: { createdAt: { gte: dayStart }, status: { not: 'CANCELLED' } } }, _sum: { quantity: true } });
        const left = d.dailyCapacity - (sold._sum.quantity || 0);
        if (it.quantity > left) throw new BadRequestException(left > 0 ? `Only ${left} portion${left > 1 ? 's' : ''} of ${d.name} left${fest ? '' : ' today'}.` : `${d.name} is sold out${fest ? '' : ' for today'}.`);
      }
      return { cookId: cook.id, cookUserId: cook.userId, items, isBatch: false as boolean, batchId: null as string | null, request: null, proposal: null, scheduledFor: fest?.deliverOn ?? null };
    }
    if (input.kind === 'batch') {
      if (!input.batchId || !input.quantity || input.quantity < 1) throw new BadRequestException('Choose how many portions.');
      await tx.$queryRaw`SELECT id FROM "Batch" WHERE id = ${input.batchId} FOR UPDATE`;
      const b = await tx.batch.findUnique({ where: { id: input.batchId }, include: { cook: true, orders: { include: { items: true } } } });
      if (!b || b.status !== 'OPEN' || b.cutoffAt < new Date()) throw new BadRequestException('This group order is closed.');
      const filled = b.orders.filter((o) => o.status !== 'CANCELLED').reduce((a, o) => a + o.items.reduce((s, i) => s + i.quantity, 0), 0);
      if (b.orders.some((o) => o.customerId === user.id && o.status !== 'CANCELLED')) throw new BadRequestException('You have already joined this group order.');
      if (filled + input.quantity > b.maxPortions) throw new BadRequestException(`Only ${b.maxPortions - filled} portions are left.`);
      return { cookId: b.cookId, cookUserId: b.cook.userId, items: [{ dishId: b.dishId, name: b.title, unitPrice: b.pricePerPortion, quantity: input.quantity }], isBatch: true as boolean, batchId: b.id as string | null, request: null, proposal: null };
    }
    const request = await tx.foodRequest.findFirst({ where: { id: input.requestId, customerId: user.id } });
    if (!request || !['OPEN', 'PROPOSALS'].includes(request.status)) throw new BadRequestException('This request is no longer open.');
    const proposal = await tx.proposal.findFirst({ where: { id: input.proposalId, requestId: request.id, status: 'PENDING' }, include: { cook: true } });
    if (!proposal) throw new BadRequestException('This price proposal is no longer available.');
    return {
      cookId: proposal.cookId, cookUserId: proposal.cook.userId,
      items: [{ dishId: null as string | null, name: request.dishName, unitPrice: proposal.pricePerPortion, quantity: request.portions }],
      isBatch: !!input.allowGroup, batchId: null as string | null, request, proposal,
    };
  }

  async quote(user: AuthUser, input: CheckoutInput) {
    return this.prisma.$transaction(async (tx) => {
      const r = await this.resolve(tx, user, input);
      const s = await tx.platformSetting.findUniqueOrThrow({ where: { id: 1 } });
      const subtotal = r.items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);
      const coupon = input.couponCode ? await tx.coupon.findUnique({ where: { code: input.couponCode.toUpperCase().trim() } }) : null;
      const check = input.couponCode ? (coupon ? couponDiscount(coupon, subtotal, r.isBatch) : { amount: 0, error: 'This code isn’t valid.' }) : { amount: 0 };
      const address = input.addressId ? await tx.address.findFirst({ where: { id: input.addressId, userId: user.id } }) : null;
      const km = await this.distance(tx, r.cookId, address);
      return { items: r.items, fees: computeFees(subtotal, r.isBatch, s, coupon, km, input.tip), couponError: check.error ?? null, scheduledFor: 'scheduledFor' in r ? r.scheduledFor : null };
    });
  }

  async place(user: AuthUser, input: PlaceOrderInput) {
    if (input.idempotencyKey) {
      const existing = await this.prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: orderInclude });
      if (existing) return { order: existing, paymentUrl: null };
    }
    const address = await this.prisma.address.findFirst({ where: { id: input.addressId, userId: user.id } });
    if (!address) throw new BadRequestException('Choose a delivery address.');
    if (!user.name) throw new BadRequestException('Add your name in your profile first.');
    if (!user.phone) throw new BadRequestException('Add your mobile number first so the rider can reach you.');
    if (input.paymentMethod === 'BKASH' && !this.bkash.configured()) throw new BadRequestException('bKash isn’t available yet. Choose cash on delivery.');
    if (input.paymentMethod === 'SSLCOMMERZ' && !this.ssl.configured()) throw new BadRequestException('Card and wallet payments aren’t available yet. Choose cash on delivery.');

    const order = await this.prisma.$transaction(async (tx) => {
      const r = await this.resolve(tx, user, input);
      const s = await tx.platformSetting.findUniqueOrThrow({ where: { id: 1 } });
      const subtotal = r.items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);
      const coupon = input.couponCode ? await tx.coupon.findUnique({ where: { code: input.couponCode.toUpperCase().trim() } }) : null;
      const fees = computeFees(subtotal, r.isBatch, s, coupon, await this.distance(tx, r.cookId, address), input.tip);
      if (fees.couponCode) await tx.coupon.update({ where: { code: fees.couponCode }, data: { usedCount: { increment: 1 } } });

      let batchId = r.batchId;
      if (r.request && r.proposal) {
        await tx.proposal.update({ where: { id: r.proposal.id }, data: { status: 'ACCEPTED' } });
        await tx.proposal.updateMany({ where: { requestId: r.request.id, id: { not: r.proposal.id }, status: 'PENDING' }, data: { status: 'REJECTED' } });
        await tx.foodRequest.update({ where: { id: r.request.id }, data: { status: 'ACCEPTED' } });
        if (input.allowGroup) {
          const cutoffAt = new Date(Date.now() + 60 * 60_000);
          const b = await tx.batch.create({ data: { cookId: r.cookId, title: r.request.dishName, pricePerPortion: r.proposal.pricePerPortion, minPortions: r.request.portions, maxPortions: r.request.portions + 10, cutoffAt, readyBy: new Date(Math.max(r.request.neededAt.getTime(), cutoffAt.getTime() + 75 * 60_000)), area: r.proposal.cook.area } });
          batchId = b.id;
        }
      }
      const online = input.paymentMethod !== 'COD';
      const firstStatus: OrderStatus = online ? 'AWAITING_PAYMENT' : r.request ? 'COOK_ACCEPTED' : 'SUBMITTED';
      const addressText = [address.house, address.road, address.floor, address.area].filter(Boolean).join(', ') + (address.landmark ? ` (${address.landmark})` : '');
      return tx.order.create({
        data: {
          code: orderCode(), customerId: user.id, cookId: r.cookId, batchId, requestId: r.request?.id ?? null,
          status: firstStatus, subtotal: fees.subtotal, serviceFee: fees.serviceFee, deliveryFee: fees.deliveryFee, discount: fees.discount, total: fees.total,
          commission: fees.commission, cookEarning: fees.cookEarning, riderPayout: fees.riderPayout, couponCode: fees.couponCode, distanceKm: fees.distanceKm, tip: fees.tip,
          addressText, area: address.area, lat: address.lat, lng: address.lng, deliveryOtp: digits(4), notes: input.notes?.slice(0, 300),
          scheduledFor: ('scheduledFor' in r && r.scheduledFor) ? r.scheduledFor : input.scheduledFor ? new Date(input.scheduledFor) : null,
          idempotencyKey: input.idempotencyKey,
          items: { create: r.items },
          events: { create: { status: firstStatus, actorId: user.id } },
          payment: { create: { method: input.paymentMethod, amount: fees.total, returnTo: input.client === 'web' ? 'web' : 'app' } },
        },
        include: orderInclude,
      });
    });

    if (order.status !== 'AWAITING_PAYMENT') await this.notifyCookOfNewOrder(order.id);
    // The order exists even if the gateway hiccups; the customer can retry from the order screen.
    let paymentUrl: string | null = null;
    let paymentError: string | null = null;
    if (order.status === 'AWAITING_PAYMENT') {
      try { paymentUrl = await this.startPayment(user, order.id); } catch (e) { paymentError = (e as Error).message; }
    }
    return { order, paymentUrl, paymentError };
  }

  async startPayment(user: AuthUser, orderId: string, client?: 'app' | 'web') {
    const o = await this.prisma.order.findFirst({ where: { id: orderId, customerId: user.id }, include: { payment: true, items: true } });
    if (!o || !o.payment) throw new NotFoundException();
    if (o.status !== 'AWAITING_PAYMENT') throw new BadRequestException('This order doesn’t need payment.');
    if (client) await this.prisma.payment.update({ where: { orderId: o.id }, data: { returnTo: client } });
    const api = process.env.API_PUBLIC_URL;
    if (o.payment.method === 'BKASH') {
      const r = await this.bkash.create(o.code, o.total, user.phone || user.id.slice(-11), `${api}/payments/bkash/callback`);
      await this.prisma.payment.update({ where: { orderId: o.id }, data: { providerRef: r.paymentId } });
      return r.url;
    }
    const r = await this.ssl.create({ tranId: o.code, amount: o.total, name: user.name || 'Customer', phone: user.phone || '01700000000', email: user.email || undefined, address: o.addressText, area: o.area, product: o.items.map((i) => i.name).join(', ') });
    await this.prisma.payment.update({ where: { orderId: o.id }, data: { providerRef: o.code } });
    return r.url;
  }

  /** Called by payment callbacks after the gateway confirms the money. Idempotent. */
  async markPaid(orderId: string, trx: string | undefined, raw: unknown) {
    const o = await this.prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    if (!o || !o.payment || o.payment.status === 'PAID') return;
    await this.prisma.payment.update({ where: { orderId }, data: { status: 'PAID', providerTrx: trx, raw: raw as Prisma.InputJsonValue } });
    if (o.status === 'AWAITING_PAYMENT') {
      await this.transition(orderId, o.requestId ? 'COOK_ACCEPTED' : 'SUBMITTED', null);
      await this.notifyCookOfNewOrder(orderId);
    } else if (o.status === 'CANCELLED') {
      await this.refund(orderId, 'Order was cancelled before payment completed');
    }
  }

  async markPaymentFailed(orderId: string, raw: unknown) {
    await this.prisma.payment.updateMany({ where: { orderId, status: 'PENDING' }, data: { status: 'FAILED', raw: raw as Prisma.InputJsonValue } });
  }

  private async notifyCookOfNewOrder(orderId: string) {
    const o = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, cook: true } });
    const what = o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ');
    await this.notify.notify(o.cook.userId, 'COOK', o.batchId ? 'New group order portion' : 'New order', `${what} · ${o.code}`);
  }

  /** The only place order status changes. Records an event and tells the customer. */
  async transition(orderId: string, to: OrderStatus, actorId: string | null, tx?: Tx) {
    const db = tx || this.prisma;
    const o = await db.order.update({ where: { id: orderId }, data: { status: to, events: { create: { status: to, actorId } } } });
    const msg = MESSAGES[to];
    if (msg) {
      const body = to === 'ON_THE_WAY' ? `Your delivery code is ${o.deliveryOtp}. ${msg[1]}` : msg[1];
      await this.notify.notify(o.customerId, 'CUSTOMER', `${msg[0]} · ${o.code}`, body);
    }
    return o;
  }

  async refund(orderId: string, reason: string) {
    const p = await this.prisma.payment.findUnique({ where: { orderId } });
    if (!p || p.status !== 'PAID') return;
    if (p.method === 'BKASH' && p.providerRef && p.providerTrx) {
      try {
        const r = await this.bkash.refund(p.providerRef, p.providerTrx, p.amount, reason);
        if (r.transactionStatus === 'Completed') { await this.prisma.payment.update({ where: { orderId }, data: { status: 'REFUNDED' } }); return; }
        this.log.warn(`bKash refund not completed for ${orderId}: ${JSON.stringify(r)}`);
      } catch (e) { this.log.error(`bKash refund error ${orderId}: ${(e as Error).message}`); }
    }
    // SSLCommerz refunds and failed bKash refunds are processed by the finance team.
    await this.prisma.payment.update({ where: { orderId }, data: { status: 'REFUND_PENDING' } });
  }

  async cancelByCustomer(user: AuthUser, orderId: string) {
    const o = await this.prisma.order.findFirst({ where: { id: orderId, customerId: user.id } });
    if (!o) throw new NotFoundException();
    if (!CANCELLABLE.includes(o.status)) throw new BadRequestException('The cook has already started. Report a problem instead.');
    await this.transition(o.id, 'CANCELLED', user.id);
    await this.refund(o.id, 'Cancelled by customer');
    const cook = await this.prisma.cookProfile.findUniqueOrThrow({ where: { id: o.cookId } });
    if (o.status !== 'AWAITING_PAYMENT') await this.notify.notify(cook.userId, 'COOK', 'Order cancelled', `${o.code} was cancelled by the customer.`);
    return this.get(user, o.id);
  }

  list(user: AuthUser, scope: string) {
    const active: OrderStatus[] = ['AWAITING_PAYMENT', 'SUBMITTED', 'COOK_ACCEPTED', 'CONFIRMED', 'PREPARING', 'READY', 'RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'];
    return this.prisma.order.findMany({
      where: { customerId: user.id, status: scope === 'past' ? { in: ['DELIVERED', 'CANCELLED'] } : { in: active } },
      orderBy: { createdAt: 'desc' }, take: 50, include: orderInclude,
    });
  }

  async get(user: AuthUser, id: string) {
    const o = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!o) throw new NotFoundException('Order not found');
    const isCook = user.cook?.id === o.cookId, isRider = o.riderId === user.id, isCustomer = o.customerId === user.id;
    if (!isCook && !isRider && !isCustomer) throw new ForbiddenException();
    if (!isCustomer) {
      // Only the customer sees the delivery code. The cook never sees the address; the rider sees it once the food is picked up.
      const showAddress = isRider && ['PICKED_UP', 'ON_THE_WAY', 'DELIVERED'].includes(o.status);
      return { ...o, deliveryOtp: undefined, ...(showAddress ? {} : { addressText: o.area, lat: null, lng: null }) };
    }
    // Live tracking: while a rider has the order, the customer sees where they are and can call them.
    let tracking: { lat: number | null; lng: number | null; locatedAt: Date | null; phone: string | null; vehicle: string } | null = null;
    if (o.riderId && ['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'].includes(o.status)) {
      const r = await this.prisma.riderProfile.findUnique({ where: { userId: o.riderId }, select: { lat: true, lng: true, locatedAt: true, vehicle: true, user: { select: { phone: true } } } });
      if (r) tracking = { lat: r.lat, lng: r.lng, locatedAt: r.locatedAt, vehicle: r.vehicle, phone: r.user.phone };
    }
    // Internal split (commission, cook and rider shares) isn't the customer's business.
    return { ...o, commission: undefined, cookEarning: undefined, riderPayout: undefined, tracking };
  }

  async review(user: AuthUser, id: string, stars: number, text?: string) {
    const o = await this.prisma.order.findFirst({ where: { id, customerId: user.id }, include: { review: true, items: true } });
    if (!o) throw new NotFoundException();
    if (o.status !== 'DELIVERED') throw new BadRequestException('You can rate an order after it’s delivered.');
    if (o.review) throw new BadRequestException('You have already rated this order.');
    const dishId = o.items[0]?.dishId ?? null;
    await this.prisma.$transaction(async (tx) => {
      await tx.review.create({ data: { orderId: id, userId: user.id, cookId: o.cookId, dishId, stars, text } });
      const agg = await tx.review.aggregate({ where: { cookId: o.cookId }, _avg: { stars: true }, _count: true });
      await tx.cookProfile.update({ where: { id: o.cookId }, data: { rating: Math.round((agg._avg.stars || 0) * 10) / 10, ratingCount: agg._count } });
      if (dishId) {
        const d = await tx.review.aggregate({ where: { dishId }, _avg: { stars: true }, _count: true });
        await tx.dish.update({ where: { id: dishId }, data: { rating: Math.round((d._avg.stars || 0) * 10) / 10, ratingCount: d._count } });
      }
    });
    const cook = await this.prisma.cookProfile.findUniqueOrThrow({ where: { id: o.cookId } });
    await this.notify.notify(cook.userId, 'COOK', `New ${stars}-star review`, text ? `“${text.slice(0, 80)}”` : `On order ${o.code}`);
    return this.get(user, id);
  }

  async complaint(user: AuthUser, id: string, type: string, text: string, refundRequested: boolean, refundAmount: number) {
    const o = await this.prisma.order.findFirst({ where: { id, customerId: user.id } });
    if (!o) throw new NotFoundException();
    return this.prisma.complaint.create({ data: { orderId: id, userId: user.id, type, text, refundRequested, refundAmount: Math.min(refundAmount, o.total) } });
  }

  complaints(user: AuthUser) { return this.prisma.complaint.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, include: { order: { select: { code: true } } } }); }

  /* ---------- operations team (admin panel) ---------- */
  /** Cancel any order that hasn't been delivered, refund online payments and tell everyone involved. */
  async adminCancel(orderId: string, reason: string) {
    const o = await this.prisma.order.findUnique({ where: { id: orderId }, include: { cook: true } });
    if (!o) throw new NotFoundException();
    if (o.status === 'DELIVERED' || o.status === 'CANCELLED') throw new BadRequestException('This order is already finished.');
    await this.transition(o.id, 'CANCELLED', null);
    await this.refund(o.id, `Cancelled by MaaCrave: ${reason}`);
    await this.notify.notify(o.cook.userId, 'COOK', `Order ${o.code} cancelled by MaaCrave`, reason);
    if (o.riderId) await this.notify.notify(o.riderId, 'RIDER', `Order ${o.code} cancelled`, 'Don’t deliver this order. ' + reason);
  }

  /** Take an order back from a rider who hasn't picked it up, and offer it to nearby riders again. */
  async releaseRider(orderId: string) {
    const o = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!o) throw new NotFoundException();
    if (o.status !== 'RIDER_ASSIGNED' || !o.riderId) throw new BadRequestException('Only orders a rider hasn’t picked up yet can be reassigned.');
    const riderId = o.riderId;
    const group = await this.prisma.order.findMany({ where: { riderId, status: 'RIDER_ASSIGNED', OR: [{ id: o.id }, ...(o.batchId ? [{ batchId: o.batchId }] : [])] }, select: { id: true } });
    await this.prisma.order.updateMany({ where: { id: { in: group.map((g) => g.id) } }, data: { riderId: null } });
    for (const g of group) await this.transition(g.id, 'READY', null);
    await this.notify.notify(riderId, 'RIDER', 'Trip reassigned', `MaaCrave gave ${o.code} to another rider.`);
    await this.offerToRiders(o.cookId, group.length);
  }

  /** Delivered: credit loyalty points, cook stats, close batch when all drops are done. */
  async onDelivered(orderId: string) {
    const o = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, payment: true } });
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: o.customerId }, data: { loyaltyPoints: { increment: Math.floor(o.total / 10) } } });
      await tx.cookProfile.update({ where: { id: o.cookId }, data: { completedOrders: { increment: 1 } } });
      for (const i of o.items) if (i.dishId) await tx.dish.update({ where: { id: i.dishId }, data: { orderCount: { increment: i.quantity } } });
      if (o.payment?.method === 'COD') await tx.payment.update({ where: { orderId }, data: { status: 'PAID' } });
      if (o.batchId) {
        const open = await tx.order.count({ where: { batchId: o.batchId, status: { notIn: ['DELIVERED', 'CANCELLED'] } } });
        if (!open) await tx.batch.update({ where: { id: o.batchId }, data: { status: 'DONE' } });
      }
    });
    if (o.tip && o.riderId) await this.notify.notify(o.riderId, 'RIDER', `You got a ৳${o.tip} tip 🎉`, `From the customer on ${o.code}. Tips are 100% yours.`);
  }
}
