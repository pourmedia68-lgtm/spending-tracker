import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Copy, Download, KeyRound, Trash2, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  downloadCsv,
  useAuditLog,
  useResetPassword,
  useRestoreUser,
  useSoftDeleteUser,
  useUpdateUser,
  useUser,
  useUserBudgets,
  useUserExpenses,
} from '@/hooks/use-admin-queries';
import { useAuth } from '@/hooks/use-auth';
import { apiErrorMessage } from '@/lib/api';
import { cn, formatCurrency, formatDate, formatNumber } from '@/lib/utils';

const TABS = ['profile', 'budgets', 'expenses', 'audit'] as const;
type Tab = (typeof TABS)[number];

const updateSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  displayName: z.string().max(120).optional().or(z.literal('')),
  currency: z.string().min(2).max(8).optional().or(z.literal('')),
  locale: z.string().min(2).max(16).optional().or(z.literal('')),
  role: z.enum(['USER', 'ADMIN']),
});

type UpdateForm = z.infer<typeof updateSchema>;

export const UserDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');

  const userQuery = useUser(id);
  const expensesQuery = useUserExpenses(id, 100);
  const budgetsQuery = useUserBudgets(id);
  const auditQuery = useAuditLog({
    targetType: 'user',
    targetId: id,
    take: 50,
  });

  if (!id) return null;
  if (userQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (userQuery.isError || !userQuery.data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive">
          {apiErrorMessage(userQuery.error)}
        </CardContent>
      </Card>
    );
  }
  const user = userQuery.data;
  const isSelf = currentUser?.id === user.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/users"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to users
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {user.displayName ?? user.email}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{user.email}</span>
            <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
              {user.role}
            </Badge>
            {user.deletedAt ? (
              <Badge variant="destructive">Deleted</Badge>
            ) : (
              <Badge variant="success">Active</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                `/admin/export/expenses.csv?userId=${user.id}`,
                `expenses-${user.id}.csv`,
              )
            }
          >
            <Download className="h-4 w-4" />
            Export expenses
          </Button>
        </div>
      </div>

      <div className="flex gap-1 rounded-md border bg-muted/30 p-1 text-sm w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded px-3 py-1.5 capitalize transition-colors',
              tab === t
                ? 'bg-background shadow-sm font-medium'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <ProfileTab user={user} isSelf={isSelf} />
      )}

      {tab === 'budgets' && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly budgets</CardTitle>
            <CardDescription>All budgets recorded for this user.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Global</TableHead>
                  <TableHead>Start day</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : !budgetsQuery.data || budgetsQuery.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No budgets set yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  budgetsQuery.data.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.monthKey}</TableCell>
                      <TableCell>{formatCurrency(b.globalBudget, user.currency)}</TableCell>
                      <TableCell>{b.startDay}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {Object.keys(b.categoryBudgets ?? {}).length} configured
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(b.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'expenses' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent expenses</CardTitle>
            <CardDescription>
              {expensesQuery.data
                ? `${formatNumber(expensesQuery.data.total)} total expenses`
                : '…'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : !expensesQuery.data || expensesQuery.data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No expenses recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  expensesQuery.data.items.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{formatDate(e.date, { dateStyle: 'medium' })}</TableCell>
                      <TableCell className="text-muted-foreground">{e.categoryId}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(e.amount, user.currency)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {e.note ?? '—'}
                      </TableCell>
                      <TableCell>
                        {e.deletedAt ? (
                          <Badge variant="destructive">Deleted</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'audit' && (
        <Card>
          <CardHeader>
            <CardTitle>Audit trail</CardTitle>
            <CardDescription>
              Admin actions targeting this user.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : !auditQuery.data || auditQuery.data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No actions recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditQuery.data.items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDate(row.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.action}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.actor.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.ip ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const ProfileTab = ({
  user,
  isSelf,
}: {
  user: ReturnType<typeof useUser>['data'] & object;
  isSelf: boolean;
}) => {
  const update = useUpdateUser(user.id);
  const softDelete = useSoftDeleteUser(user.id);
  const restore = useRestoreUser(user.id);
  const resetPwd = useResetPassword(user.id);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty },
    reset,
  } = useForm<UpdateForm>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      email: user.email,
      displayName: user.displayName ?? '',
      currency: user.currency,
      locale: user.locale,
      role: user.role,
    },
  });

  const onSave = async (values: UpdateForm) => {
    setActionError(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== '' && v !== undefined),
      );
      const next = await update.mutateAsync(payload as never);
      reset({
        email: next.email,
        displayName: next.displayName ?? '',
        currency: next.currency,
        locale: next.locale,
        role: next.role,
      });
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  };

  const onSoftDelete = async () => {
    if (!confirm(`Soft-delete ${user.email}? This revokes their sessions.`)) return;
    setActionError(null);
    try {
      await softDelete.mutateAsync();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  };

  const onRestore = async () => {
    setActionError(null);
    try {
      await restore.mutateAsync();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  };

  const onResetPassword = async () => {
    if (
      !confirm(
        `Generate a new temporary password for ${user.email}? All active sessions will be revoked.`,
      )
    )
      return;
    setActionError(null);
    setTempPassword(null);
    try {
      const result = await resetPwd.mutateAsync();
      setTempPassword(result.temporaryPassword);
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update the user's identity and role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSave)} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" {...register('displayName')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" {...register('currency')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locale">Locale</Label>
              <Input id="locale" {...register('locale')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="role">Role</Label>
              <Select id="role" {...register('role')} disabled={isSelf}>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </Select>
              {isSelf && (
                <p className="text-xs text-muted-foreground">
                  You can't demote yourself.
                </p>
              )}
            </div>
            {actionError && (
              <p className="md:col-span-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {actionError}
              </p>
            )}
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button
                type="submit"
                disabled={!isDirty || isSubmitting}
              >
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Account-level admin actions are recorded in the audit log.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={onResetPassword}
            disabled={resetPwd.isPending || Boolean(user.deletedAt)}
          >
            <KeyRound className="h-4 w-4" />
            {resetPwd.isPending ? 'Generating…' : 'Reset password'}
          </Button>
          {tempPassword && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm">
              <p className="font-medium text-emerald-900">
                Temporary password (shown once):
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded bg-white px-2 py-1 font-mono text-xs">
                  {tempPassword}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => navigator.clipboard.writeText(tempPassword)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
          {user.deletedAt ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={onRestore}
              disabled={restore.isPending}
            >
              <Undo2 className="h-4 w-4" />
              {restore.isPending ? 'Restoring…' : 'Restore account'}
            </Button>
          ) : (
            <Button
              variant="destructive"
              className="w-full"
              onClick={onSoftDelete}
              disabled={softDelete.isPending || isSelf}
              title={isSelf ? 'You cannot delete your own account' : undefined}
            >
              <Trash2 className="h-4 w-4" />
              {softDelete.isPending ? 'Deleting…' : 'Soft-delete user'}
            </Button>
          )}
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>
              <strong>{formatNumber(user._count.expenses)}</strong> expenses ·{' '}
              <strong>{formatNumber(user._count.budgets)}</strong> budgets ·{' '}
              <strong>{formatNumber(user._count.refreshTokens)}</strong>{' '}
              sessions
            </p>
            <p className="mt-1">
              Created {formatDate(user.createdAt)} · Updated{' '}
              {formatDate(user.updatedAt)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
