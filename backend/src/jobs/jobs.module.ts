import { Injectable, Logger, Module } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class JobsService {
  private log = new Logger('Jobs');
  constructor(private prisma: PrismaService, private orders: OrdersService, private notify: NotificationsService) {}

  /** Unpaid online orders release their seat after 20 minutes. */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireUnpaid() {
    const stale = await this.prisma.order.findMany({ where: { status: 'AWAITING_PAYMENT', createdAt: { lt: new Date(Date.now() - 20 * 60_000) } }, select: { id: true } });
    for (const o of stale) await this.orders.transition(o.id, 'CANCELLED', null);
  }

  /**
   * A mother who doesn't answer: orders still waiting after 20 minutes (or, for a pre-order,
   * 3 hours before delivery) are cancelled and refunded so the customer can order elsewhere.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireUnaccepted() {
    const now = Date.now();
    const list = await this.prisma.order.findMany({ where: { status: 'SUBMITTED', OR: [
      { scheduledFor: null, createdAt: { lt: new Date(now - 20 * 60_000) } },
      { scheduledFor: { lt: new Date(now + 3 * 3600_000) } },
    ] }, select: { id: true, code: true, customerId: true, cook: { select: { userId: true, displayName: true } } } });
    for (const o of list) {
      try {
        await this.orders.transition(o.id, 'CANCELLED', null);
        await this.orders.refund(o.id, 'The kitchen did not accept in time');
        await this.notify.notify(o.customerId, 'CUSTOMER', `${o.cook.displayName} couldn’t take ${o.code}`, 'The kitchen didn’t accept in time, so we cancelled it. Any online payment is refunded. Try another mother nearby.');
        await this.notify.notify(o.cook.userId, 'COOK', `Order ${o.code} expired`, 'It wasn’t accepted within 20 minutes. Turn off “Taking orders” when you can’t cook.');
      } catch (e) { this.log.warn(`expire ${o.id}: ${(e as Error).message}`); }
    }
  }

  /** Food is ready but no rider took it: after 5 minutes alert every online rider again. The admin panel lists it after 12. */
  @Cron(CronExpression.EVERY_MINUTE)
  async nudgeRiders() {
    const ready = await this.prisma.order.findMany({ where: { status: 'READY', riderId: null, riderNudgedAt: null, updatedAt: { lt: new Date(Date.now() - 5 * 60_000) } }, select: { id: true, cookId: true } });
    for (const o of ready) {
      await this.prisma.order.update({ where: { id: o.id }, data: { riderNudgedAt: new Date() } });
      await this.orders.offerToRiders(o.cookId, 1, true).catch(() => undefined);
    }
  }

  /** Group orders that miss their minimum by the deadline are cancelled and refunded. */
  @Cron(CronExpression.EVERY_MINUTE)
  async closeBatches() {
    const due = await this.prisma.batch.findMany({ where: { status: { in: ['OPEN', 'FULL'] }, cutoffAt: { lt: new Date() } }, include: { orders: { include: { items: true } }, cook: true } });
    for (const b of due) {
      const live = b.orders.filter((o) => !['CANCELLED', 'AWAITING_PAYMENT'].includes(o.status));
      const filled = live.reduce((a, o) => a + o.items.reduce((s, i) => s + i.quantity, 0), 0);
      if (filled >= b.minPortions) {
        if (b.status === 'FULL') continue; // already waiting for the cook to confirm
        await this.prisma.batch.update({ where: { id: b.id }, data: { status: 'FULL' } });
        await this.notify.notify(b.cook.userId, 'COOK', 'Group order ready to confirm', `${b.title}: ${filled} portions. Confirm to start.`);
        continue;
      }
      await this.prisma.batch.update({ where: { id: b.id }, data: { status: 'FAILED' } });
      for (const o of b.orders.filter((x) => x.status !== 'CANCELLED')) {
        await this.orders.transition(o.id, 'CANCELLED', null);
        await this.orders.refund(o.id, 'Group order did not reach its minimum');
      }
      this.log.log(`Batch ${b.id} failed with ${filled}/${b.minPortions}`);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async expireRequests() {
    await this.prisma.foodRequest.updateMany({ where: { status: { in: ['OPEN', 'PROPOSALS'] }, neededAt: { lt: new Date() } }, data: { status: 'EXPIRED' } });
  }
}

@Module({ imports: [OrdersModule], providers: [JobsService] })
export class JobsModule {}
