import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { PlansModule } from './plans/plans.module';
import { AuthModule } from './auth/auth.module';
import { BatchesModule } from './batches/batches.module';
import { CatalogModule } from './catalog/catalog.module';
import { AuthGuard } from './common/auth';
import { PrismaModule } from './common/prisma.service';
import { JobsModule } from './jobs/jobs.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { RequestsModule } from './requests/requests.module';
import { RiderModule } from './rider/rider.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true, secret: process.env.JWT_SECRET }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    PrismaModule, NotificationsModule, AuthModule, UsersModule, CatalogModule, BatchesModule, RequestsModule, OrdersModule, KitchenModule, RiderModule, JobsModule, AdminModule, PlansModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
