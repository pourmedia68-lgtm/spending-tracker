import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { SyncQueryDto } from '../common/dto/sync-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertCategoryConfigDto } from './dto/upsert-category-config.dto';

@Injectable()
export class CategoryConfigsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, query: SyncQueryDto) {
    const where: Prisma.CategoryConfigWhereInput = { userId };
    if (!query.includeDeleted) {
      where.deletedAt = null;
    }
    if (query.since) {
      where.updatedAt = { gt: query.since };
    }
    return this.prisma.categoryConfig.findMany({
      where,
      orderBy: { updatedAt: 'asc' },
    });
  }

  upsert(userId: string, dto: UpsertCategoryConfigDto) {
    return this.prisma.categoryConfig.upsert({
      where: {
        userId_categoryId: { userId, categoryId: dto.categoryId },
      },
      create: {
        userId,
        categoryId: dto.categoryId,
        enabled: dto.enabled ?? true,
        budget: dto.budget ?? null,
      },
      update: {
        enabled: dto.enabled ?? undefined,
        budget: dto.budget ?? null,
        deletedAt: null,
      },
    });
  }

  async softDelete(userId: string, categoryId: string) {
    const existing = await this.prisma.categoryConfig.findUnique({
      where: { userId_categoryId: { userId, categoryId } },
    });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Category config not found');
    }
    return this.prisma.categoryConfig.update({
      where: { userId_categoryId: { userId, categoryId } },
      data: { deletedAt: new Date() },
    });
  }
}
