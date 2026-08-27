'use client';

import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { MembershipAnalyticsDashboardDto } from '@church-hub/shared-types';
import { useMembershipAnalytics } from '@/lib/hooks/use-membership-analytics';
import {
  LazyAnalyticsGrowthCharts,
  LazyAnalyticsOpsCharts,
} from '@/lib/membership-lazy';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { enterpriseHeroChipClass } from '@/components/layout/EnterpriseModuleShell';
import { DashboardPageSkeleton } from '@/components/dashboard/DashboardPageSkeleton';
import { AnalyticsAttendanceInterpretation } from '@/components/membership/AnalyticsAttendanceInterpretation';
import { AnalyticsKpiRail } from '@/components/membership/AnalyticsKpiRail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const ANALYTICS_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'trends', label: 'Trends' },
] as const;

type AnalyticsTabId = (typeof ANALYTICS_TABS)[number]['id'];

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function AnalyticsTabPanel({
  tabId,
  active,
  children,
}: {
  tabId: AnalyticsTabId;
  active: boolean;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  if (!active) return null;

  return (
    <motion.div
      key={tabId}
      id={`analytics-panel-${tabId}`}
      role="tabpanel"
      aria-labelledby={`analytics-tab-${tabId}`}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
      className="outline-none"
    >
      {children}
    </motion.div>
  );
}

export default function MembershipAnalyticsPage() {
  const [months, setMonths] = useState(6);
  const [activeTab, setActiveTab] = useState<AnalyticsTabId>('overview');
  const { data, isLoading, isError } = useMembershipAnalytics(months);
  const dash = data as MembershipAnalyticsDashboardDto | undefined;

  return (
    <DashboardModuleShell
      eyebrow="Executive intelligence"
      title="Membership Analytics"
      description={MODULE_DESCRIPTIONS.analytics}
      badge={
        <Badge className="border border-amber-200/45 bg-amber-400/25 px-3 py-1 text-amber-50 shadow-sm">
          Analytics
        </Badge>
      }
      actions={
        <div className="flex gap-1.5" role="group" aria-label="Select period">
          {[3, 6, 12].map((m) => (
            <Button
              key={m}
              size="sm"
              variant="outline"
              onClick={() => setMonths(m)}
              aria-pressed={months === m}
              className={cn(
                enterpriseHeroChipClass,
                'h-8 rounded-md px-3 text-xs',
                months === m && 'border-amber-200/60 bg-amber-400/30 text-white',
              )}
            >
              {m} mo
            </Button>
          ))}
        </div>
      }
      tabs={[...ANALYTICS_TABS]}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as AnalyticsTabId)}
      tabAriaLabel="Analytics sections"
    >
      <div className="membership-hub-root space-y-5">
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
            <AnalyticsTabPanel tabId="overview" active={activeTab === 'overview'}>
              <div className="space-y-5">
                <AnalyticsKpiRail
                  items={[
                    {
                      label: 'Total members',
                      value: dash.summary.totalMembers.toLocaleString(),
                      hint: 'Registry headcount',
                    },
                    {
                      label: 'Active / discipled',
                      value: dash.summary.activeMembers.toLocaleString(),
                      hint: 'Engaged members',
                    },
                    {
                      label: 'Outreach contacts',
                      value: dash.summary.outreachContacts.toLocaleString(),
                      hint: `${months} mo window`,
                    },
                    {
                      label: 'Outreach completion',
                      value: pct(dash.summary.followUpCompletionRate),
                      hint: `Attendance avg ${pct(dash.summary.averageAttendanceRate)}`,
                    },
                  ]}
                />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Growth intelligence
                  </p>
                  <h2 className="mb-3 font-heading text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    Membership trajectory
                  </h2>
                  <LazyAnalyticsGrowthCharts dash={dash} />
                </div>
              </div>
            </AnalyticsTabPanel>

            <AnalyticsTabPanel tabId="attendance" active={activeTab === 'attendance'}>
              <AnalyticsAttendanceInterpretation />
            </AnalyticsTabPanel>

            <AnalyticsTabPanel tabId="trends" active={activeTab === 'trends'}>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Operations
                </p>
                <h2 className="mb-3 font-heading text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  Attendance & pipeline trends
                </h2>
                <LazyAnalyticsOpsCharts dash={dash} />
              </div>
            </AnalyticsTabPanel>
          </>
        )}
      </div>
    </DashboardModuleShell>
  );
}
