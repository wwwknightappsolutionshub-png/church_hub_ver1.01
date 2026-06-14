'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AttendancePerformance {
  source: string;
  serviceUnitName: string | null;
  weeks: Array<{
    period: string;
    label: string;
    total: number;
    male: number;
    female: number;
    babies: number;
    children: number;
  }>;
  summary: { average: number; latest: number; changePct: number };
}

const chartTick = { fontSize: 11, fontFamily: 'Montserrat' };

export function DashboardAttendanceChart() {
  const { data, isLoading } = useApiQuery<AttendancePerformance>(
    ['admin-attendance-performance'],
    '/admin/attendance-performance',
  );

  const chartData = useMemo(() => data?.weeks ?? [], [data?.weeks]);
  const hasData = chartData.some((w) => w.total > 0);

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Attendance Performance
          </CardTitle>
          <CardDescription>
            Weekly sanctuary headcounts from{' '}
            {data?.serviceUnitName ?? 'Ushering'} submissions
          </CardDescription>
        </div>
        <Badge variant={hasData ? 'default' : 'outline'}>{hasData ? 'Live' : 'No data yet'}</Badge>
      </CardHeader>
      <CardContent>
        {data?.summary && hasData ? (
          <div className="mb-4 grid grid-cols-3 gap-2 text-center sm:gap-4">
            <div className="rounded-lg bg-slate-50 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Latest</p>
              <p className="text-lg font-semibold tabular-nums">{data.summary.latest}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Average</p>
              <p className="text-lg font-semibold tabular-nums">{data.summary.average}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">WoW</p>
              <p
                className={`text-lg font-semibold tabular-nums ${data.summary.changePct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {data.summary.changePct > 0 ? '+' : ''}
                {data.summary.changePct}%
              </p>
            </div>
          </div>
        ) : null}
        <div className="h-56 sm:h-64">
          {isLoading ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading attendance…
            </p>
          ) : !hasData ? (
            <p className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
              Submit weekly headcounts from the Ushering department to populate this chart.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={chartTick} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={chartTick} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    fontFamily: 'Montserrat',
                  }}
                />
                <Bar dataKey="total" fill="hsl(160 84% 39%)" radius={[6, 6, 0, 0]} name="Total attendees" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
