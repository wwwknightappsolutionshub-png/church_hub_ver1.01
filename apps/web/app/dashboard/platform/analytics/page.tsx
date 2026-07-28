'use client';

import Link from 'next/link';
import {
  BarChart3,
  Building2,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { apiErrorMessage } from '@/lib/api-errors';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { PlatformConsoleShell } from '@/components/platform/PlatformConsoleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPence } from '@/lib/wisdom365-api';
import { cn } from '@/lib/utils';

interface AnalyticsDashboard {
  generatedAt: string;
  tenants: {
    total: number;
    active: number;
    newLast7Days: number;
    newLast30Days: number;
  };
  users: { total: number };
  members: { total: number };
  wisdom365: {
    activeSubscriptions: number;
    pendingSubscriptions: number;
    totalLicensesSold: number;
    assignedJourneys: number;
    totalRevenuePence: number;
    revenueLast30DaysPence: number;
    churchesWithActiveSubs: number;
    churchesAvailable: number;
  };
  spirify: {
    totalSermons: number;
    sermonsLast30Days: number;
    churchesWithSermons: number;
    adoptionPercent: number;
  };
  sermonNotes: { total: number; published: number };
  marketing: {
    templateCount: number;
    expectedTemplateCount: number;
    dripsSent: number;
    dripsPending: number;
    dripsSkipped: number;
  };
  moduleAdoption: Array<{ module: string; label: string; churchesEnabled: number; percent: number }>;
  revenueByMonth: Array<{ month: string; revenuePence: number; subscriptions: number }>;
  recentTenants: Array<{
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    memberCount: number;
    userCount: number;
    createdAt: string;
  }>;
}

function StatCard({
  title,
  value,
  hint,
  accent,
}: {
  title: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn('text-2xl font-bold tabular-nums', accent)}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function PlatformAnalyticsPage() {
  const router = useRouter();
  const { isPlatformOperator, hasPlatformPermission, isLoading: accessLoading } = useModuleAccess();
  const canAccess = isPlatformOperator && hasPlatformPermission('platform.analytics:read');

  const { data, isLoading, isError, error, refetch, isFetching } = useApiQuery<AnalyticsDashboard>(
    ['platform-analytics-dashboard'],
    '/platform/analytics/dashboard',
    { enabled: canAccess, staleTime: 60_000, retry: 1 },
  );

  useEffect(() => {
    if (!accessLoading && !canAccess) router.replace('/dashboard/platform');
  }, [accessLoading, canAccess, router]);

  if (accessLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccess) return null;

  const maxRevenue = Math.max(...(data?.revenueByMonth.map((m) => m.revenuePence) ?? [1]), 1);

  return (
    <PlatformConsoleShell
      title="Business analytics"
      description={MODULE_DESCRIPTIONS.platformAnalytics}
    >
      {isLoading && !data ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError || !data ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-semibold">Could not load analytics</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {apiErrorMessage(
              error,
              'The analytics API is unavailable. Restart the API server (pnpm run dev in apps/api) so new routes load.',
            )}
          </p>
          <Button variant="outline" className="gap-2" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Active tenants"
              value={data.tenants.active}
              hint={`${data.tenants.total} total · +${data.tenants.newLast30Days} this month`}
            />
            <StatCard
              title="Wisdom365+ revenue"
              value={formatPence(data.wisdom365.totalRevenuePence)}
              hint={`${formatPence(data.wisdom365.revenueLast30DaysPence)} last 30 days`}
              accent="text-amber-600"
            />
            <StatCard
              title="Active W365 subscriptions"
              value={data.wisdom365.activeSubscriptions}
              hint={`${data.wisdom365.totalLicensesSold} licenses · ${data.wisdom365.assignedJourneys} assigned`}
              accent="text-amber-600"
            />
            <StatCard
              title="Spirify adoption"
              value={`${data.spirify.adoptionPercent}%`}
              hint={`${data.spirify.churchesWithSermons} churches · ${data.spirify.totalSermons} sermons`}
              accent="text-violet-600"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Platform users" value={data.users.total} />
            <StatCard title="Members (all churches)" value={data.members.total.toLocaleString()} />
            <StatCard
              title="New tenants (7d)"
              value={data.tenants.newLast7Days}
              hint={`${data.tenants.newLast30Days} in 30 days`}
            />
            <StatCard
              title="Marketing drips sent"
              value={data.marketing.dripsSent}
              hint={`${data.marketing.dripsPending} pending · ${data.marketing.templateCount}/${data.marketing.expectedTemplateCount} templates`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                  Wisdom365+ revenue by month
                </CardTitle>
                <CardDescription>Active subscription payments grouped by activation month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.revenueByMonth.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No subscription revenue recorded yet.</p>
                ) : (
                  data.revenueByMonth.map((row) => (
                    <div key={row.month}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">{row.month}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatPence(row.revenuePence)} · {row.subscriptions} sub
                          {row.subscriptions !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${Math.max(4, (row.revenuePence / maxRevenue) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Premium module adoption
                </CardTitle>
                <CardDescription>Share of churches with module enabled</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.moduleAdoption.map((m) => (
                  <div key={m.module}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{m.label}</span>
                      <span className="text-muted-foreground">
                        {m.percent}% ({m.churchesEnabled})
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(m.percent, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  Wisdom365+ pipeline
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Pending checkouts</p>
                  <p className="text-xl font-bold">{data.wisdom365.pendingSubscriptions}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Churches with active subs</p>
                  <p className="text-xl font-bold">{data.wisdom365.churchesWithActiveSubs}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Churches available</p>
                  <p className="text-xl font-bold">{data.wisdom365.churchesAvailable}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Sermon Notes published</p>
                  <p className="text-xl font-bold">{data.sermonNotes.published}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  Recent tenants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recentTenants.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.slug} · {new Date(t.createdAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={t.isActive ? 'default' : 'secondary'}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {t.memberCount}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground">
            Snapshot generated {new Date(data.generatedAt).toLocaleString('en-GB')}.{' '}
            <Link href="/dashboard/platform/marketing" className="text-primary underline">
              Marketing templates
            </Link>{' '}
            ·{' '}
            <Link href="/dashboard/platform/wisdom365" className="text-primary underline">
              Wisdom365+ admin
            </Link>
          </p>
        </div>
      )}
    </PlatformConsoleShell>
  );
}
