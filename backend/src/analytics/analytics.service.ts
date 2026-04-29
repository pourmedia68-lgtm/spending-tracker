import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export interface MonthSummary {
  monthKey: string;
  globalBudget: number;
  spent: number;
  remaining: number;
  ratio: number;
  proratedBudget: number;
  paceRatio: number;
  daysElapsed: number;
  daysInMonth: number;
  daysRemaining: number;
  startDay: number;
  perCategory: CategorySummary[];
  projectedEndOfMonth: number;
}

export interface CategorySummary {
  categoryId: string;
  budget: number | null;
  spent: number;
  ratio: number | null;
}

export interface MoMComparison {
  current: MonthSummary | null;
  previous: MonthSummary | null;
  delta: { spent: number | null; ratio: number | null };
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async monthSummary(
    userId: string,
    monthKey: string,
    now: Date = new Date(),
  ): Promise<MonthSummary> {
    const budget = await this.prisma.monthlyBudget.findUnique({
      where: { userId_monthKey: { userId, monthKey } },
    });
    if (!budget || budget.deletedAt) {
      throw new NotFoundException(`No budget for ${monthKey}`);
    }
    const { start, end } = monthRange(monthKey);
    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { gte: start, lt: end },
      },
      select: { categoryId: true, amount: true },
    });
    const spent = expenses.reduce((sum, e) => sum + e.amount, 0);

    const perCategoryMap = new Map<string, number>();
    for (const e of expenses) {
      perCategoryMap.set(
        e.categoryId,
        (perCategoryMap.get(e.categoryId) ?? 0) + e.amount,
      );
    }
    const categoryBudgets = (budget.categoryBudgets ?? {}) as Record<
      string,
      number
    >;
    const categoryIds = new Set([
      ...Object.keys(categoryBudgets),
      ...perCategoryMap.keys(),
    ]);
    const perCategory: CategorySummary[] = Array.from(categoryIds).map((id) => {
      const catBudget = categoryBudgets[id] ?? null;
      const catSpent = perCategoryMap.get(id) ?? 0;
      return {
        categoryId: id,
        budget: catBudget,
        spent: catSpent,
        ratio: catBudget && catBudget > 0 ? catSpent / catBudget : null,
      };
    });

    const fullDaysInMonth = lastDayOfMonth(monthKey);
    // elapsed = how many active-cycle days have passed.
    // Stays at 0 when the current date is before the configured startDay so
    // proratedBudget / projectedEndOfMonth report 0 for that edge case
    // instead of pretending one day has passed.
    const elapsed = clamp(
      Math.max(0, dayInMonth(now, monthKey) - budget.startDay + 1),
      0,
      fullDaysInMonth,
    );
    const activeDays = Math.max(1, fullDaysInMonth - budget.startDay + 1);
    const perDay = budget.globalBudget / activeDays;
    const proratedBudget = perDay * elapsed;
    const ratio = budget.globalBudget > 0 ? spent / budget.globalBudget : 0;
    const paceRatio = proratedBudget > 0 ? spent / proratedBudget : 0;
    const daysRemaining = Math.max(
      0,
      fullDaysInMonth - dayInMonth(now, monthKey),
    );
    const projectedEndOfMonth =
      elapsed > 0 ? (spent / elapsed) * activeDays : 0;

    return {
      monthKey,
      globalBudget: budget.globalBudget,
      spent,
      remaining: budget.globalBudget - spent,
      ratio,
      proratedBudget,
      paceRatio,
      daysElapsed: elapsed,
      daysInMonth: fullDaysInMonth,
      daysRemaining,
      startDay: budget.startDay,
      perCategory,
      projectedEndOfMonth,
    };
  }

  async monthOverMonth(
    userId: string,
    monthKey: string,
  ): Promise<MoMComparison> {
    const prevKey = previousMonthKey(monthKey);
    const [current, previous] = await Promise.all([
      this.monthSummary(userId, monthKey).catch(() => null),
      this.monthSummary(userId, prevKey).catch(() => null),
    ]);
    return {
      current,
      previous,
      delta: {
        spent: current && previous ? current.spent - previous.spent : null,
        ratio: current && previous ? current.ratio - previous.ratio : null,
      },
    };
  }
}

function monthRange(monthKey: string): { start: Date; end: Date } {
  const [year, month] = monthKey.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

function lastDayOfMonth(monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function dayInMonth(now: Date, monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number);
  if (
    now.getUTCFullYear() < year ||
    (now.getUTCFullYear() === year && now.getUTCMonth() + 1 < month)
  ) {
    return 0;
  }
  if (
    now.getUTCFullYear() > year ||
    (now.getUTCFullYear() === year && now.getUTCMonth() + 1 > month)
  ) {
    return lastDayOfMonth(monthKey);
  }
  return now.getUTCDate();
}

function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}
