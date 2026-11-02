import { BadRequestException, Body, Controller, Delete, Get, Injectable, Module, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/auth';
import { PrismaService } from '../common/prisma.service';
import { BD_PHONE, DHAKA_AREAS, normalizePhone } from '../common/util';

class UpdateMeDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) name?: string;
  @IsOptional() @IsIn(DHAKA_AREAS) area?: string;
  @IsOptional() @IsIn(['en', 'bn']) language?: string;
  /** Contact number for riders, for people who signed up with email. */
  @IsOptional() @IsString() phone?: string;
}
class AddressDto {
  @IsString() @MinLength(1) @MaxLength(30) label: string;
  @IsIn(DHAKA_AREAS) area: string;
  @IsString() @MinLength(2) @MaxLength(120) road: string;
  @IsString() @MinLength(1) @MaxLength(120) house: string;
  @IsOptional() @IsString() @MaxLength(60) floor?: string;
  @IsOptional() @IsString() @MaxLength(120) landmark?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(20.5) @Max(26.8) lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(88) @Max(92.8) lng?: number;
}
/** A photo sent as a data URL (data:image/jpeg;base64,...). The app compresses it to well under 1.5 MB. */
class DocumentDto {
  @IsIn(['NID_FRONT', 'NID_BACK', 'KITCHEN', 'LICENSE']) kind: string;
  @IsString() @Matches(/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/) @MaxLength(2_000_000) data: string;
}
class ApplyCookDto {
  @IsString() @MinLength(2) @MaxLength(60) displayName: string;
  @IsIn(DHAKA_AREAS) area: string;
  @IsArray() @IsString({ each: true }) specialties: string[];
  @IsOptional() @IsString() experience?: string;
  @IsOptional() @IsString() @MaxLength(200) kitchenInfo?: string;
  @IsOptional() @IsString() hours?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(200) dailyCapacity: number;
  @Matches(/^\d{4}$/) nidLast4: string;
  @IsArray() @ArrayMinSize(2) @ArrayMaxSize(5) @ValidateNested({ each: true }) @Type(() => DocumentDto) documents: DocumentDto[];
}
class ApplyRiderDto {
  @IsIn(['Bicycle', 'Motorbike', 'On foot']) vehicle: string;
  @Matches(/^\d{4}$/) nidLast4: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(4) @ValidateNested({ each: true }) @Type(() => DocumentDto) documents: DocumentDto[];
}
class FavoriteDto { @IsOptional() @IsString() dishId?: string; @IsOptional() @IsString() cookId?: string; }

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, phone: true, email: true, name: true, area: true, language: true, loyaltyPoints: true, referralCode: true, roles: { select: { role: true, status: true, note: true } }, cook: true, rider: true },
    });
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const data: Record<string, unknown> = { ...dto };
    if (dto.phone !== undefined) {
      const me = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
      const phone = normalizePhone(dto.phone);
      if (!BD_PHONE.test(phone)) throw new BadRequestException('Enter a valid Bangladeshi mobile number.');
      if (me.phone && me.phone !== phone && !me.email) throw new BadRequestException('Your sign-in number can’t be changed here.');
      const taken = await this.prisma.user.findFirst({ where: { phone, id: { not: userId } } });
      if (taken) throw new BadRequestException('This number is already used by another account.');
      data.phone = phone;
    }
    if (dto.name) {
      const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
      if (!u.referralCode) data.referralCode = dto.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) + userId.slice(-4).toUpperCase();
    }
    await this.prisma.user.update({ where: { id: userId }, data });
    return this.me(userId);
  }

  addresses(userId: string) { return this.prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] }); }

  async addAddress(userId: string, dto: AddressDto) {
    const count = await this.prisma.address.count({ where: { userId } });
    const isDefault = dto.isDefault || count === 0;
    return this.prisma.$transaction(async (tx) => {
      if (isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.address.create({ data: { ...dto, isDefault, userId } });
    });
  }

  async setDefault(userId: string, id: string) {
    const a = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!a) throw new NotFoundException();
    await this.prisma.$transaction([
      this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
      this.prisma.address.update({ where: { id }, data: { isDefault: true } }),
    ]);
    return this.addresses(userId);
  }

  async deleteAddress(userId: string, id: string) {
    await this.prisma.address.deleteMany({ where: { id, userId } });
    return this.addresses(userId);
  }

  private docs(userId: string, role: 'COOK' | 'RIDER', list: DocumentDto[]) {
    return list.map((d) => {
      const [, mime, data] = /^data:(image\/[a-z]+);base64,(.+)$/.exec(d.data)!;
      return this.prisma.document.create({ data: { userId, role, kind: d.kind, mime, data } });
    });
  }

  /** Cook application. A rejected applicant can fix and resubmit; the MaaCrave team reviews it in the admin panel. */
  async applyCook(user: AuthUser, dto: ApplyCookDto) {
    const status = user.roles.find((r) => r.role === 'COOK')?.status;
    if (status === 'PENDING' || status === 'APPROVED') throw new BadRequestException('Your cook application is already submitted.');
    if (status === 'SUSPENDED') throw new BadRequestException('Your cook account is suspended. Contact support.');
    if (!dto.documents.some((d) => d.kind === 'NID_FRONT')) throw new BadRequestException('Add a photo of the front of your NID.');
    if (!dto.documents.some((d) => d.kind === 'KITCHEN')) throw new BadRequestException('Add at least one photo of your kitchen.');
    const { nidLast4, documents, ...rest } = dto;
    await this.prisma.$transaction([
      this.prisma.document.deleteMany({ where: { userId: user.id, role: 'COOK' } }),
      user.cook
        ? this.prisma.cookProfile.update({ where: { userId: user.id }, data: { ...rest, nidLast4 } })
        : this.prisma.cookProfile.create({ data: { ...rest, nidLast4, userId: user.id } }),
      ...this.docs(user.id, 'COOK', documents),
      this.prisma.userRole.upsert({ where: { userId_role: { userId: user.id, role: 'COOK' } }, update: { status: 'PENDING', note: null }, create: { userId: user.id, role: 'COOK' } }),
    ]);
    return this.me(user.id);
  }

  async applyRider(user: AuthUser, dto: ApplyRiderDto) {
    const status = user.roles.find((r) => r.role === 'RIDER')?.status;
    if (status === 'PENDING' || status === 'APPROVED') throw new BadRequestException('Your rider application is already submitted.');
    if (status === 'SUSPENDED') throw new BadRequestException('Your rider account is suspended. Contact support.');
    if (!dto.documents.some((d) => d.kind === 'NID_FRONT')) throw new BadRequestException('Add a photo of the front of your NID.');
    if (dto.vehicle === 'Motorbike' && !dto.documents.some((d) => d.kind === 'LICENSE')) throw new BadRequestException('Add a photo of your driving licence.');
    const { documents, ...rest } = dto;
    await this.prisma.$transaction([
      this.prisma.document.deleteMany({ where: { userId: user.id, role: 'RIDER' } }),
      user.rider
        ? this.prisma.riderProfile.update({ where: { userId: user.id }, data: rest })
        : this.prisma.riderProfile.create({ data: { ...rest, userId: user.id } }),
      ...this.docs(user.id, 'RIDER', documents),
      this.prisma.userRole.upsert({ where: { userId_role: { userId: user.id, role: 'RIDER' } }, update: { status: 'PENDING', note: null }, create: { userId: user.id, role: 'RIDER' } }),
    ]);
    return this.me(user.id);
  }

  /**
   * Account deletion (required by the app stores). Personal data is removed; order records are kept
   * without personal details because cooks, riders and accounting still need them.
   */
  async deleteAccount(userId: string) {
    const live = await this.prisma.order.count({ where: { customerId: userId, status: { notIn: ['DELIVERED', 'CANCELLED'] } } });
    if (live) throw new BadRequestException('You have an order in progress. You can delete your account once it is delivered or cancelled.');
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.pushToken.deleteMany({ where: { userId } }),
      this.prisma.address.deleteMany({ where: { userId } }),
      this.prisma.favorite.deleteMany({ where: { userId } }),
      this.prisma.document.deleteMany({ where: { userId } }),
      this.prisma.cookProfile.updateMany({ where: { userId }, data: { accepting: false } }),
      this.prisma.riderProfile.updateMany({ where: { userId }, data: { online: false } }),
      this.prisma.user.update({ where: { id: userId }, data: { phone: null, email: null, name: 'Deleted user', area: null, referralCode: null, suspended: true, deletedAt: new Date() } }),
    ]);
    return { ok: true };
  }

  favorites(userId: string) {
    return this.prisma.favorite.findMany({ where: { userId }, include: { dish: { include: { cook: true } }, cook: true }, orderBy: { createdAt: 'desc' } });
  }

  async toggleFavorite(userId: string, dto: FavoriteDto) {
    if (!dto.dishId === !dto.cookId) throw new BadRequestException('Send either dishId or cookId.');
    const where = dto.dishId ? { userId, dishId: dto.dishId } : { userId, cookId: dto.cookId };
    const existing = await this.prisma.favorite.findFirst({ where });
    if (existing) { await this.prisma.favorite.delete({ where: { id: existing.id } }); return { saved: false }; }
    await this.prisma.favorite.create({ data: where });
    return { saved: true };
  }
}

