'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Bus, HeartHandshake, Megaphone, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { normalizeDashboardMetrics, type DashboardMetrics } from '@/lib/dashboard-metrics';
import { personalGreeting } from '@/lib/greeting';
import { DASHBOARD_QUICK_ACTIONS } from '@/lib/quick-actions';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardAttendanceChart } from '@/components/dashboard/DashboardAttendanceChart';
import { DashboardChurchCalendar } from '@/components/dashboard/DashboardChurchCalendar';
import { QuickActionsList, QuickActionsMenu } from '@/components/dashboard/QuickActionsMenu';
import { StatCard } from '@/components/dashboard/StatCard';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { DashboardPageSkeleton } from '@/components/dashboard/DashboardPageSkeleton';
import {
  UnifiedAdminHub,
  type UnifiedAdminHubDto,
} from '@/components/admin/UnifiedAdminHub';
import { CelebrationColumnsPanel } from '@/components/membership/CelebrationColumnsPanel';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const chartTick = { fontSize: 12, fontFamily: 'Montserrat' };
const chartTickSm = { fontSize: 11, fontFamily: 'Montserrat' };

const STAT_TONES = [
  'border-l-4 border-l-sky-600',
  'border-l-4 border-l-violet-600',
  'border-l-4 border-l-amber-500',
  'border-l-4 border-l-emerald-600',
] as const;

