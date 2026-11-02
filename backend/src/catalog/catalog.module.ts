import { Controller, Get, Injectable, Module, NotFoundException, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '@prisma/client';
import { Public } from '../common/auth';
import { PrismaService } from '../common/prisma.service';
import { CATEGORIES, DHAKA_AREAS } from '../common/util';

const cookPublic = { id: true, displayName: true, area: true, intro: true, specialties: true, rating: true, ratingCount: true, completedOrders: true, hours: true, accepting: true, lat: true, lng: true } as const;
const firstName = (n?: string | null) => (n ? n.split(' ')[0] + ((n.split(' ')[1] || '')[0] ? ' ' + n.split(' ')[1][0] + '.' : '') : 'Neighbour');

export function batchFilled(orders: { status: string; items: { quantity: number }[] }[]) {
  return orders.filter((o) => o.status !== 'CANCELLED').reduce((a, o) => a + o.items.reduce((b, i) => b + i.quantity, 0), 0);
}

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  private liveDish(extra: Prisma.DishWhereInput = {}): Prisma.DishWhereInput {
    return { deletedAt: null, available: true, cook: { accepting: true, user: { suspended: false, roles: { some: { role: 'COOK', status: 'APPROVED' } } } }, ...extra };
  }

  async spotlights() {
    const rows = await this.prisma.spotlight.findMany({ where: { active: true }, orderBy: { slot: 'asc' } });
    return rows.map(({ imageData, imageMime: _m, ...r }) => ({ ...r, hasImage: !!imageData }));
  }
  spotlightImage(slot: number) { return this.prisma.spotlight.findUnique({ where: { slot }, select: { imageMime: true, imageData: true } }); }

  async meta() {
    const s = await this.prisma.settings();
    const coupons = await this.prisma.coupon.findMany({ where: { active: true }, select: { code: true, description: true } });
    return { categories: CATEGORIES, areas: DHAKA_AREAS, fees: { serviceFee: s.serviceFee, deliveryFee: s.deliveryFee, batchDeliveryFee: s.batchDeliveryFee, commissionPct: s.commissionPct }, coupons,
      payments: { bkash: !!(process.env.BKASH_APP_KEY && process.env.BKASH_APP_SECRET), card: !!(process.env.SSLCZ_STORE_ID && process.env.SSLCZ_STORE_PASSWORD), cod: true } };
  }

  async dishes(q: { q?: string; category?: string; maxPrice?: string; sort?: string; area?: string; take?: string }) {
    const where = this.liveDish({
      ...(q.category && q.category !== 'budget' ? { category: q.category } : {}),
      ...(q.category === 'budget' ? { price: { lte: 150 } } : {}),
      ...(q.maxPrice ? { price: { lte: Number(q.maxPrice) } } : {}),
      ...(q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { nameBn: { contains: q.q } }, { cook: { displayName: { contains: q.q, mode: 'insensitive' } } }, { cook: { area: { contains: q.q, mode: 'insensitive' } } }] } : {}),
    });
    const orderBy: Prisma.DishOrderByWithRelationInput[] =
      q.sort === 'price' ? [{ price: 'asc' }] : q.sort === 'rating' ? [{ rating: 'desc' }, { ratingCount: 'desc' }] : q.sort === 'fast' ? [{ prepMinutes: 'asc' }] : [{ orderCount: 'desc' }, { rating: 'desc' }];
    const list = await this.prisma.dish.findMany({ where, orderBy, take: Math.min(Number(q.take) || 60, 100), include: { cook: { select: cookPublic } } });
    if (q.area) list.sort((a, b) => Number(b.cook.area === q.area) - Number(a.cook.area === q.area));
    return list;
  }

  async dish(id: string) {
    const d = await this.prisma.dish.findFirst({ where: { id, deletedAt: null }, include: { cook: { select: cookPublic }, reviews: { orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { name: true } } } } } });
    if (!d) throw new NotFoundException('Dish not found');
    const batch = await this.prisma.batch.findFirst({ where: { dishId: id, status: 'OPEN', cutoffAt: { gt: new Date() } }, include: { orders: { include: { items: true } } }, orderBy: { cutoffAt: 'asc' } });
    return { ...d, reviews: d.reviews.map((r) => ({ ...r, user: { name: firstName(r.user.name) } })), openBatch: batch ? this.shapeBatch(batch) : null };
  }

  cooks(q?: string) {
    return this.prisma.cookProfile.findMany({
      where: { user: { suspended: false, roles: { some: { role: 'COOK', status: 'APPROVED' } } }, ...(q ? { OR: [{ displayName: { contains: q, mode: 'insensitive' } }, { area: { contains: q, mode: 'insensitive' } }] } : {}) },
      select: cookPublic, orderBy: [{ rating: 'desc' }, { completedOrders: 'desc' }], take: 60,
    });
  }

  async cook(id: string) {
    const c = await this.prisma.cookProfile.findUnique({ where: { id }, select: { ...cookPublic, dishes: { where: { deletedAt: null }, orderBy: { orderCount: 'desc' } } } });
    if (!c) throw new NotFoundException('Cook not found');
    const reviews = await this.prisma.review.findMany({ where: { cookId: id }, orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { name: true } }, dish: { select: { name: true } } } });
    const batches = await this.prisma.batch.findMany({ where: { cookId: id, status: 'OPEN', cutoffAt: { gt: new Date() } }, include: { orders: { include: { items: true } }, cook: { select: cookPublic }, dish: true } });
    return { ...c, reviews: reviews.map((r) => ({ ...r, user: { name: firstName(r.user.name) } })), openBatches: batches.map((b) => this.shapeBatch(b)) };
  }

  shapeBatch(b: Prisma.BatchGetPayload<{ include: { orders: { include: { items: true } } } }> & { cook?: unknown; dish?: unknown }, viewerId?: string) {
    const { orders, ...rest } = b;
    const live = orders.filter((o) => o.status !== 'CANCELLED');
    const mine = viewerId ? live.find((o) => o.customerId === viewerId) : undefined;
    return { ...rest, filled: batchFilled(orders), participants: live.length, myOrderId: mine?.id ?? null, myPortions: mine ? mine.items.reduce((a, i) => a + i.quantity, 0) : 0 };
  }

  async batches(filter: string | undefined, area: string | undefined, viewerId?: string) {
    const now = new Date();
    let where: Prisma.BatchWhereInput = { status: 'OPEN', cutoffAt: { gt: now } };
    if (filter === 'soon') where = { status: 'OPEN', cutoffAt: { gt: now, lt: new Date(Date.now() + 3600_000) } };
    if (filter === 'near' && area) where = { ...where, area };
    if (filter === 'all') where = { status: { in: ['OPEN', 'FULL', 'CONFIRMED', 'COOKING', 'READY'] } };
    if (filter === 'mine' && viewerId) where = { orders: { some: { customerId: viewerId, status: { not: 'CANCELLED' } } } };
    const list = await this.prisma.batch.findMany({ where, orderBy: { cutoffAt: 'asc' }, take: 60, include: { orders: { include: { items: true } }, cook: { select: cookPublic }, dish: true } });
    return list.map((b) => this.shapeBatch(b, viewerId));
  }

  async batch(id: string, viewerId?: string) {
    const b = await this.prisma.batch.findUnique({ where: { id }, include: { orders: { include: { items: true, customer: { select: { name: true } } } }, cook: { select: cookPublic }, dish: true } });
    if (!b) throw new NotFoundException('Group order not found');
    const who = b.orders.filter((o) => o.status !== 'CANCELLED').map((o) => ({ name: o.customerId === viewerId ? 'You' : firstName(o.customer.name), portions: o.items.reduce((a, i) => a + i.quantity, 0) }));
    return { ...this.shapeBatch(b, viewerId), who };
  }
}

