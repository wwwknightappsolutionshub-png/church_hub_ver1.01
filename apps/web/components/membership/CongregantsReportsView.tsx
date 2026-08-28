'use client';

import type { MembershipDashboardStatsDto } from '@church-hub/shared-types';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function CongregantsReportsView() {
  const { data: stats } = useApiQuery<MembershipDashboardStatsDto>(
    ['membership-stats'],
    '/membership/stats',
  );

  return (
    <div className="space-y-4" data-testid="congregants-reports">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Reports</h2>
        <p className="text-sm text-muted-foreground">Registry summaries.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      </div>
    </div>
  );
}
