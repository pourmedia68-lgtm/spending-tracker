import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  function makeService(prismaMock: Partial<PrismaService>): AuthService {
    const config = {
      get: (key: string): string | undefined => {
        switch (key) {
          case 'JWT_ACCESS_TTL':
            return '15m';
          case 'JWT_REFRESH_TTL':
            return '30d';
          default:
            return undefined;
        }
      },
      getOrThrow: (): string => 'test-secret',
    } as unknown as ConfigService;
    const jwt = {
      signAsync: jest.fn().mockResolvedValue('token'),
      verifyAsync: jest.fn(),
    } as unknown as JwtService;
    return new AuthService(prismaMock as PrismaService, jwt, config);
  }

  describe('register', () => {
    it('maps Prisma P2002 unique-constraint errors to ConflictException', async () => {
      const prisma = {
        user: {
          create: jest
            .fn()
            .mockRejectedValue(
              new Prisma.PrismaClientKnownRequestError(
                'Unique constraint failed on the fields: (`email`)',
                { code: 'P2002', clientVersion: 'test' },
              ),
            ),
        },
        refreshToken: { create: jest.fn() },
      } as unknown as PrismaService;
      const service = makeService(prisma);
      await expect(
        service.register('user@example.com', 'password123'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('hashes the password and creates the user', async () => {
      const create = jest
        .fn()
        .mockResolvedValue({ id: 'u1', email: 'u@e.co', displayName: null });
      const prisma = {
        user: { create },
        refreshToken: { create: jest.fn() },
      } as unknown as PrismaService;
      const service = makeService(prisma);
      await service.register('u@e.co', 'password123', 'Alice');
      const data = create.mock.calls[0][0].data as {
        passwordHash: string;
        email: string;
        displayName: string | null;
      };
      expect(data.email).toBe('u@e.co');
      expect(data.displayName).toBe('Alice');
      expect(await bcrypt.compare('password123', data.passwordHash)).toBe(true);
    });
  });

  describe('login', () => {
    it('rejects when the user has no password (Google-only account)', async () => {
      const prisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'u1',
            passwordHash: null,
          }),
        },
        refreshToken: { create: jest.fn() },
      } as unknown as PrismaService;
      const service = makeService(prisma);
      await expect(
        service.login('u@e.co', 'password123'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects on bad password', async () => {
      const passwordHash = await bcrypt.hash('actual', 10);
      const prisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: 'u1', passwordHash }),
        },
        refreshToken: { create: jest.fn() },
      } as unknown as PrismaService;
      const service = makeService(prisma);
      await expect(service.login('u@e.co', 'wrong')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('rejects soft-deleted users and revokes their remaining tokens', async () => {
      const updateMany = jest.fn().mockResolvedValue({ count: 0 });
      const prisma = {
        refreshToken: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'rt1',
            revokedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
          }),
          update: jest.fn().mockResolvedValue({}),
          updateMany,
          create: jest.fn(),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'u1',
            email: 'u@e.co',
            deletedAt: new Date(),
          }),
        },
      } as unknown as PrismaService;
      const service = makeService(prisma);
      const jwt = (service as unknown as { jwt: JwtService }).jwt;
      (jwt.verifyAsync as jest.Mock).mockResolvedValue({
        sub: 'u1',
        email: 'u@e.co',
      });
      await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      // Both the rotated token and any other live tokens for the user are revoked.
      expect(updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