@Public()
@Controller()
export class CatalogController {
  constructor(private catalog: CatalogService) {}
  @Get('health') health() { return { ok: true, time: new Date().toISOString() }; }
  @Get('meta') meta() { return this.catalog.meta(); }
  @Get('spotlights') spotlights() { return this.catalog.spotlights(); }
  /** Spotlight pictures are served as real image files so phones can cache them. */
  @Get('spotlights/:slot/image') async spotlightImage(@Param('slot') slot: string, @Res() res: Response) {
    const r = await this.catalog.spotlightImage(Number(slot));
    if (!r?.imageData || !r.imageMime) return res.status(404).end();
    res.setHeader('Content-Type', r.imageMime);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return res.end(Buffer.from(r.imageData, 'base64'));
  }
  @Get('dishes') dishes(@Query() q: Record<string, string>) { return this.catalog.dishes(q); }
  @Get('dishes/:id') dish(@Param('id') id: string) { return this.catalog.dish(id); }
  @Get('cooks') cooks(@Query('q') q?: string) { return this.catalog.cooks(q); }
  @Get('cooks/:id') cook(@Param('id') id: string) { return this.catalog.cook(id); }
}

@Module({ providers: [CatalogService], controllers: [CatalogController], exports: [CatalogService] })
export class CatalogModule {}
