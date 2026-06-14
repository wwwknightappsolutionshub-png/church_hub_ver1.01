'use client';

import { useState } from 'react';
import { BarChart3, TrendingUp, Users } from 'lucide-react';
import type { MembershipAnalyticsDashboardDto } from '@church-hub/shared-types';
import { useMembershipAnalytics } from '@/lib/hooks/use-membership-analytics';
import { LazyAnalyticsCharts } from '@/lib/membership-lazy';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { DashboardPageSkeleton } from '@/components/dashboard/DashboardPageSkeleton';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

export default function MembershipAnalyticsPage() {
  const [months, setMonths] = useState(6);
  const { data, isLoading, isError } = useMembershipAnalytics(months);
  const dash = data as MembershipAnalyticsDashboardDto | undefined;

  return (
    <DashboardModuleShell
      title="Membership Analytics"
      description={MODULE_DESCRIPTIONS.analytics}
      badge={<Badge variant="outline" className="border-slate-500 text-slate-200">Analytics</Badge>}
      actions={
        <div className="flex gap-2" role="group" aria-label="Select period">
          {[3, 6, 12].map((m) => (
            <Button
              key={m}
              size="sm"
              variant={months === m ? 'default' : 'secondary'}
              onClick={() => setMonths(m)}
              aria-pressed={months === m}
            >
              {m} mo
            </Button>
          ))}
        </div>
      }
    >
      <div className="membership-hub-root space-y-6">
        {isLoading && <DashboardPageSkeleton cards={4} />}

        {isError && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Could not load analytics. Ensure you are signed in as church leadership.
            </CardContent>
          </Card>
        )}

        {dash && !isLoading && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total members"
                value={dash.summary.totalMembers.toLocaleString()}
                icon={Users}
              />
              <StatCard
                label="Active / discipled"
                value={dash.summary.activeMembers.toLocaleString()}
                icon={TrendingUp}
              />
              <StatCard
                label="Outreach contacts"
                value={dash.summary.outreachContacts.toLocaleString()}
                icon={BarChart3}
              />
              <StatCard
                label="Follow-up completion"
                value={pct(dash.summary.followUpCompletionRate)}
                changeLabel={`Attendance avg ${pct(dash.summary.averageAttendanceRate)}`}
                icon={BarChart3}
              />
            </div>
            <LazyAnalyticsCharts dash={dash} />
          </>
        )}
      </div>
    </DashboardModuleShell>
  );
}
