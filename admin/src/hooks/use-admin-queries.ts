import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api } from '@/lib/api';
import type {
  AdminBudget,
  AdminExpense,
  AdminKpis,
  AdminUser,
  AdminUserDetail,
  AuditEntry,
  CategoryAggregate,
  DailySeries,
  Paginated,
  ResetPasswordResult,
  TopUser,
  UserRole,
} from '@/lib/types';

export interface ListUsersFilters {
  q?: string;
  role?: UserRole;
  includeDeleted?: boolean;
  take?: number;
  skip?: number;
  sort?: 'createdAt' | 'email' | 'displayName' | 'role';
  order?: 'asc' | 'desc';
}

export const useKpis = () =>
  useQuery({
    queryKey: ['admin', 'kpis'],
    queryFn: async () => (await api.get<AdminKpis>('/admin/stats/kpis')).data,
  });

export const useDailySeries = (days = 30) =>
  useQuery({
    queryKey: ['admin', 'daily', days],
    queryFn: async () =>
      (await api.get<DailySeries>(`/admin/stats/daily?days=${days}`)).data,
  });

export const useExpensesByCategory = () =>
  useQuery({
    queryKey: ['admin', 'expenses-by-category'],
    queryFn: async () =>
      (
        await api.get<CategoryAggregate[]>(
          '/admin/stats/expenses-by-category',
        )
      ).data,
  });

export const useTopUsers = (take = 5) =>
  useQuery({
    queryKey: ['admin', 'top-users', take],
    queryFn: async () =>
      (await api.get<TopUser[]>(`/admin/stats/top-users?take=${take}`)).data,
  });

export const useUsers = (filters: ListUsersFilters) =>
  useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.role) params.set('role', filters.role);
      if (filters.includeDeleted) params.set('includeDeleted', 'true');
      if (filters.take !== undefined) params.set('take', String(filters.take));
      if (filters.skip !== undefined) params.set('skip', String(filters.skip));
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.order) params.set('order', filters.order);
      const { data } = await api.get<Paginated<AdminUser>>(
        `/admin/users?${params.toString()}`,
      );
      return data;
    },
    placeholderData: (prev) => prev,
  });

export const useUser = (id: string | undefined) =>
  useQuery({
    queryKey: ['admin', 'user', id],
    enabled: Boolean(id),
    queryFn: async () =>
      (await api.get<AdminUserDetail>(`/admin/users/${id}`)).data,
  });

export const useUserExpenses = (id: string | undefined, take = 50) =>
  useQuery({
    queryKey: ['admin', 'user-expenses', id, take],
    enabled: Boolean(id),
    queryFn: async () =>
      (
        await api.get<Paginated<AdminExpense>>(
          `/admin/users/${id}/expenses?take=${take}`,
        )
      ).data,
  });

export const useUserBudgets = (id: string | undefined) =>
  useQuery({
    queryKey: ['admin', 'user-budgets', id],
    enabled: Boolean(id),
    queryFn: async () =>
      (await api.get<AdminBudget[]>(`/admin/users/${id}/budgets`)).data,
  });

export interface AuditFilters {
  actorId?: string;
  targetType?: string;
  targetId?: string;
  action?: string;
  since?: string;
  until?: string;
  take?: number;
  skip?: number;
}

export const useAuditLog = (filters: AuditFilters) =>
  useQuery({
    queryKey: ['admin', 'audit-log', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.set(k, String(v));
        }
      });
      const { data } = await api.get<Paginated<AuditEntry>>(
        `/admin/audit-log?${params.toString()}`,
      );
      return data;
    },
    placeholderData: (prev) => prev,
  });

const invalidateUser = (id: string, qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['admin', 'user', id] });
  qc.invalidateQueries({ queryKey: ['admin', 'users'] });
  qc.invalidateQueries({ queryKey: ['admin', 'audit-log'] });
  qc.invalidateQueries({ queryKey: ['admin', 'kpis'] });
};

export interface UpdateUserPayload {
  email?: string;
  displayName?: string;
  currency?: string;
  locale?: string;
  role?: UserRole;
}

export const useUpdateUser = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateUserPayload) =>
      (await api.patch<AdminUser>(`/admin/users/${id}`, payload)).data,
    onSuccess: () => invalidateUser(id, qc),
  });
};

export const useSoftDeleteUser = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await api.delete<{ id: string; deletedAt: string }>(`/admin/users/${id}`))
        .data,
    onSuccess: () => invalidateUser(id, qc),
  });
};

export const useRestoreUser = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (
        await api.post<{ id: string; deletedAt: string | null }>(
          `/admin/users/${id}/restore`,
        )
      ).data,
    onSuccess: () => invalidateUser(id, qc),
  });
};

export const useResetPassword = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (
        await api.post<ResetPasswordResult>(
          `/admin/users/${id}/reset-password`,
        )
      ).data,
    onSuccess: () => invalidateUser(id, qc),
  });
};

export const exportUrl = (path: string) => {
  const baseURL =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1';
  return `${baseURL}${path}`;
};

/**
 * CSV exports must be downloaded via fetch (we need to attach the bearer
 * token in a header — anchor href can't do that). This helper streams the
 * response into a Blob and triggers a browser save dialog.
 */
export const downloadCsv = async (path: string, filename: string) => {
  const response = await api.get<Blob>(path, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
