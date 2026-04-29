import { Download, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

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
import { Select } from '@/components/ui/select';
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
  useUsers,
  type ListUsersFilters,
} from '@/hooks/use-admin-queries';
import { apiErrorMessage } from '@/lib/api';
import type { UserRole } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const PAGE_SIZE = 25;

export const UsersPage = () => {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const filters: ListUsersFilters = {
    q: search || undefined,
    role: role || undefined,
    includeDeleted: includeDeleted || undefined,
    take: PAGE_SIZE,
    skip: page * PAGE_SIZE,
    sort: 'createdAt',
    order: 'desc',
  };

  const usersQuery = useUsers(filters);
  const total = usersQuery.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleExport = async () => {
    setExportError(null);
    setExporting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await downloadCsv('/admin/export/users.csv', `users-${today}.csv`);
    } catch (err) {
      setExportError(apiErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Search, filter, and manage every account.
          </p>
        </div>
        <Button onClick={handleExport} disabled={exporting} variant="outline">
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {exportError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {exportError}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Search by email or display name; filter by role or deletion state.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by email or name…"
              value={search}
              className="pl-9"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <Select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as UserRole | '');
              setPage(0);
            }}
          >
            <option value="">All roles</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => {
                setIncludeDeleted(e.target.checked);
                setPage(0);
              }}
              className="h-4 w-4 rounded border-input"
            />
            Include deleted
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Display name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading && !usersQuery.data ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading users…
                  </TableCell>
                </TableRow>
              ) : usersQuery.data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No users match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                usersQuery.data?.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.displayName ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.deletedAt ? (
                        <Badge variant="destructive">Deleted</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(u.createdAt, { dateStyle: 'medium' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={`/users/${u.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        View →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} user{total === 1 ? '' : 's'} · Page {page + 1} of {pages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page + 1 >= pages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
