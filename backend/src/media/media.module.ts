import { BadRequestException, Body, Controller, ForbiddenException, Get, Global, Injectable, Module, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { IsIn, IsString, Matches, MaxLength } from 'class-validator';
import { AuthUser, CurrentUser, Public } from '../common/auth';
import { PrismaService } from '../common/prisma.service';

class UploadDto {
  @IsIn(['DISH', 'PORTRAIT', 'KITCHEN']) kind: 'DISH' | 'PORTRAIT' | 'KITCHEN';
  @IsString() @Matches(/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/) @MaxLength(1_600_000) data: string;
}

/** Photos cooks take of their food, themselves and their kitchen. Stored in Postgres, served as real images. */
@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  async upload(user: AuthUser, dto: UploadDto) {
    if (!user.cook) throw new ForbiddenException('Only approved cooks can add photos.');
    const recent = await this.prisma.mediaImage.count({ where: { ownerId: user.id, createdAt: { gt: new Date(Date.now() - 86400_000) } } });
    if (recent >= 60) throw new BadRequestException('That’s a lot of photos for one day. Please try again tomorrow.');
    const [, mime, data] = /^data:(image\/[a-z]+);base64,(.+)$/.exec(dto.data)!;
    const m = await this.prisma.mediaImage.create({ data: { ownerId: user.id, kind: dto.kind, mime: mime === 'image/jpg' ? 'image/jpeg' : mime, data }, select: { id: true } });
    return { id: m.id, url: `/media/${m.id}` };
  }

  get(id: string) { return this.prisma.mediaImage.findFirst({ where: { id, removed: false }, select: { mime: true, data: true } }); }

  /** Is this photo the cook's own (so they can't attach someone else's)? */
  async owns(userId: string, id?: string | null) {
    if (!id) return true;
    return !!(await this.prisma.mediaImage.findFirst({ where: { id, ownerId: userId, removed: false }, select: { id: true } }));
  }
}

@Controller('media')
export class MediaController {
  constructor(private m: MediaService) {}
  @Post() upload(@CurrentUser() u: AuthUser, @Body() dto: UploadDto) { return this.m.upload(u, dto); }
  @Public() @Get(':id') async get(@Param('id') id: string, @Res() res: Response) {
    const r = await this.m.get(id);
    if (!r) return res.status(404).end();
    res.setHeader('Content-Type', r.mime);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return res.end(Buffer.from(r.data, 'base64'));
  }
}

@Global()
@Module({ providers: [MediaService], controllers: [MediaController], exports: [MediaService] })
export class MediaModule {}
