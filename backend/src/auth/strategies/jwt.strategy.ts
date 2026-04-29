import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { UserRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  // Re-fetches the user on every request so a soft-deleted account or a
  // freshly demoted ADMIN→USER takes effect immediately, without waiting for
  // the access token to expire.
  async validate(
    payload: JwtPayload,
  ): Promise<{ id: string; email: string; role: UserRole }> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User no longer exists');
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