@Controller('me')
export class UsersController {
  constructor(private users: UsersService) {}
  @Get() me(@CurrentUser() u: AuthUser) { return this.users.me(u.id); }
  @Patch() update(@CurrentUser() u: AuthUser, @Body() dto: UpdateMeDto) { return this.users.updateMe(u.id, dto); }
  @Get('addresses') addresses(@CurrentUser() u: AuthUser) { return this.users.addresses(u.id); }
  @Post('addresses') addAddress(@CurrentUser() u: AuthUser, @Body() dto: AddressDto) { return this.users.addAddress(u.id, dto); }
  @Post('addresses/:id/default') setDefault(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.users.setDefault(u.id, id); }
  @Delete('addresses/:id') deleteAddress(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.users.deleteAddress(u.id, id); }
  @Post('apply/cook') applyCook(@CurrentUser() u: AuthUser, @Body() dto: ApplyCookDto) { return this.users.applyCook(u, dto); }
  @Post('apply/rider') applyRider(@CurrentUser() u: AuthUser, @Body() dto: ApplyRiderDto) { return this.users.applyRider(u, dto); }
  @Delete() deleteAccount(@CurrentUser() u: AuthUser) { return this.users.deleteAccount(u.id); }
  @Get('favorites') favorites(@CurrentUser() u: AuthUser) { return this.users.favorites(u.id); }
  @Post('favorites/toggle') toggle(@CurrentUser() u: AuthUser, @Body() dto: FavoriteDto) { return this.users.toggleFavorite(u.id, dto); }
}

@Module({ providers: [UsersService], controllers: [UsersController] })
export class UsersModule {}
