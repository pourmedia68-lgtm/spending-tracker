import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { SyncQueryDto } from '../common/dto/sync-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, query: SyncQueryDto) {
    const where: Prisma.ExpenseWhereInput = { userId };
    if (!query.includeDeleted) {
      where.deletedAt = null;
    }
    if (query.since) {
      where.updatedAt = { gt: query.since };
    }
    return this.prisma.expense.findMany({
      where,
      orderBy: { updatedAt: 'asc' },
    });
  }

  async create(userId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        id: dto.id,
        userId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        date: new Date(dto.date),
        note: dto.note ?? null,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    const existing = await this.prisma.expense.findFirst({
      where: { id, userId },
    });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Expense not found');
    }
    return this.prisma.expense.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : undefined,
        note: dto.note ?? undefined,
      },
    });
  }

  async softDelete(userId: string, id: string) {
    const existing = await this.prisma.expense.findFirst({
      where: { id, userId },
    });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Expense not found');
    }
    return this.prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
