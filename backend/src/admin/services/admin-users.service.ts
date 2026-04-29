import { randomBytes } from 'crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../prisma/prisma.service';
import { ListUsersDto } from '../dto/list-users.dto';
import { AdminUpdateUserDto } from '../dto/update-user.dto';
import { AuditService } from './audit.service';

const USER_LIST_SELECT = {
  id: true,
  email: true,
  displayName: true,
  currency: true,
  locale: true,
  role: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListUsersDto) {
    const where: Prisma.UserWhereInput = {};
    if (!query.includeDeleted) {
      where.deletedAt = null;
    }
    if (query.role) {
      where.role = query.role;
    }
    if (query.q) {
      const q = query.q.trim();
      if (q.length > 0) {
        where.OR = [
          { email: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ];
      }
    }
    const take = query.take ?? 50;
    const skip = query.skip ?? 0;
    const orderBy = {
      [query.sort ?? 'createdAt']: query.order ?? 'desc',
    } as Prisma.UserOrderByWithRelationInput;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy,
        take,
        skip,
        select: USER_LIST_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, take, skip };
  }

  async getDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...USER_LIST_SELECT,
        settings: true,
        _count: {
          select: {
            expenses: true,
            budgets: true,
            categoryConfigs: true,
            refreshTokens: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async listExpenses(userId: string, take = 50, skip = 0) {
    await this.assertExists(userId);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take,
        skip,
      }),
      this.prisma.expense.count({ where: { userId } }),
    ]);
    return { items, total, take, skip };
  }

  async listBudgets(userId: string) {
    await this.assertExists(userId);
    return this.prisma.monthlyBudget.findMany({
      where: { userId },
      orderBy: { monthKey: 'desc' },
    });
  }

  async update(
    id: string,
    actorId: string,
    dto: AdminUpdateUserDto,
    ctx: { ip?: string | null; userAgent?: string | null },
  ) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    const before = {
      email: existing.email,
      displayName: existing.displayName,
      currency: existing.currency,
      locale: existing.locale,
      role: existing.role,
    };
    let user;
    try {
      user = await this.prisma.user.update({
        where: { id },
        data: {
          email: dto.email,
          displayName: dto.displayName,
          currency: dto.currency,
          locale: dto.locale,
          role: dto.role,
        },
        select: USER_LIST_SELECT,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException('Email already in use');
      }
      throw err;
    }
    await this.audit.record({
      actorId,
      action:
        dto.role && dto.role !== before.role
          ? 'user.role_change'
          : 'user.update',
      targetType: 'user',
      targetId: id,
      metadata: {
        before,
        after: {
          email: user.email,
          displayName: user.displayName,
          currency: user.currency,
          locale: user.locale,
          role: user.role,
        },
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return user;
  }

  async softDelete(
    id: string,
    actorId: string,
    ctx: { ip?: string | null; userAgent?: string | null },
  ) {
    if (id === actorId) {
      throw new ForbiddenException('Refusing to soft-delete the current admin');
    }
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    if (existing.deletedAt) {
      // idempotent
      return { id, deletedAt: existing.deletedAt };
    }
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { deletedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    await this.audit.record({
      actorId,
      action: 'user.soft_delete',
      targetType: 'user',
      targetId: id,
      metadata: { email: existing.email },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { id, deletedAt: now };
  }

  async restore(
    id: string,
    actorId: string,
    ctx: { ip?: string | null; userAgent?: string | null },
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    if (!existing.deletedAt) {
      return { id, deletedAt: null };
    }
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });
    await this.audit.record({
      actorId,
      action: 'user.restore',
      targetType: 'user',
      targetId: id,
      metadata: { email: existing.email },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { id, deletedAt: null };
  }

  /**
   * Generates a one-time temporary password, persists its bcrypt hash, revokes
   * all active refresh tokens for the user (forcing every device to re-auth),
   * and returns the plaintext password to the admin so they can hand it over.
   */
  async resetPassword(
    id: string,
    actorId: string,
    ctx: { ip?: string | null; userAgent?: string | null },
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    if (existing.deletedAt) {
      throw new BadRequestException('Cannot reset password for a deleted user');
    }
    const tempPassword = randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    await this.audit.record({
      actorId,
      action: 'user.password_reset',
      targetType: 'user',
      targetId: id,
      metadata: { email: existing.email },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { temporaryPassword: tempPassword };
  }

  /** Promote a user — used by the seed CLI and by the admin endpoint. */
  async setRole(id: string, role: UserRole) {
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: USER_LIST_SELECT,
    });
  }

  private async assertExists(id: string) {
    const exists = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('User not found');
    }
  }
}
