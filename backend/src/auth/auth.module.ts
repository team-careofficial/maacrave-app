import { BadRequestException, Body, Controller, HttpCode, Injectable, Module, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';
import { Public } from '../common/auth';
import { PrismaService } from '../common/prisma.service';
import { BD_PHONE, digits, normalizePhone, randomToken, sha256 } from '../common/util';
import { EmailService } from '../sms/email.service';
import { SmsService } from '../sms/sms.service';

const OTP_TTL_MS = 5 * 60_000;
const REFRESH_TTL_MS = 30 * 24 * 3600_000;

/** Sign in with a mobile number (code by SMS) or an email address (code by email). Send exactly one. */
class RequestOtpDto { @IsOptional() @IsString() phone?: string; @IsOptional() @IsEmail() email?: string; }
class VerifyOtpDto extends RequestOtpDto { @IsString() @Length(6, 6) code: string; }

type Target = { kind: 'phone' | 'email'; value: string };
class RefreshDto { @IsString() refreshToken: string; }
class GoogleDto { @IsString() @Length(100, 5000) idToken: string; }

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private sms: SmsService, private email: EmailService) {}

  private hashOtp(target: string, code: string) { return sha256(`${target}:${code}:${process.env.OTP_SECRET}`); }

  private target(dto: RequestOtpDto): Target {
    if (dto.email) return { kind: 'email', value: dto.email.trim().toLowerCase() };
    const phone = normalizePhone(dto.phone || '');
    if (!BD_PHONE.test(phone)) throw new BadRequestException('Enter a valid Bangladeshi mobile number or an email address.');
    return { kind: 'phone', value: phone };
  }

  async requestOtp(dto: RequestOtpDto) {
    const t = this.target(dto);
    const recent = await this.prisma.otpCode.count({ where: { target: t.value, createdAt: { gt: new Date(Date.now() - 10 * 60_000) } } });
    if (recent >= 3) throw new BadRequestException('Too many codes requested. Please wait 10 minutes.');
    const code = digits(6);
    await this.prisma.otpCode.create({ data: { target: t.value, codeHash: this.hashOtp(t.value, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) } });
    if (t.kind === 'email') await this.email.sendCode(t.value, code);
    else await this.sms.send(t.value, `Your MaaCrave code is ${code}. It expires in 5 minutes. Don't share it with anyone.`);
    return { [t.kind]: t.value, expiresInSeconds: OTP_TTL_MS / 1000 };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const t = this.target(dto);
    const otp = await this.prisma.otpCode.findFirst({ where: { target: t.value, consumedAt: null }, orderBy: { createdAt: 'desc' } });
    if (!otp || otp.expiresAt < new Date()) throw new BadRequestException('This code has expired. Request a new one.');
    if (otp.attempts >= 5) throw new BadRequestException('Too many attempts. Request a new code.');
    if (otp.codeHash !== this.hashOtp(t.value, dto.code)) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('That code isn’t right.');
    }
    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    const where = t.kind === 'email' ? { email: t.value } : { phone: t.value };
    let user = await this.prisma.user.findUnique({ where });
    const isNew = !user;
    if (!user) {
      user = await this.prisma.user.create({ data: { ...where, roles: { create: { role: 'CUSTOMER', status: 'APPROVED' } } } });
    }
    if (user.suspended) throw new UnauthorizedException('This account is suspended. Contact support.');
    return { ...(await this.issue(user.id)), isNew: isNew || !user.name };
  }

  /**
   * “Continue with Google”. The ID token is checked with Google, must be issued for one of our
   * OAuth client IDs (GOOGLE_CLIENT_IDS) and carry a verified email.
   */
  async google(idToken: string) {
    const allowed = (process.env.GOOGLE_CLIENT_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!allowed.length) throw new BadRequestException('Google sign-in is not set up yet. Use your mobile number or email.');
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    const info = (await res.json()) as { aud?: string; email?: string; email_verified?: string | boolean; exp?: string; iss?: string };
    const verified = info.email_verified === true || info.email_verified === 'true';
    if (!res.ok || !info.email || !verified || !allowed.includes(info.aud || '') || !['accounts.google.com', 'https://accounts.google.com'].includes(info.iss || '') || Number(info.exp) * 1000 < Date.now()) {
      throw new UnauthorizedException('Google sign-in failed. Please try again.');
    }
    const email = info.email.toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { email } });
    const isNew = !user;
    if (!user) user = await this.prisma.user.create({ data: { email, roles: { create: { role: 'CUSTOMER', status: 'APPROVED' } } } });
    if (user.suspended) throw new UnauthorizedException('This account is suspended. Contact support.');
    return { ...(await this.issue(user.id)), isNew: isNew || !user.name };
  }

  async issue(userId: string) {
    const accessToken = await this.jwt.signAsync({ sub: userId, typ: 'access' }, { expiresIn: '15m' });
    const refreshToken = randomToken();
    await this.prisma.refreshToken.create({ data: { userId, tokenHash: sha256(refreshToken), expiresAt: new Date(Date.now() + REFRESH_TTL_MS) } });
    return { accessToken, refreshToken };
  }

  async refresh(token: string) {
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (!row || row.revokedAt || row.expiresAt < new Date()) throw new UnauthorizedException('Session expired. Please sign in again.');
    await this.prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    return this.issue(row.userId);
  }

  async logout(token: string) {
    await this.prisma.refreshToken.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } });
    return { ok: true };
  }
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public() @Throttle({ default: { limit: 5, ttl: 60_000 } }) @Post('otp/request') @HttpCode(200)
  request(@Body() dto: RequestOtpDto) { return this.auth.requestOtp(dto); }

  @Public() @Throttle({ default: { limit: 10, ttl: 60_000 } }) @Post('otp/verify') @HttpCode(200)
  verify(@Body() dto: VerifyOtpDto) { return this.auth.verifyOtp(dto); }

  @Public() @Throttle({ default: { limit: 10, ttl: 60_000 } }) @Post('google') @HttpCode(200)
  google(@Body() dto: GoogleDto) { return this.auth.google(dto.idToken); }

  @Public() @Post('refresh') @HttpCode(200)
  refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }

  @Public() @Post('logout') @HttpCode(200)
  logout(@Body() dto: RefreshDto) { return this.auth.logout(dto.refreshToken); }
}

@Module({ providers: [AuthService, SmsService, EmailService], controllers: [AuthController] })
export class AuthModule {}
