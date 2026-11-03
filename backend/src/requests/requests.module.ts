import { BadRequestException, Body, Controller, Get, HttpCode, Injectable, Module, NotFoundException, Param, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/auth';
import { PrismaService } from '../common/prisma.service';
import { CATEGORIES } from '../common/util';
import { NotificationsService } from '../notifications/notifications.module';

class CreateRequestDto {
  @IsString() @MinLength(3) @MaxLength(60) dishName: string;
  @IsIn(CATEGORIES) category: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(60) portions: number;
  @Type(() => Number) @IsInt() @Min(50) @Max(2000) budgetPerPortion: number;
  @IsDateString() neededAt: string;
  @IsString() addressId: string;
  @IsIn(['Mild', 'Medium', 'Hot']) spice: string;
  @IsIn(['Low oil', 'Normal', 'Rich']) oil: string;
  @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(30, { each: true }) diet: string[];
  @IsOptional() @IsString() @MaxLength(120) exclusions?: string;
  @IsOptional() @IsString() @MaxLength(120) allergies?: string;
  @IsOptional() @IsString() @MaxLength(300) notes?: string;
  @IsBoolean() allowGroup: boolean;
}

@Injectable()
export class RequestsService {
  constructor(private prisma: PrismaService, private notify: NotificationsService) {}

  async create(user: AuthUser, dto: CreateRequestDto) {
    const address = await this.prisma.address.findFirst({ where: { id: dto.addressId, userId: user.id } });
    if (!address) throw new BadRequestException('Choose a delivery address.');
    const neededAt = new Date(dto.neededAt);
    if (neededAt.getTime() < Date.now() + 60 * 60_000) throw new BadRequestException('Give cooks at least one hour.');
    if (neededAt.getTime() > Date.now() + 7 * 86400_000) throw new BadRequestException('Requests can be up to 7 days ahead.');
    const open = await this.prisma.foodRequest.count({ where: { customerId: user.id, status: { in: ['OPEN', 'PROPOSALS'] } } });
    if (open >= 5) throw new BadRequestException('You can have up to 5 open requests at a time.');
    const req = await this.prisma.foodRequest.create({ data: { ...dto, neededAt, area: address.area, customerId: user.id } });
    const cooks = await this.prisma.cookProfile.findMany({ where: { area: address.area, accepting: true, userId: { not: user.id }, user: { roles: { some: { role: 'COOK', status: 'APPROVED' } } } }, select: { userId: true }, take: 50 });
    await Promise.all(cooks.map((c) => this.notify.notify(c.userId, 'COOK', 'New food request nearby', `${dto.portions}× ${dto.dishName} · up to ৳${dto.budgetPerPortion} each`)));
    return req;
  }

  mine(user: AuthUser) {
    return this.prisma.foodRequest.findMany({
      where: { customerId: user.id }, orderBy: { createdAt: 'desc' }, take: 50,
      include: { proposals: { include: { cook: { select: { id: true, displayName: true, area: true, rating: true, ratingCount: true } } }, orderBy: { pricePerPortion: 'asc' } }, order: { select: { id: true, code: true, status: true } } },
    });
  }

  async cancel(user: AuthUser, id: string) {
    const r = await this.prisma.foodRequest.findFirst({ where: { id, customerId: user.id } });
    if (!r) throw new NotFoundException();
    if (!['OPEN', 'PROPOSALS'].includes(r.status)) throw new BadRequestException('This request can’t be cancelled any more.');
    await this.prisma.foodRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
    return this.mine(user);
  }

  async decline(user: AuthUser, id: string, proposalId: string) {
    const p = await this.prisma.proposal.findFirst({ where: { id: proposalId, requestId: id, request: { customerId: user.id }, status: 'PENDING' }, include: { cook: true, request: true } });
    if (!p) throw new NotFoundException();
    await this.prisma.proposal.update({ where: { id: p.id }, data: { status: 'REJECTED' } });
    await this.notify.notify(p.cook.userId, 'COOK', 'Proposal declined', `Your price for ${p.request.dishName} was declined.`);
    return this.mine(user);
  }
}

@Controller('requests')
export class RequestsController {
  constructor(private requests: RequestsService) {}
  @Post() create(@CurrentUser() u: AuthUser, @Body() dto: CreateRequestDto) { return this.requests.create(u, dto); }
  @Get() mine(@CurrentUser() u: AuthUser) { return this.requests.mine(u); }
  @Post(':id/cancel') @HttpCode(200) cancel(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.requests.cancel(u, id); }
  @Post(':id/proposals/:pid/decline') @HttpCode(200) decline(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('pid') pid: string) { return this.requests.decline(u, id, pid); }
}

@Module({ providers: [RequestsService], controllers: [RequestsController] })
export class RequestsModule {}
