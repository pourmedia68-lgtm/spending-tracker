import { randomBytes, createHash } from 'crypto';

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult extends AuthTokens {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    role: UserRole;
  };
}

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly accessTtl: string;
  private readonly refreshTtlMs: number;
  private readonly refreshSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessTtl = config.get<string>('JWT_ACCESS_TTL') ?? '15m';
    this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
    const refreshTtl = config.get<string>('JWT_REFRESH_TTL') ?? '30d';
    this.refreshTtlMs = parseDurationMs(refreshTtl);
  }

  async register(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(password, 12);
    // We rely on the DB unique constraint instead of a check-then-create to
    // avoid a TOCTOU race between two concurrent registrations with the same
    // email returning 500 instead of 409.
    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName: displayName ?? null,
          settings: { create: {} },
        },
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }
    return this.issueTokens(user.id, user.email, user.displayName, user.role);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user.id, user.email, user.displayName, user.role);
  }

  async loginOrLinkGoogle(profile: {
    sub: string;
    email: string;
    displayName: string | null;
  }): Promise<AuthResult> {
    const byGoogle = await this.prisma.user.findUnique({
      where: { googleSub: profile.sub },
    });
    if (byGoogle && !byGoogle.deletedAt) {
      return this.issueTokens(
        byGoogle.id,
        byGoogle.email,
        byGoogle.displayName,
        byGoogle.role,
      );
    }
    if (byGoogle?.deletedAt) {
      throw new UnauthorizedException('Account disabled');
    }
    // Link to an existing email-based account or create a new one.
    const byEmail = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });
    if (byEmail?.deletedAt) {
      throw new UnauthorizedException('Account disabled');
    }
    let user;
    if (byEmail) {
      user = await this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleSub: profile.sub,
          displayName: byEmail.displayName ?? profile.displayName,
        },
      });
    } else {
      try {
        user = await this.prisma.user.create({
          data: {
            email: profile.email,
            googleSub: profile.sub,
            displayName: profile.displayName,
            settings: { create: {} },
          },
        });
      } catch (err) {
        // Lost the race with another OAuth callback for the same Google
        // account / email — fall back to the existing row instead of 500.
        if (!isUniqueConstraintError(err)) {
          throw err;
        }
        const existing = await this.prisma.user.findFirst({
          where: {
            OR: [{ googleSub: profile.sub }, { email: profile.email }],
          },
        });
        if (!existing) {
          throw err;
        }
        user = existing;
      }
    }
    return this.issueTokens(user.id, user.email, user.displayName, user.role);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const tokenHash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    // Rotate: revoke the old token first so a concurrent caller can't reuse it.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    // Refuse to mint new tokens for soft-deleted accounts. We mirror the same
    // checks used in login() / loginOrLinkGoogle() / JwtStrategy.validate() so
    // that revoking access via softDelete cannot be bypassed via /auth/refresh.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.deletedAt) {
      // Defensively revoke any other live tokens for the user so no further
      // refresh attempts succeed even if softDelete races with us.
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Account disabled');
    }
    return this.signPair(user.id, user.email);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = sha256(refreshToken);
    try {
      await this.prisma.refreshToken.update({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      });
    } catch (err) {
      if (
        !(err instanceof Prisma.PrismaClientKnownRequestError) ||
        err.code !== 'P2025'
      ) {
        throw err;
      }
      // Token unknown — silently succeed; logout is idempotent.
    }
  }

  private async issueTokens(
    userId: string,
    email: string,
    displayName: string | null,
    role: UserRole,
  ): Promise<AuthResult> {
    const tokens = await this.signPair(userId, email);
    return {
      ...tokens,
      user: { id: userId, email, displayName, role },
    };
  }

  private async signPair(userId: string, email: string): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: Math.floor(this.refreshTtlMs / 1000),
      jwtid: randomBytes(16).toString('hex'),
    });
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
      },
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: parseDurationMs(this.accessTtl) / 1000,
    };
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}

function parseDurationMs(value: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }
  const n = Number(match[1]);
  const unit = (match[2] ?? 's').toLowerCase();
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return n * multipliers[unit];
}
