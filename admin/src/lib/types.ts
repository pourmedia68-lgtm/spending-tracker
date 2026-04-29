import type { UserRole } from './auth-store';

export type { UserRole };

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  currency: string;
  locale: string;
  role: UserRole;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetail extends AdminUser {
  settings: {
    userId: string;
    currency: string;
    locale: string;
    onboardingComplete: boolean;
    lastSeenMonthKey: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  _count: {
    expenses: number;
    budgets: number;
    categoryConfigs: number;
    refreshTokens: number;
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  take: number;
  skip: number;
}

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

export interface DailySeries {
  since: string;
  signups: { day: string; count: number }[];
  expenses: { day: string; count: number; amount: number }[];
}

export interface CategoryAggregate {
  categoryId: string;
  amount: number;
  count: number;
}

export interface TopUser {
  user: { id: string; email: string | null; displayName: string | null };
  amount: number;
  count: number;
}

export interface AdminExpense {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  date: string;
  note: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBudget {
  id: string;
  userId: string;
  monthKey: string;
  globalBudget: number;
  startDay: number;
  categoryBudgets: Record<string, number>;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  targetType: string;
  targetId: string | null;
  action: string;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; email: string; displayName: string | null };
}

export interface ResetPasswordResult {
  temporaryPassword: string;
}
