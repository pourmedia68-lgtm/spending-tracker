import {
  Activity,
  CreditCard,
  PiggyBank,
  TrendingUp,
  UserCheck,
  Users as UsersIcon,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDailySeries,
  useExpensesByCategory,
  useKpis,
  useTopUsers,
} from '@/hooks/use-admin-queries';
import { formatCurrency, formatNumber } from '@/lib/utils';

const COLORS = [
  '#6366f1',
  '#ec4899',
  '#22c55e',
  '#f97316',
  '#06b6d4',
  '#a855f7',
  '#ef4444',
  '#eab308',
];

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  Icon: typeof UsersIcon;
}

const KpiCard = ({ title, value, subtitle, Icon }: KpiCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-semibold">{value}</div>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </CardContent>
  </Card>
);

const KpiSkeleton = () => (
  <Card>
    <CardHeader className="pb-2">
      <Skeleton className="h-4 w-24" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-20" />
    </CardContent>
  </Card>
);

const ChartCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export const DashboardPage = () => {
  const kpisQuery = useKpis();
  const dailyQuery = useDailySeries(30);
  const byCategoryQuery = useExpensesByCategory();
  const topUsersQuery = useTopUsers(5);
  const kpis = kpisQuery.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          High-level health of the Spending Tracker platform.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpisQuery.isLoading || !kpis ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              title="Active users"
              value={formatNumber(kpis.users.active)}
              subtitle={`${formatNumber(kpis.users.deleted)} deleted · ${formatNumber(kpis.users.admins)} admins`}
              Icon={UsersIcon}
            />
            <KpiCard
              title="New (30d)"
              value={formatNumber(kpis.users.newLast30d)}
              subtitle={`${formatNumber(kpis.users.total)} total signups`}
              Icon={UserCheck}
            />
            <KpiCard
              title="Spend (30d)"
              value={formatCurrency(kpis.expenses.last30dAmount)}
              subtitle={`${formatNumber(kpis.expenses.last30d)} expenses recorded`}
              Icon={CreditCard}
            />
            <KpiCard
              title="This month spend"
              value={formatCurrency(kpis.expenses.currentMonthAmount)}
              subtitle={`Budget: ${formatCurrency(kpis.budgets.currentMonthTotal)} · ${formatNumber(kpis.budgets.currentMonthCount)} users`}
              Icon={PiggyBank}
            />
          </>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Daily signups" description="Last 30 days">
          {dailyQuery.isLoading || !dailyQuery.data ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyQuery.data.signups}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tickFormatter={(d) => d.slice(5)} fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Daily spending" description="Last 30 days">
          {dailyQuery.isLoading || !dailyQuery.data ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyQuery.data.expenses}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tickFormatter={(d) => d.slice(5)} fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => formatCurrency(v).replace(/[\u00a0\s]/g, '')} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v) => formatCurrency(Number(v))}
                />
                <Bar dataKey="amount" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Spend by category"
          description="Current month, all users"
        >
          {byCategoryQuery.isLoading || !byCategoryQuery.data ? (
            <Skeleton className="h-64 w-full" />
          ) : byCategoryQuery.data.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No expenses recorded this month yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={byCategoryQuery.data}
                  dataKey="amount"
                  nameKey="categoryId"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {byCategoryQuery.data.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top spenders" description="This month">
          {topUsersQuery.isLoading || !topUsersQuery.data ? (
            <Skeleton className="h-64 w-full" />
          ) : topUsersQuery.data.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No spending activity this month.
            </p>
          ) : (
            <ul className="divide-y">
              {topUsersQuery.data.map((row, idx) => (
                <li
                  key={row.user.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {row.user.displayName ?? row.user.email ?? row.user.id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(row.count)} expenses
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    {formatCurrency(row.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </section>

      <section>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Health</CardTitle>
              <CardDescription>
                Live counters from the API.
              </CardDescription>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {kpis
                ? `${formatNumber(kpis.users.active)} active accounts · ${formatNumber(kpis.expenses.total)} total expenses lifetime.`
                : '…'}
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};
