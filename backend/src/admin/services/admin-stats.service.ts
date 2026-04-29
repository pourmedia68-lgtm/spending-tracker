import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface AdminKpis {
  users: {
    total: number;
    active: number;
    deleted: number;
    admins: number;
    newLast30d: number;
  };
  expenses: {
    total: number;
    last30d: number;
    last30dAmount: number;
    currentMonthAmount: number;
  };
  budgets: {
    currentMonthCount: number;
    currentMonthTotal: number;
  };
}

export interface DailyPoint {
  day: string; // YYYY-MM-DD
  count: number;
  amount: number;
}

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async kpis(now: Date = new Date()): Promise<AdminKpis> {
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const startOf30dAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      deletedUsers,
      adminUsers,
      newUsers30d,
      totalExpenses,
      expensesLast30d,
      expenseAmountLast30d,
      expensesCurrentMonth,
      budgetsCurrentMonth,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { NOT: { deletedAt: null } } }),
      this.prisma.user.count({ where: { role: 'ADMIN', deletedAt: null } }),
      this.prisma.user.count({
        where: { createdAt: { gte: startOf30dAgo }, deletedAt: null },
      }),
      this.prisma.expense.count({ where: { deletedAt: null } }),
      this.prisma.expense.count({
        where: { deletedAt: null, createdAt: { gte: startOf30dAgo } },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: { deletedAt: null, createdAt: { gte: startOf30dAgo } },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: { deletedAt: null, date: { gte: startOfMonth } },
      }),
      this.prisma.monthlyBudget.findMany({
        where: { deletedAt: null, monthKey },
        select: { globalBudget: true },
      }),
    ]);

    const currentMonthTotal = budgetsCurrentMonth.reduce(
      (s, b) => s + b.globalBudget,
      0,
    );

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        deleted: deletedUsers,
        admins: adminUsers,
        newLast30d: newUsers30d,
      },
      expenses: {
        total: totalExpenses,
        last30d: expensesLast30d,
        last30dAmount: expenseAmountLast30d._sum.amount ?? 0,
        currentMonthAmount: expensesCurrentMonth._sum.amount ?? 0,
      },
      budgets: {
        currentMonthCount: budgetsCurrentMonth.length,
        currentMonthTotal,
      },
    };
  }

  /**
   * Daily new-signups + daily expense totals for the last `days` days, useful
   * for the dashboard line charts. Both series share the same x-axis so the
   * frontend can zip them.
   */
  async daily(days = 30, now: Date = new Date()) {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
        (days - 1) * 24 * 60 * 60 * 1000,
    );

    const signups = await this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, count(*)::bigint AS count
      FROM users
      WHERE "createdAt" >= ${start} AND "deletedAt" IS NULL
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const expenses = await this.prisma.$queryRaw<
      { day: Date; count: bigint; amount: number }[]
    >`
      SELECT date_trunc('day', "date") AS day,
             count(*)::bigint AS count,
             coalesce(sum("amount"), 0)::float AS amount
      FROM expenses
      WHERE "date" >= ${start} AND "deletedAt" IS NULL
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    return {
      since: start.toISOString(),
      signups: signups.map((r) => ({
        day: r.day.toISOString().slice(0, 10),
        count: Number(r.count),
      })),
      expenses: expenses.map<DailyPoint>((r) => ({
        day: r.day.toISOString().slice(0, 10),
        count: Number(r.count),
        amount: Number(r.amount),
      })),
    };
  }

  /** Aggregate spending grouped by category id (string). */
  async expensesByCategory(now: Date = new Date()) {
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const rows = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: { deletedAt: null, date: { gte: startOfMonth } },
      _sum: { amount: true },
      _count: { _all: true },
    });
    return rows
      .map((r) => ({
        categoryId: r.categoryId,
        amount: r._sum.amount ?? 0,
        count: r._count._all,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  async topUsers(take = 10, now: Date = new Date()) {
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const rows = await this.prisma.expense.groupBy({
      by: ['userId'],
      where: { deletedAt: null, date: { gte: startOfMonth } },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: 'desc' } },
      take,
    });
    if (rows.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.userId) } },
      select: { id: true, email: true, displayName: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return rows.map((r) => ({
      user: byId.get(r.userId) ?? {
        id: r.userId,
        email: null,
        displayName: null,
      },
      amount: r._sum.amount ?? 0,
      count: r._count._all,
    }));
  }
}
