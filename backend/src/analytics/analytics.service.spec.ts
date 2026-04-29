import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService.monthSummary', () => {
  function makePrismaMock(
    budget: unknown,
    expenses: Array<{ categoryId: string; amount: number }>,
  ) {
    return {
      monthlyBudget: { findUnique: jest.fn().mockResolvedValue(budget) },
      expense: { findMany: jest.fn().mockResolvedValue(expenses) },
    } as unknown as PrismaService;
  }

  it('throws when no budget exists for the month', async () => {
    const service = new AnalyticsService(makePrismaMock(null, []));
    await expect(
      service.monthSummary('user-1', '2025-04'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('computes spent / ratio / projected EOM for a full month', async () => {
    const budget = {
      globalBudget: 3000,
      startDay: 1,
      categoryBudgets: { lifestyle: 600, transport: 200 },
      deletedAt: null,
    };
    const expenses = [
      { categoryId: 'lifestyle', amount: 100 },
      { categoryId: 'lifestyle', amount: 50 },
      { categoryId: 'transport', amount: 30 },
    ];
    const service = new AnalyticsService(makePrismaMock(budget, expenses));
    const now = new Date(Date.UTC(2025, 3, 10)); // 10 April 2025
    const summary = await service.monthSummary('user-1', '2025-04', now);

    expect(summary.spent).toBeCloseTo(180);
    expect(summary.remaining).toBeCloseTo(2820);
    expect(summary.daysInMonth).toBe(30);
    expect(summary.daysElapsed).toBe(10);
    expect(summary.daysRemaining).toBe(20);
    expect(summary.proratedBudget).toBeCloseTo((3000 / 30) * 10);
    expect(summary.paceRatio).toBeCloseTo(180 / ((3000 / 30) * 10));
    expect(summary.projectedEndOfMonth).toBeCloseTo((180 / 10) * 30);

    const lifestyle = summary.perCategory.find(
      (c) => c.categoryId === 'lifestyle',
    )!;
    expect(lifestyle.spent).toBeCloseTo(150);
    expect(lifestyle.ratio).toBeCloseTo(150 / 600);
  });

  it('reports elapsed=0 / proratedBudget=0 / paceRatio=0 / projectedEOM=0 when the current date is before the configured startDay', async () => {
    const budget = {
      globalBudget: 3000,
      startDay: 15,
      categoryBudgets: {},
      deletedAt: null,
    };
    const service = new AnalyticsService(makePrismaMock(budget, []));
    const now = new Date(Date.UTC(2025, 3, 5)); // 5 April, before startDay=15
    const summary = await service.monthSummary('user-1', '2025-04', now);

    expect(summary.daysElapsed).toBe(0);
    expect(summary.proratedBudget).toBe(0);
    expect(summary.paceRatio).toBe(0);
    expect(summary.projectedEndOfMonth).toBe(0);
  });

  it('prorates the budget when the user starts mid-month', async () => {
    const budget = {
      globalBudget: 3000,
      startDay: 10,
      categoryBudgets: {},
      deletedAt: null,
    };
    const service = new AnalyticsService(makePrismaMock(budget, []));
    const now = new Date(Date.UTC(2025, 3, 15));
    const summary = await service.monthSummary('user-1', '2025-04', now);

    const activeDays = 30 - 10 + 1; // 21
    const elapsed = 15 - 10 + 1; // 6
    const expectedPerDay = 3000 / activeDays;
    expect(summary.proratedBudget).toBeCloseTo(expectedPerDay * elapsed);
    expect(summary.daysElapsed).toBe(elapsed);
  });
});
