'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
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
import {
  Bus,
  HeartHandshake,
  Megaphone,
  Users,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const chartTick = { fontSize: 12, fontFamily: 'Montserrat' };
const chartTickSm = { fontSize: 11, fontFamily: 'Montserrat' };

export default function DashboardPage() {
  const router = useRouter();
  const {
    isPlatformAdmin,
    isChurchStaff,
    isLoading: accessLoading,
    user,
    member,
  } = useModuleAccess();
  const [metrics, setMetrics] = useState<DashboardMetrics>(() => normalizeDashboardMetrics(null));
  const [metricsLoaded, setMetricsLoaded] = useState(false);
  const [metricsError, setMetricsError] = useState(false);
  const [greeting, setGreeting] = useState(() => personalGreeting(user, member));

  useEffect(() => {
    setGreeting(personalGreeting(user, member));
  }, [user, member]);

  useEffect(() => {
    if (accessLoading) return;
    if (isPlatformAdmin) {
      router.replace('/dashboard/platform');
      return;
    }
    if (!isChurchStaff) {
      router.replace('/dashboard/lounge');
    }
  }, [accessLoading, isPlatformAdmin, isChurchStaff, router]);

  useEffect(() => {
    if (isPlatformAdmin) return;
    let cancelled = false;
    api
      .get('/admin/dashboard')
      .then((r) => {
        if (cancelled) return;
        setMetrics(normalizeDashboardMetrics(r.data));
        setMetricsLoaded(true);
        setMetricsError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setMetrics(normalizeDashboardMetrics(null));
        setMetricsLoaded(true);
        setMetricsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isPlatformAdmin]);

  const chartData = metrics.membership.byStatus.map((s) => ({
    name: s.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    count: s._count,
  }));

  const growthData = useMemo(() => metrics.growth, [metrics.growth]);
  const hasGrowth = growthData.some((g) => g.members > 0 || g.outreach > 0);

  return (
    <DashboardModuleShell
      eyebrow="Executive overview"
      title={greeting}
      description={MODULE_DESCRIPTIONS.dashboard}
      badge={
        metricsError ? (
          <Badge variant="destructive">Could not load live metrics</Badge>
        ) : metricsLoaded ? (
          <Badge variant="outline">Live</Badge>
        ) : undefined
      }
      actions={
        <QuickActionsMenu actions={DASHBOARD_QUICK_ACTIONS} scrollTargetId="quick-actions" />
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Members"
            value={metricsLoaded ? metrics.membership.total.toLocaleString() : '—'}
            change={metricsLoaded ? metrics.membership.changePct : undefined}
            changeLabel={
              metricsLoaded
                ? metrics.membership.addedThisMonth === 1
                  ? '1 added this month'
                  : `${metrics.membership.addedThisMonth} added this month`
                : undefined
            }
            icon={Users}
          />
          <StatCard
            label="Outreach Contacts"
            value={metricsLoaded ? metrics.evangelism.totalContacts.toLocaleString() : '—'}
            change={metricsLoaded ? metrics.evangelism.changePct : undefined}
            changeLabel={
              metricsLoaded
                ? metrics.evangelism.thisMonth === 1
                  ? '1 this month'
                  : `${metrics.evangelism.thisMonth} this month`
                : undefined
            }
            icon={Megaphone}
          />
          <StatCard
            label="Follow-up Rate"
            value={
              metricsLoaded ? `${Math.round(metrics.followUp.completionRate * 100)}%` : '—'
            }
            changeLabel={
              metricsLoaded
                ? metrics.followUp.pending === 1
                  ? '1 pending'
                  : `${metrics.followUp.pending} pending`
                : undefined
            }
            icon={HeartHandshake}
          />
          <StatCard
            label="Active Rides"
            value={metricsLoaded ? metrics.bus.activeRides : '—'}
            changeLabel={
              metricsLoaded
                ? metrics.bus.completedToday === 1
                  ? '1 completed today'
                  : `${metrics.bus.completedToday} completed today`
                : undefined
            }
            icon={Bus}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Growth Overview</CardTitle>
                <CardDescription>Members & outreach over 6 months</CardDescription>
              </div>
              <Badge variant="outline">{metricsLoaded && !metricsError ? 'Live' : '—'}</Badge>
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
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
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

          <Card id="quick-actions" className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>Jump to common ministry tasks</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <QuickActionsList actions={DASHBOARD_QUICK_ACTIONS} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DashboardAttendanceChart />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Members by Status</CardTitle>
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
      </div>
    </DashboardModuleShell>
  );
}
