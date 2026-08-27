'use client';

import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Download, FileText } from 'lucide-react';
import type { MembershipAnalyticsDashboardDto } from '@church-hub/shared-types';
import { useMembershipAnalytics } from '@/lib/hooks/use-membership-analytics';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import {
  LazyAnalyticsGrowthCharts,
  LazyAnalyticsOpsCharts,
} from '@/lib/membership-lazy';
import {
  downloadAnalyticsCsv,
  openAnalyticsReportPdf,
} from '@/lib/membership-analytics-export';
import {
  DEFAULT_ANALYTICS_FILTERS,
  appliedFiltersHint,
  type AnalyticsUiFilters,
} from '@/lib/membership-analytics-filters';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { isChurchAdminRole, isPastorRole } from '@/lib/session-role';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { enterpriseHeroChipClass } from '@/components/layout/EnterpriseModuleShell';
import { DashboardPageSkeleton } from '@/components/dashboard/DashboardPageSkeleton';
import { AnalyticsAttendanceInterpretation } from '@/components/membership/AnalyticsAttendanceInterpretation';
import { AnalyticsDemographicsPanel } from '@/components/membership/AnalyticsDemographicsPanel';
import { AnalyticsFiltersBar } from '@/components/membership/AnalyticsFiltersBar';
import { AnalyticsKpiRail } from '@/components/membership/AnalyticsKpiRail';
import { AnalyticsTargetsPanel } from '@/components/membership/AnalyticsTargetsPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const ANALYTICS_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'trends', label: 'Trends' },
  { id: 'insights', label: 'Insights' },
] as const;

type AnalyticsTabId = (typeof ANALYTICS_TABS)[number]['id'];

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function formatDelta(n: number, asRate = false) {
  const sign = n > 0 ? '+' : '';
  if (asRate) return `${sign}${Math.round(n * 100)}pp`;
  return `${sign}${n.toLocaleString()}`;
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
  const { userRoles, canManageMembers } = useModuleAccess();
  const canEditTargets = canManageMembers || isPastorRole(userRoles) || isChurchAdminRole(userRoles);

  const [draft, setDraft] = useState<AnalyticsUiFilters>(DEFAULT_ANALYTICS_FILTERS);
  const [applied, setApplied] = useState<AnalyticsUiFilters>(DEFAULT_ANALYTICS_FILTERS);
  const [activeTab, setActiveTab] = useState<AnalyticsTabId>('overview');
  const { data, isLoading, isError, isFetching } = useMembershipAnalytics(applied);
  const dash = data as MembershipAnalyticsDashboardDto | undefined;

  const periodHint =
    applied.dateFrom && applied.dateTo
      ? `${applied.dateFrom} → ${applied.dateTo}`
      : `${applied.months} mo window`;

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
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Analytics actions">
          {[3, 6, 12].map((m) => (
            <Button
              key={m}
              size="sm"
              variant="outline"
              onClick={() => {
                const next = { ...draft, months: m, dateFrom: '', dateTo: '' };
                setDraft(next);
                setApplied(next);
              }}
              aria-pressed={applied.months === m && !applied.dateFrom}
              className={cn(
                enterpriseHeroChipClass,
                'h-8 rounded-md px-3 text-xs',
                applied.months === m &&
                  !applied.dateFrom &&
                  'border-amber-200/60 bg-amber-400/30 text-white',
              )}
            >
              {m} mo
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            className={cn(enterpriseHeroChipClass, 'h-8 rounded-md px-3 text-xs')}
            disabled={!dash}
            data-testid="analytics-export-csv"
            onClick={() => dash && downloadAnalyticsCsv(dash)}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={cn(enterpriseHeroChipClass, 'h-8 rounded-md px-3 text-xs')}
            disabled={!dash}
            data-testid="analytics-export-pdf"
            onClick={() => dash && openAnalyticsReportPdf(dash)}
          >
            <FileText className="mr-1 h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      }
      tabs={[...ANALYTICS_TABS]}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as AnalyticsTabId)}
      tabAriaLabel="Analytics sections"
    >
      <div className="membership-hub-root space-y-5">
        <AnalyticsFiltersBar
          draft={draft}
          onChange={setDraft}
          onApply={() => setApplied({ ...draft })}
          onReset={() => {
            setDraft(DEFAULT_ANALYTICS_FILTERS);
            setApplied(DEFAULT_ANALYTICS_FILTERS);
          }}
        />

        {(isLoading || isFetching) && !dash ? <DashboardPageSkeleton cards={4} /> : null}

        {isError && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Could not load analytics. Ensure you are signed in as church leadership.
            </CardContent>
          </Card>
        )}

        {dash && (
          <>
            <AnalyticsTabPanel tabId="overview" active={activeTab === 'overview'}>
              <div className="space-y-5">
                <AnalyticsKpiRail
                  items={[
                    {
                      label: 'Total members',
                      value: dash.summary.totalMembers.toLocaleString(),
                      hint: dash.comparison
                        ? `${formatDelta(dash.comparison.delta.totalMembers)} vs prior`
                        : 'Registry headcount',
                    },
                    {
                      label: 'Active / discipled',
                      value: dash.summary.activeMembers.toLocaleString(),
                      hint: dash.comparison
                        ? `${formatDelta(dash.comparison.delta.activeMembers)} vs prior`
                        : 'Engaged members',
                    },
                    {
                      label: 'Outreach contacts',
                      value: dash.summary.outreachContacts.toLocaleString(),
                      hint: dash.comparison
                        ? `${formatDelta(dash.comparison.delta.outreachContacts)} vs prior`
                        : periodHint,
                    },
                    {
                      label: 'Outreach completion',
                      value: pct(dash.summary.followUpCompletionRate),
                      hint: dash.comparison
                        ? `${formatDelta(dash.comparison.delta.followUpCompletionRate, true)} · Att ${pct(dash.summary.averageAttendanceRate)}`
                        : `Attendance avg ${pct(dash.summary.averageAttendanceRate)}`,
                    },
                  ]}
                />
                {appliedFiltersHint(dash.appliedFilters) ? (
                  <p className="text-xs text-muted-foreground" data-testid="analytics-applied-hint">
                    Filters: {appliedFiltersHint(dash.appliedFilters)}
                  </p>
                ) : null}
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
              <AnalyticsAttendanceInterpretation serviceType={applied.serviceType} />
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

            <AnalyticsTabPanel tabId="insights" active={activeTab === 'insights'}>
              <div className="space-y-5">
                <AnalyticsDemographicsPanel demographics={dash.demographics} />
                <AnalyticsTargetsPanel dash={dash} canEdit={canEditTargets} />
              </div>
            </AnalyticsTabPanel>
          </>
        )}
      </div>
    </DashboardModuleShell>
  );
}
