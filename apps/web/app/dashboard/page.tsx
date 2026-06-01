'use client';

import { useEffect, useState } from 'react';
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
  Sparkles,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { DEMO_ACTIVITY } from '@/lib/demo-data';
import { normalizeDashboardMetrics, type DashboardMetrics } from '@/lib/dashboard-metrics';
import { DASHBOARD_QUICK_ACTIONS } from '@/lib/quick-actions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { QuickActionsList, QuickActionsMenu } from '@/components/dashboard/QuickActionsMenu';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const chartTick = { fontSize: 12, fontFamily: 'Montserrat' };
const chartTickSm = { fontSize: 11, fontFamily: 'Montserrat' };

const growthData = [
  { month: 'Jan', members: 2100, outreach: 820 },
  { month: 'Feb', members: 2250, outreach: 910 },
  { month: 'Mar', members: 2380, outreach: 980 },
  { month: 'Apr', members: 2510, outreach: 1050 },
  { month: 'May', members: 2680, outreach: 1180 },
  { month: 'Jun', members: 2847, outreach: 1248 },
];

export default function DashboardPage() {
  const router = useRouter();
  const { isPlatformAdmin, isChurchStaff, isLoading: accessLoading } = useModuleAccess();
  const [metrics, setMetrics] = useState<DashboardMetrics>(() =>
    normalizeDashboardMetrics(null),
  );
  const [isDemo, setIsDemo] = useState(true);

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
    api
      .get('/admin/dashboard')
      .then((r) => {
        setMetrics(normalizeDashboardMetrics(r.data));
        setIsDemo(false);
      })
      .catch(() => {});
  }, [isPlatformAdmin]);

  const chartData = metrics.membership.byStatus.map((s) => ({
    name: s.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    count: s._count,
  }));

  return (
    <DashboardModuleShell
      eyebrow="Executive overview"
      title="Good morning, Pastor"
      description="Operational snapshot of membership, outreach, communications, and automation across your organization."
      badge={isDemo ? <Badge variant="gold">Demo data</Badge> : undefined}
      actions={
        <QuickActionsMenu actions={DASHBOARD_QUICK_ACTIONS} scrollTargetId="quick-actions" />
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Members" value={metrics.membership.total.toLocaleString()} change={12} changeLabel="vs last month" icon={Users} />
          <StatCard label="Outreach Contacts" value={metrics.evangelism.totalContacts.toLocaleString()} change={24} changeLabel="89 this month" icon={Megaphone} />
          <StatCard label="Follow-up Rate" value={`${Math.round(metrics.followUp.completionRate * 100)}%`} change={5} changeLabel="34 pending" icon={HeartHandshake} />
          <StatCard label="Active Rides" value={metrics.bus.activeRides} change={-3} changeLabel="41 completed today" icon={Bus} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Growth Overview</CardTitle>
                <CardDescription>Members & outreach over 6 months</CardDescription>
              </div>
              <Badge variant="outline">{isDemo ? 'Sample' : 'Live'}</Badge>
            </CardHeader>
            <CardContent className="h-72">
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
                  <Area type="monotone" dataKey="members" stroke="hsl(var(--primary))" fill="url(#memberGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="outreach" stroke="hsl(var(--gold))" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card id="quick-actions">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>Jump to common ministry tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <QuickActionsList actions={DASHBOARD_QUICK_ACTIONS} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Sparkles className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {DEMO_ACTIVITY.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{item.message}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {item.module}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{item.time}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardModuleShell>
  );
}
