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
