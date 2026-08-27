'use client';

import type { MembershipDashboardStatsDto, UsheringWeeklyAttendanceFlowDto } from '@church-hub/shared-types';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function CongregantsReportsView() {
  const { data: stats } = useApiQuery<MembershipDashboardStatsDto>(
    ['membership-stats'],
    '/membership/stats',
  );
  const { data: usheringFlow } = useApiQuery<UsheringWeeklyAttendanceFlowDto>(
    ['membership-weekly-attendance-flow'],
    '/membership/weekly-attendance-flow?weeks=6',
  );
  const weeks = usheringFlow?.weeks ?? [];

  return (
    <div className="space-y-4" data-testid="congregants-reports">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Reports</h2>
        <p className="text-sm text-muted-foreground">
          Registry summaries and attendance performance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Congregants</CardDescription>
            <CardTitle className="text-2xl">{stats?.congregants ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Families</CardDescription>
            <CardTitle className="text-2xl">{stats?.families ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In onboarding</CardDescription>
            <CardTitle className="text-2xl">{stats?.inOnboarding ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ushering weeks tracked</CardDescription>
            <CardTitle className="text-2xl">{weeks.length || '—'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly attendance summary</CardTitle>
          <CardDescription>Sanctuary headcounts from the Ushering service unit (last six weeks)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Week</th>
                  <th className="py-2 pr-4">Male</th>
                  <th className="py-2 pr-4">Female</th>
                  <th className="py-2 pr-4">Babies</th>
                  <th className="py-2 pr-4">Children</th>
                  <th className="py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((row) => (
                  <tr key={row.period} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 font-medium">{row.period}</td>
                    <td className="py-2 pr-4">{row.male}</td>
                    <td className="py-2 pr-4">{row.female}</td>
                    <td className="py-2 pr-4">{row.babies}</td>
                    <td className="py-2 pr-4">{row.children}</td>
                    <td className="py-2 font-medium">{row.totalAttendees}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
