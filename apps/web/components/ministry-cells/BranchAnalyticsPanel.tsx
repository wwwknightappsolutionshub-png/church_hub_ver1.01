'use client';

import { Loader2 } from 'lucide-react';
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

  return (
    <div className="space-y-4">
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
