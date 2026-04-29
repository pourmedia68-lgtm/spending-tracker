import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

const csvEscape = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString() : String(v);
  // RFC 4180: wrap in quotes if it contains a separator, quote, or newline.
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const toCsv = (headers: string[], rows: unknown[][]): string => {
  const lines: string[] = [headers.join(',')];
  for (const r of rows) {
    lines.push(r.map(csvEscape).join(','));
  }
  return lines.join('\r\n');
};

@Injectable()
export class AdminExportService {
  constructor(private readonly prisma: PrismaService) {}

  async usersCsv(): Promise<string> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        currency: true,
        locale: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return toCsv(
      [
        'id',
        'email',
        'displayName',
        'role',
        'currency',
        'locale',
        'deletedAt',
        'createdAt',
        'updatedAt',
      ],
      users.map((u) => [
        u.id,
        u.email,
        u.displayName,
        u.role,
        u.currency,
        u.locale,
        u.deletedAt,
        u.createdAt,
        u.updatedAt,
      ]),
    );
  }

  async expensesCsv(opts: { userId?: string } = {}): Promise<string> {
    const expenses = await this.prisma.expense.findMany({
      where: opts.userId ? { userId: opts.userId } : undefined,
      orderBy: { date: 'desc' },
    });
    return toCsv(
      [
        'id',
        'userId',
        'categoryId',
        'amount',
        'note',
        'date',
        'deletedAt',
        'createdAt',
        'updatedAt',
      ],
      expenses.map((e) => [
        e.id,
        e.userId,
        e.categoryId,
        e.amount,
        e.note,
        e.date,
        e.deletedAt,
        e.createdAt,
        e.updatedAt,
      ]),
    );
  }
}