/** Merged church home: Overview metrics/charts + Admin Centre ops (no duplicated KPIs). */
export default function DashboardPage() {
  const router = useRouter();
  const {
    isPlatformOperator,
    isChurchStaff,
    isLoading: accessLoading,
    user,
    member,
  } = useModuleAccess();
  const [hub, setHub] = useState<UnifiedAdminHubDto | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>(() => normalizeDashboardMetrics(null));
  const [metricsLoaded, setMetricsLoaded] = useState(false);
  const [metricsError, setMetricsError] = useState(false);
  const [greeting, setGreeting] = useState(() => personalGreeting(user, member));

  useEffect(() => {
    setGreeting(personalGreeting(user, member));
  }, [user, member]);

  useEffect(() => {
    if (accessLoading) return;
    if (isPlatformOperator) {
      router.replace('/dashboard/platform');
      return;
    }
    if (!isChurchStaff) {
      router.replace('/dashboard/lounge');
    }
  }, [accessLoading, isPlatformOperator, isChurchStaff, router]);

  useEffect(() => {
    if (isPlatformOperator || accessLoading || !isChurchStaff) return;
    let cancelled = false;
    setMetricsLoaded(false);
    api
      .get<UnifiedAdminHubDto>('/admin/hub')
      .then((r) => {
        if (cancelled) return;
        setHub(r.data);
        setMetrics(normalizeDashboardMetrics(r.data.metrics));
        setMetricsLoaded(true);
        setMetricsError(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback: metrics-only endpoint if hub is unavailable
        return api
          .get('/admin/dashboard')
          .then((r) => {
            if (cancelled) return;
            setHub(null);
            setMetrics(normalizeDashboardMetrics(r.data));
            setMetricsLoaded(true);
            setMetricsError(false);
          })
          .catch(() => {
            if (cancelled) return;
            setHub(null);
            setMetrics(normalizeDashboardMetrics(null));
            setMetricsLoaded(true);
            setMetricsError(true);
          });
      });
    return () => {
      cancelled = true;
    };
  }, [isPlatformOperator, accessLoading, isChurchStaff]);

  const chartData = metrics.membership.byStatus.map((s) => ({
    name: s.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    count: s._count,
  }));

  const growthData = useMemo(() => metrics.growth, [metrics.growth]);
  const hasGrowth = growthData.some((g) => g.members > 0 || g.outreach > 0);

  return (
    <DashboardModuleShell
      eyebrow="Leadership"
      title="Dashboard"
      description={`${greeting} — ${MODULE_DESCRIPTIONS.dashboard}`}
      badge={
        metricsError ? (
          <Badge variant="destructive">Could not load live metrics</Badge>
        ) : metricsLoaded ? (
          <Badge className="border-emerald-400/40 bg-emerald-500/20 text-emerald-50">Live</Badge>
        ) : undefined
      }
      actions={
        <QuickActionsMenu actions={DASHBOARD_QUICK_ACTIONS} scrollTargetId="quick-actions" />
      }
    >
      <div className="space-y-6">
        {!metricsLoaded ? (
          <DashboardPageSkeleton cards={4} />
        ) : (
          <>
            {/* KPI strip — single source (hub or dashboard metrics) */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                className={cn(STAT_TONES[0], 'bg-gradient-to-br from-sky-500/5 to-transparent')}
                label="Total Members"
                value={metrics.membership.total.toLocaleString()}
                change={metrics.membership.changePct}
                changeLabel={
                  metrics.membership.addedThisMonth === 1
                    ? '1 added this month'
                    : `${metrics.membership.addedThisMonth} added this month`
                }
                icon={Users}
              />
              <StatCard
                className={cn(STAT_TONES[1], 'bg-gradient-to-br from-violet-500/5 to-transparent')}
                label="Outreach Contacts"
                value={metrics.evangelism.totalContacts.toLocaleString()}
                change={metrics.evangelism.changePct}
                changeLabel={
                  metrics.evangelism.thisMonth === 1
                    ? '1 this month'
                    : `${metrics.evangelism.thisMonth} this month`
                }
                icon={Megaphone}
              />
              <StatCard
                className={cn(STAT_TONES[2], 'bg-gradient-to-br from-amber-500/5 to-transparent')}
                label="Outreach Rate"
                value={`${Math.round(metrics.followUp.completionRate * 100)}%`}
                changeLabel={
                  metrics.followUp.pending === 1
                    ? '1 pending'
                    : `${metrics.followUp.pending} pending`
                }
                icon={HeartHandshake}
              />
              <StatCard
                className={cn(STAT_TONES[3], 'bg-gradient-to-br from-emerald-500/5 to-transparent')}
                label="Active Rides"
                value={metrics.bus.activeRides}
                changeLabel={
                  metrics.bus.completedToday === 1
                    ? '1 completed today'
                    : `${metrics.bus.completedToday} completed today`
                }
                icon={Bus}
              />
            </div>

            <CelebrationColumnsPanel compact />

            {hub ? <UnifiedAdminHub hub={hub} hideCelebrations /> : null}

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="border-slate-200/80 shadow-sm lg:col-span-2 dark:border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base">Growth overview</CardTitle>
                    <CardDescription>Members & outreach over 6 months</CardDescription>
                  </div>
                  <Badge variant="outline">{metricsError ? '—' : 'Live'}</Badge>
                </CardHeader>
                <CardContent className="h-72">
                  {!hasGrowth ? (
                    <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No growth history yet — new members and outreach will appear here.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={growthData}>
                        <defs>
                          <linearGradient id="memberGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={chartTick} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={chartTick} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 8,
                            border: '1px solid hsl(var(--border))',
                            fontFamily: 'Montserrat',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="members"
                          stroke="hsl(var(--primary))"
                          fill="url(#memberGrad)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="outreach"
                          stroke="hsl(var(--gold))"
                          fill="transparent"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card
                id="quick-actions"
                className="flex flex-col border-[#0b1220]/15 bg-gradient-to-b from-[#0b1220]/[0.03] to-transparent shadow-sm dark:border-slate-700"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick actions</CardTitle>
                  <CardDescription>Jump to common ministry tasks</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <QuickActionsList actions={DASHBOARD_QUICK_ACTIONS} />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <DashboardAttendanceChart />
              </div>
              <Card className="border-slate-200/80 shadow-sm dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base">Members by status</CardTitle>
                  <CardDescription>Lifecycle mix in the registry</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  {chartData.length === 0 ? (
                    <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No membership data yet.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} barSize={32}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="name" tick={chartTickSm} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={chartTick} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 8,
                            border: '1px solid hsl(var(--border))',
                            fontFamily: 'Montserrat',
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <DashboardChurchCalendar />
          </>
        )}
      </div>
    </DashboardModuleShell>
  );
}
