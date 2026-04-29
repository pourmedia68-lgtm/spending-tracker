import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { SyncQueryDto } from '../common/dto/sync-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertBudgetDto } from './dto/upsert-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, query: SyncQueryDto) {
    const where: Prisma.MonthlyBudgetWhereInput = { userId };
    if (!query.includeDeleted) {
      where.deletedAt = null;
    }
    if (query.since) {
      where.updatedAt = { gt: query.since };
    }
    return this.prisma.monthlyBudget.findMany({
      where,
      orderBy: { updatedAt: 'asc' },
    });
  }

  upsert(userId: string, dto: UpsertBudgetDto) {
    return this.prisma.monthlyBudget.upsert({
      where: {
        userId_monthKey: { userId, monthKey: dto.monthKey },
      },
      create: {
        userId,
        monthKey: dto.monthKey,
        globalBudget: dto.globalBudget,
        startDay: dto.startDay,
        categoryBudgets: dto.categoryBudgets ?? {},
      },
      update: {
        globalBudget: dto.globalBudget,
        startDay: dto.startDay,
        categoryBudgets: dto.categoryBudgets ?? {},
        deletedAt: null,
      },
    });
  }

  async softDelete(userId: string, monthKey: string) {
    const existing = await this.prisma.monthlyBudget.findUnique({
      where: { userId_monthKey: { userId, monthKey } },
    });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Budget not found');
    }
    return this.prisma.monthlyBudget.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
  }
}
