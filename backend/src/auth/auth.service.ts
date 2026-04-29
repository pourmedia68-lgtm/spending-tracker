import { randomBytes, createHash } from 'crypto';

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult extends AuthTokens {
  user: { id: string; email: string; displayName: string | null };
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
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: displayName ?? null,
        settings: { create: {} },
      },
    });
    return this.issueTokens(user.id, user.email, user.displayName);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user.id, user.email, user.displayName);
  }

  async loginOrLinkGoogle(profile: {
    sub: string;
    email: string;
    displayName: string | null;
  }): Promise<AuthResult> {
    const byGoogle = await this.prisma.user.findUnique({
      where: { googleSub: profile.sub },
    });
    if (byGoogle) {
      return this.issueTokens(
        byGoogle.id,
        byGoogle.email,
        byGoogle.displayName,
      );
    }
    // Link to an existing email-based account or create a new one.
    const byEmail = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });
    const user = byEmail
      ? await this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            googleSub: profile.sub,
            displayName: byEmail.displayName ?? profile.displayName,
          },
        })
      : await this.prisma.user.create({
          data: {
            email: profile.email,
            googleSub: profile.sub,
            displayName: profile.displayName,
            settings: { create: {} },
          },
        });
    return this.issueTokens(user.id, user.email, user.displayName);
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
    // Rotate: revoke the old token and mint a fresh pair.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.signPair(payload.sub, payload.email);
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
  ): Promise<AuthResult> {
    const tokens = await this.signPair(userId, email);
    return {
      ...tokens,
      user: { id: userId, email, displayName },
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
