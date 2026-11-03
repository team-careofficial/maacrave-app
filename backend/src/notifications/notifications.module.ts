import { BadRequestException, Body, Controller, Get, Global, Injectable, Logger, Module, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsIn, IsString, MaxLength } from 'class-validator';
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

const ROLES: Role[] = ['CUSTOMER', 'COOK', 'RIDER'];
const roleOf = (r?: string): Role => { if (r && !ROLES.includes(r as Role)) throw new BadRequestException('Unknown role'); return (r as Role) || 'CUSTOMER'; };

class PushTokenDto {
  @IsString() @MaxLength(300) token: string;
  @IsIn(['ios', 'android', 'web']) platform: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('role') r?: string) {
    return this.prisma.notification.findMany({ where: { userId: user.id, role: roleOf(r) }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  @Post('read-all')
  async readAll(@CurrentUser() user: AuthUser, @Query('role') r?: string) {
    await this.prisma.notification.updateMany({ where: { userId: user.id, role: roleOf(r), read: false }, data: { read: true } });
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
