'use client';

import { useMemo } from 'react';
import { formatAttendanceDate } from '@/components/reports/month-grouped-attendance';
import { AnalyticsEmptyState, AnalyticsPanel } from '@/components/membership/AnalyticsPanel';
import { Badge } from '@/components/ui/badge';
import { useApiQuery } from '@/lib/hooks/use-api-query';

type UnitWeek = {
  period: string;
  total: number;
  male: number;
  female: number;
  boys: number;
  girls: number;
};

type UnitSeries = {
  serviceUnitId: string;
  serviceUnitName: string;
  departmentCode: string | null;
  weeks: UnitWeek[];
};

type AttendancePerformance = {
  weeks: Array<{ period: string; total: number }>;
  summary: { average: number; latest: number; changePct: number };
  sundayMeetingByUnit?: UnitSeries[];
  chopAttendanceByUnit?: UnitSeries[];
};

function UnitSeriesPanel({
  title,
  description,
  units,
  empty,
  accent,
}: {
  title: string;
  description: string;
  units: UnitSeries[];
  empty: string;
  accent?: 'primary' | 'gold' | 'slate';
}) {
  const interpreted = useMemo(
    () =>
      units.map((u) => {
        const totals = u.weeks.map((w) => w.total).filter((n) => n > 0);
        const average =
          totals.length > 0
            ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length)
            : 0;
        const latest = u.weeks.length ? u.weeks[u.weeks.length - 1] : null;
        return { ...u, average, latest };
      }),
    [units],
  );

  return (
    <AnalyticsPanel title={title} subtitle={description} accent={accent}>
      {interpreted.length === 0 ? (
        <AnalyticsEmptyState>{empty}</AnalyticsEmptyState>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {interpreted.map((u) => (
            <li
              key={u.serviceUnitId}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {u.serviceUnitName}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {u.departmentCode ?? 'Unit'}
                  {u.latest
                    ? ` · latest ${formatAttendanceDate(u.latest.period)} · ${u.latest.total}`
                    : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="font-heading text-lg font-bold tabular-nums leading-none text-slate-900 dark:text-slate-50">
                  {u.average}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Avg headcount
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AnalyticsPanel>
  );
}

export function AnalyticsAttendanceInterpretation({
  serviceType = 'all',
}: {
  serviceType?: 'all' | 'sunday' | 'chop';
}) {
  const { data, isLoading } = useApiQuery<AttendancePerformance>(
    ['analytics-attendance-performance'],
    '/admin/attendance-performance',
  );

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading Sunday & CHOP attendance…</p>
    );
  }

  const showSunday = serviceType === 'all' || serviceType === 'sunday';
  const showChop = serviceType === 'all' || serviceType === 'chop';

  return (
    <section
      className="membership-hub-section space-y-4"
      aria-labelledby="attendance-interpretation-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Service pulse
          </p>
          <h2
            id="attendance-interpretation-heading"
            className="font-heading text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50"
          >
            Sunday & CHOP attendance
          </h2>
        </div>
        {data?.summary ? (
          <Badge
            variant="outline"
            className="tabular-nums border-slate-300 bg-white text-slate-700 dark:border-slate-600"
          >
            Sanctuary latest {data.summary.latest} · avg {data.summary.average}
          </Badge>
        ) : null}
      </div>
      <div className={showSunday && showChop ? 'grid gap-4 lg:grid-cols-2' : 'grid gap-4'}>
        {showSunday ? (
          <UnitSeriesPanel
            title="Sunday Attendance"
            description="Ushering, Protocol, Youth, Teens & Children — interpreted from weekly submissions."
            units={data?.sundayMeetingByUnit ?? []}
            empty="No Sunday attendance recorded for this period."
          />
        ) : null}
        {showChop ? (
          <UnitSeriesPanel
            title="CHOP Attendance"
            description="Church Admin headcount by unit — same data shown in Admin Reports."
            units={data?.chopAttendanceByUnit ?? []}
            empty="No CHOP attendance recorded yet. Church Admin updates this from the Units module."
            accent="gold"
          />
        ) : null}
      </div>
    </section>
  );
}
