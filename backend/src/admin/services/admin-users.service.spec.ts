import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AdminUsersService } from './admin-users.service';
import { AuditService } from './audit.service';

type Mocked<T> = { [K in keyof T]: jest.Mock };

const buildPrismaMock = () => {
  const $transaction = jest.fn(async (input: unknown) => {
    if (typeof input === 'function') {
      return (input as (tx: unknown) => unknown)({});
    }
    if (Array.isArray(input)) {
      return Promise.all(input);
    }
    return input;
  });
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    expense: { findMany: jest.fn(), count: jest.fn() },
    monthlyBudget: { findMany: jest.fn() },
    refreshToken: { updateMany: jest.fn() },
    $transaction,
  };
};

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let audit: Mocked<Pick<AuditService, 'record'>>;

  beforeEach(async () => {
    prisma = buildPrismaMock();
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    const module = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(AdminUsersService);
  });

  describe('list', () => {
    it('excludes soft-deleted users by default and applies search', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
      prisma.user.count.mockResolvedValue(1);
      const result = await service.list({
        q: 'foo',
        take: 10,
        skip: 0,
        sort: 'createdAt',
        order: 'desc',
      });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            OR: [
              { email: { contains: 'foo', mode: 'insensitive' } },
              { displayName: { contains: 'foo', mode: 'insensitive' } },
            ],
          }),
          take: 10,
          skip: 0,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toEqual({ items: [{ id: 'u1' }], total: 1, take: 10, skip: 0 });
    });

    it('includes soft-deleted users when includeDeleted=true', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);
      await service.list({ includeDeleted: true });
      const where = prisma.user.findMany.mock.calls[0][0].where;
      expect(where.deletedAt).toBeUndefined();
    });
  });

  describe('softDelete', () => {
    it('refuses to delete the current admin', async () => {
      await expect(
        service.softDelete('me', 'me', { ip: null, userAgent: null }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('marks deletedAt and revokes active refresh tokens, then audits', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        deletedAt: null,
      });
      const result = await service.softDelete('u1', 'admin', {
        ip: '1.2.3.4',
        userAgent: 'jest',
      });
      expect(result.id).toBe('u1');
      expect(result.deletedAt).toBeInstanceOf(Date);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.soft_delete',
          targetId: 'u1',
          actorId: 'admin',
        }),
      );
    });

    it('is idempotent on already-deleted users', async () => {
      const deletedAt = new Date('2026-01-01');
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        deletedAt,
      });
      const result = await service.softDelete('u1', 'admin', {
        ip: null,
        userAgent: null,
      });
      expect(result).toEqual({ id: 'u1', deletedAt });
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('throws NotFound for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.softDelete('u1', 'admin', { ip: null, userAgent: null }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('resetPassword', () => {
    it('returns a temp password, updates hash, revokes sessions, audits', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        deletedAt: null,
      });
      const result = await service.resetPassword('u1', 'admin', {
        ip: null,
        userAgent: null,
      });
      expect(typeof result.temporaryPassword).toBe('string');
      expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(12);
      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.password_reset',
          targetId: 'u1',
        }),
      );
    });
  });

  describe('update', () => {
    it('records role_change action when the role changes', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        displayName: 'A',
        currency: 'EUR',
        locale: 'en',
        role: 'USER',
      });
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        displayName: 'A',
        currency: 'EUR',
        locale: 'en',
        role: 'ADMIN',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await service.update(
        'u1',
        'admin',
        { role: UserRole.ADMIN },
        { ip: null, userAgent: null },
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.role_change' }),
      );
    });
  });
});
