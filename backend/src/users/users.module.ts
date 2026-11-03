import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Injectable, Module, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/auth';
import { PrismaService } from '../common/prisma.service';
import { ALLERGENS, BD_PHONE, DHAKA_AREAS, HEALTH_TAGS, digits, normalizePhone, sha256 } from '../common/util';
import { EmailService } from '../sms/email.service';
import { SmsService } from '../sms/sms.service';
import { Throttle } from '@nestjs/throttler';

// Letters (English or Bangla), spaces, dots, hyphens and apostrophes.
const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,59}$/u;
class UpdateMeDto {
  @IsOptional() @IsString() @Matches(NAME, { message: 'Please enter your real name using letters only.' }) name?: string;
  @IsOptional() @IsIn(DHAKA_AREAS) area?: string;
  @IsOptional() @IsIn(['en', 'bn']) language?: string;
  /** Legacy field from old app versions: numbers must now be verified with a code (/me/contact). */
  @IsOptional() @IsString() phone?: string;
  /** Agree to the Terms of Service and Privacy Policy. */
  @IsOptional() @IsBoolean() acceptTerms?: boolean;
  /** Friend's referral code, accepted once. */
  @IsOptional() @IsString() @MaxLength(20) referralCode?: string;
  /** "আমার খাদ্যাভ্যাস": what they like to eat, and what they must avoid. */
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsIn(HEALTH_TAGS, { each: true }) dietPrefs?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(8) @IsIn(ALLERGENS, { each: true }) allergies?: string[];
}
/** Add or change a phone number or email: a code is sent there first, so only the real owner can attach it. */
class ContactDto { @IsOptional() @IsString() phone?: string; @IsOptional() @IsEmail() @MaxLength(120) email?: string; }
class ContactVerifyDto extends ContactDto { @IsString() @Length(6, 6) code: string; }
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
  @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(40, { each: true }) specialties: string[];
  @IsOptional() @IsString() @MaxLength(300) experience?: string;
  @IsOptional() @IsString() @MaxLength(200) kitchenInfo?: string;
  @IsOptional() @IsString() @MaxLength(30) hours?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(200) dailyCapacity: number;
  @Matches(/^\d{4}$/) nidLast4: string;
  /** BFSA food business registration / licence number, if the kitchen has one. */
  @IsOptional() @IsString() @MaxLength(40) foodLicence?: string;
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
  constructor(private prisma: PrismaService, private sms: SmsService, private email: EmailService) {}

  me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, phone: true, email: true, name: true, area: true, language: true, loyaltyPoints: true, referralCode: true, termsAcceptedAt: true, phoneVerifiedAt: true, createdAt: true, dietPrefs: true, allergies: true, roles: { select: { role: true, status: true, note: true } }, cook: true, rider: true },
    });
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const { phone, acceptTerms, referralCode, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest, ...(rest.name ? { name: rest.name.trim().replace(/\s+/g, ' ') } : {}) };
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (phone !== undefined && normalizePhone(phone) !== me.phone) throw new BadRequestException('Please update the app — your number now needs to be verified with a code.');
    if (acceptTerms) data.termsAcceptedAt = new Date();
    if (referralCode && !me.referredById) {
      const friend = await this.prisma.user.findFirst({ where: { referralCode: referralCode.trim().toUpperCase(), deletedAt: null } });
      if (!friend || friend.id === userId) throw new BadRequestException('That referral code isn’t valid.');
      data.referredById = friend.id;
    }
    if (dto.name && !me.referralCode) {
      // Own code to invite friends, e.g. TANVIR4F2K. Falls back to MC… for names without English letters.
      data.referralCode = (dto.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'MC') + userId.slice(-4).toUpperCase();
      if (await this.prisma.user.findFirst({ where: { referralCode: data.referralCode as string } })) data.referralCode = 'MC' + userId.slice(-8).toUpperCase();
    }
    await this.prisma.user.update({ where: { id: userId }, data });
    return this.me(userId);
  }

  /* ---------- verified contact details ---------- */
  private contactTarget(userId: string, dto: ContactDto) {
    if (!!dto.phone === !!dto.email) throw new BadRequestException('Send a phone number or an email.');
    if (dto.email) return { kind: 'email' as const, value: dto.email.trim().toLowerCase(), key: `contact:${userId}:${dto.email.trim().toLowerCase()}` };
    const phone = normalizePhone(dto.phone!);
    if (!BD_PHONE.test(phone)) throw new BadRequestException('Enter a valid Bangladeshi mobile number.');
    return { kind: 'phone' as const, value: phone, key: `contact:${userId}:${phone}` };
  }

  async requestContactCode(userId: string, dto: ContactDto) {
    const t = this.contactTarget(userId, dto);
    const taken = await this.prisma.user.findFirst({ where: { [t.kind]: t.value, id: { not: userId } } });
    if (taken) throw new BadRequestException(t.kind === 'phone' ? 'This number is already used by another MaaCrave account.' : 'This email is already used by another MaaCrave account.');
    // Until an SMS gateway is set up, numbers are saved without a code (marked unverified) so sign-up isn't blocked.
    if (t.kind === 'phone' && !this.sms.enabled()) {
      await this.prisma.user.update({ where: { id: userId }, data: { phone: t.value, phoneVerifiedAt: null } });
      return { sent: false, saved: true, expiresInSeconds: 0 };
    }
    const recent = await this.prisma.otpCode.count({ where: { target: t.key, createdAt: { gt: new Date(Date.now() - 10 * 60_000) } } });
    if (recent >= 3) throw new BadRequestException('Too many codes requested. Please wait 10 minutes.');
    const code = digits(6);
    await this.prisma.otpCode.create({ data: { target: t.key, codeHash: sha256(`${t.key}:${code}:${process.env.OTP_SECRET}`), expiresAt: new Date(Date.now() + 5 * 60_000) } });
    if (t.kind === 'email') await this.email.sendCode(t.value, code);
    else await this.sms.send(t.value, `Your MaaCrave verification code is ${code}. It expires in 5 minutes. Don't share it with anyone.`);
    return { sent: true, expiresInSeconds: 300 };
  }

  async verifyContact(userId: string, dto: ContactVerifyDto) {
    const t = this.contactTarget(userId, dto);
    const otp = await this.prisma.otpCode.findFirst({ where: { target: t.key, consumedAt: null }, orderBy: { createdAt: 'desc' } });
    if (!otp || otp.expiresAt < new Date()) throw new BadRequestException('This code has expired. Request a new one.');
    if (otp.attempts >= 5) throw new BadRequestException('Too many attempts. Request a new code.');
    if (otp.codeHash !== sha256(`${t.key}:${dto.code}:${process.env.OTP_SECRET}`)) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('That code isn’t right.');
    }
    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    try { await this.prisma.user.update({ where: { id: userId }, data: t.kind === 'phone' ? { phone: t.value, phoneVerifiedAt: new Date() } : { email: t.value } }); }
    catch { throw new BadRequestException('This is already used by another MaaCrave account.'); }
    return this.me(userId);
  }

  /** Signs out every phone and browser (e.g. after losing a phone). The current device signs in again. */
  async signOutEverywhere(userId: string) {
    await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    return { ok: true };
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
    const open = { notIn: ['DELIVERED', 'CANCELLED'] as ('DELIVERED' | 'CANCELLED')[] };
    const live = await this.prisma.order.count({ where: { OR: [{ customerId: userId }, { riderId: userId }, { cook: { userId } }], status: open } });
    if (live) throw new BadRequestException('You have an order in progress. You can delete your account once it is delivered or cancelled.');
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.pushToken.deleteMany({ where: { userId } }),
      this.prisma.address.deleteMany({ where: { userId } }),
      this.prisma.favorite.deleteMany({ where: { userId } }),
      this.prisma.document.deleteMany({ where: { userId } }),
      this.prisma.cookProfile.updateMany({ where: { userId }, data: { accepting: false } }),
      this.prisma.riderProfile.updateMany({ where: { userId }, data: { online: false, lat: null, lng: null } }),
      this.prisma.subscription.updateMany({ where: { customerId: userId, status: { in: ['ACTIVE', 'PAUSED'] } }, data: { status: 'CANCELLED' } }),
      this.prisma.foodRequest.updateMany({ where: { customerId: userId, status: { in: ['OPEN', 'PROPOSALS'] } }, data: { status: 'CANCELLED' } }),
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
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) @Post('contact/request') @HttpCode(200) contactRequest(@CurrentUser() u: AuthUser, @Body() dto: ContactDto) { return this.users.requestContactCode(u.id, dto); }
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) @Post('contact/verify') @HttpCode(200) contactVerify(@CurrentUser() u: AuthUser, @Body() dto: ContactVerifyDto) { return this.users.verifyContact(u.id, dto); }
  @Post('sessions/revoke-all') @HttpCode(200) revokeAll(@CurrentUser() u: AuthUser) { return this.users.signOutEverywhere(u.id); }
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

@Module({ providers: [UsersService, SmsService, EmailService], controllers: [UsersController] })
export class UsersModule {}
