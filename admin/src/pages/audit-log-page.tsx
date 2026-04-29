import { useState } from 'react';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuditLog, type AuditFilters } from '@/hooks/use-admin-queries';
import { formatDate, formatNumber } from '@/lib/utils';

const PAGE_SIZE = 50;

export const AuditLogPage = () => {
  const [filters, setFilters] = useState<AuditFilters>({
    take: PAGE_SIZE,
    skip: 0,
  });
  const [draft, setDraft] = useState<AuditFilters>(filters);

  const auditQuery = useAuditLog(filters);
  const total = auditQuery.data?.total ?? 0;
  const skip = filters.skip ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(skip / PAGE_SIZE);

  const apply = () => setFilters({ ...draft, skip: 0 });
  const reset = () => {
    setDraft({ take: PAGE_SIZE, skip: 0 });
    setFilters({ take: PAGE_SIZE, skip: 0 });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Append-only record of every admin action.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            All filters are optional; combine them as you need.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              apply();
            }}
            className="grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            <div className="space-y-1">
              <Label htmlFor="action">Action</Label>
              <Input
                id="action"
                placeholder="user.role_change"
                value={draft.action ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="actorId">Actor ID</Label>
              <Input
                id="actorId"
                placeholder="UUID"
                value={draft.actorId ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, actorId: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="targetId">Target ID</Label>
              <Input
                id="targetId"
                placeholder="UUID"
                value={draft.targetId ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, targetId: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="since">Since</Label>
              <Input
                id="since"
                type="datetime-local"
                value={draft.since ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, since: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="until">Until</Label>
              <Input
                id="until"
                type="datetime-local"
                value={draft.until ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, until: e.target.value }))}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" className="flex-1">
                Apply
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={reset}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>User agent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : !auditQuery.data || auditQuery.data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No entries match.
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
                      {row.targetType}{row.targetId ? ` · ${row.targetId.slice(0, 8)}` : ''}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.ip ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {row.userAgent ?? '—'}
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
          {formatNumber(total)} entries · Page {currentPage + 1} of {pages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 0}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                skip: Math.max(0, (f.skip ?? 0) - PAGE_SIZE),
              }))
            }
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage + 1 >= pages}
            onClick={() =>
              setFilters((f) => ({ ...f, skip: (f.skip ?? 0) + PAGE_SIZE }))
            }
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
