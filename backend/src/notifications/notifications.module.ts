import { Body, Controller, Get, Global, Injectable, Logger, Module, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsIn, IsString } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/auth';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class NotificationsService {
  private log = new Logger('Notify');
  constructor(private prisma: PrismaService) {}

  /** Stores an in-app notification and sends a push to the user's devices. Never throws. */
  async notify(userId: string, role: Role, title: string, body: string) {
    try {
      await this.prisma.notification.create({ data: { userId, role, title, body } });
      const tokens = await this.prisma.pushToken.findMany({ where: { userId } });
      if (!tokens.length) return;
      const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
      if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST', headers,
        body: JSON.stringify(tokens.map((t) => ({ to: t.token, title, body, sound: 'default', data: { role } }))),
      });
    } catch (e) {
      this.log.warn(`notify failed: ${(e as Error).message}`);
    }
  }
}

class PushTokenDto {
  @IsString() token: string;
  @IsIn(['ios', 'android', 'web']) platform: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('role') role: Role = 'CUSTOMER') {
    return this.prisma.notification.findMany({ where: { userId: user.id, role }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  @Post('read-all')
  async readAll(@CurrentUser() user: AuthUser, @Query('role') role: Role = 'CUSTOMER') {
    await this.prisma.notification.updateMany({ where: { userId: user.id, role, read: false }, data: { read: true } });
    return { ok: true };
  }

  @Post('push-token')
  async register(@CurrentUser() user: AuthUser, @Body() dto: PushTokenDto) {
    await this.prisma.pushToken.upsert({ where: { token: dto.token }, update: { userId: user.id, platform: dto.platform }, create: { ...dto, userId: user.id } });
    return { ok: true };
  }

  @Post(':id/read')
  async read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } });
    return { ok: true };
  }
}

@Global()
@Module({ providers: [NotificationsService], controllers: [NotificationsController], exports: [NotificationsService] })
export class NotificationsModule {}
