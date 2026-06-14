'use client';

import type { MembershipCongregantAnalyticsDto } from '@church-hub/shared-types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const chartTick = { fontSize: 11, fontFamily: 'Montserrat' };

function ChartCard({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: Array<{ label: string; count: number }>;
}) {
  const chartData = data.map((d) => ({ name: d.label, count: d.count }));
  return (
    <Card className="border-slate-200/80 dark:border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[260px]">
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={chartTick} interval={0} angle={-25} textAnchor="end" height={56} />
              <YAxis allowDecimals={false} tick={chartTick} width={32} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function CongregantsAnalyticsView({ analytics }: { analytics: MembershipCongregantAnalyticsDto }) {
  return (
    <div className="space-y-4" data-testid="congregant-analytics-charts">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Congregant analytics</h2>
        <p className="text-sm text-muted-foreground">
          Registry breakdown by family role, age distribution, and gender.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="By family role"
          description="Household roles assigned to congregants"
          data={analytics.byFamilyRole}
        />
        <ChartCard
          title="By age"
          description="Congregant age distribution buckets"
          data={analytics.byAgeDistribution}
        />
        <ChartCard title="By gender" description="Congregant gender distribution" data={analytics.byGender} />
      </div>
    </div>
  );
}
