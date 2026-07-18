'use client';

import { Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const PIE_COLORS = ['#0f766e', '#1e3a5f', '#b45309', '#64748b'];
const chartTick = { fontSize: 11, fontFamily: 'Montserrat, sans-serif' };

export interface BranchAnalyticsDto {
  periodWeeks: number;
  windowStart: string;
  weeks: Array<{
    weekStart: string;
    label: string;
    male: number;
    female: number;
    boys: number;
    girls: number;
    testifiers: number;
    firstTimers: number;
    total: number;
  }>;
  totals: {
    male: number;
    female: number;
    boys: number;
    girls: number;
    testifiers: number;
    firstTimers: number;
    total: number;
  };
  growthPercent: number;
  demographicPie: Array<{ name: string; value: number }>;
  firstTimersTotal: number;
  testifiersTotal: number;
}

export function BranchAnalyticsPanel({ branchId }: { branchId: string }) {
  const { data, isLoading, error } = useApiQuery<BranchAnalyticsDto>(
    ['ministry-cells', 'branch-analytics', branchId],
    `/ministry-cells/branches/${branchId}/analytics`,
    { enabled: !!branchId },
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Could not load branch analytics.
      </p>
    );
  }

  const growthUp = data.growthPercent >= 0;
  const summary = [
    { label: 'Male', value: data.totals.male },
    { label: 'Female', value: data.totals.female },
    { label: 'Boys', value: data.totals.boys },
    { label: 'Girls', value: data.totals.girls },
    { label: 'First timers', value: data.firstTimersTotal },
  ];

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">4-week performance</CardTitle>
          <CardDescription>
            Aggregated attendance demographics and growth vs the prior two weeks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold',
                growthUp ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-900',
              )}
            >
              {growthUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {growthUp ? '+' : ''}
              {data.growthPercent}% growth
            </div>
            <p className="text-sm text-muted-foreground">
              Total attendance (4 weeks):{' '}
              <span className="font-semibold text-foreground">{data.totals.total}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {summary.map((s) => (
              <div key={s.label} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Demographics</CardTitle>
            <CardDescription>Share of Male / Female / Boys / Girls</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            {data.demographicPie.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No demographic data yet. Record weekly attendance to populate this chart.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.demographicPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                  >
                    {data.demographicPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weekly trend</CardTitle>
            <CardDescription>Attendance total by week</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeks} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={chartTick} />
                <YAxis allowDecimals={false} tick={chartTick} width={28} />
                <Tooltip />
                <Bar dataKey="total" name="Total" fill="#0f766e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="firstTimers" name="First timers" fill="#b45309" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
