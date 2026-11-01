import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from './prisma.service';

export type AuthUser = Prisma.UserGetPayload<{ include: { roles: true; cook: true; rider: true } }>;

const IS_PUBLIC = 'isPublic';
const ROLES = 'roles';
export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user);

export function hasRole(user: AuthUser, role: Role) {
  return user.roles.some((r) => r.role === role && r.status === 'APPROVED');
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string; typ: string }>(token);
        if (payload.typ === 'access') {
          const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, include: { roles: true, cook: true, rider: true } });
          if (user && !user.suspended) req.user = user;
        }
      } catch {
        /* invalid or expired token: treated as anonymous */
      }
    }
    if (isPublic) return true;
    if (!req.user) throw new UnauthorizedException('Please sign in again.');
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES, [ctx.getHandler(), ctx.getClass()]);
    if (roles?.length && !roles.some((r) => hasRole(req.user, r))) {
      throw new ForbiddenException('Your account is not approved for this mode yet.');
    }
    return true;
  }
}
