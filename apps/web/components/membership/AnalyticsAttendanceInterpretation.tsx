'use client';

import { useMemo } from 'react';
import { formatAttendanceDate } from '@/components/reports/month-grouped-attendance';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

function UnitSeriesCard({
  title,
  description,
  units,
  empty,
}: {
  title: string;
  description: string;
  units: UnitSeries[];
  empty: string;
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {interpreted.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="space-y-2">
            {interpreted.map((u) => (
              <div
                key={u.serviceUnitId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold">{u.serviceUnitName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {u.departmentCode ?? 'Unit'}
                    {u.latest
                      ? ` · latest ${formatAttendanceDate(u.latest.period)} · ${u.latest.total}`
                      : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums leading-none">{u.average}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Avg headcount
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsAttendanceInterpretation() {
  const { data, isLoading } = useApiQuery<AttendancePerformance>(
    ['analytics-attendance-performance'],
    '/admin/attendance-performance',
  );

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading Sunday & CHOP attendance…</p>
    );
  }

  return (
    <section
      className="membership-hub-section space-y-4"
      aria-labelledby="attendance-interpretation-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="attendance-interpretation-heading" className="text-lg font-semibold">
          Sunday & CHOP attendance
        </h2>
        {data?.summary ? (
          <Badge variant="outline" className="tabular-nums">
            Sanctuary latest {data.summary.latest} · avg {data.summary.average}
          </Badge>
        ) : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <UnitSeriesCard
          title="Sunday Attendance"
          description="Ushering, Protocol, Youth, Teens & Children — interpreted from weekly submissions."
          units={data?.sundayMeetingByUnit ?? []}
          empty="No Sunday attendance recorded for this period."
        />
        <UnitSeriesCard
          title="CHOP Attendance"
          description="Church Admin headcount by unit — same data shown in Admin Reports."
          units={data?.chopAttendanceByUnit ?? []}
          empty="No CHOP attendance recorded yet. Church Admin updates this from the Units module."
        />
      </div>
    </section>
  );
}
