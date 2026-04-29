import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
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
    it('rejects when the email is already taken', async () => {
      const prisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: 'u1' }),
          create: jest.fn(),
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
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
          create,
        },
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
});
