'use client';

import { useMemo, useState } from 'react';
import { openAttendanceReportPdf } from '@/lib/attendance-report-pdf';
import { toast } from 'sonner';
import {
  AttendanceExcelTable,
  AttendanceInboxShell,
  AttendanceMetricCard,
  AttendanceMetricRow,
  filterAttendanceRows,
  formatAttendanceDate,
  groupByMonth,
  MonthGroupedSections,
} from '@/components/reports/month-grouped-attendance';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type CellAttendanceReportItem = {
  id: string;
  branchId: string;
  branchName: string;
  location: string | null;
  meetingDate: string;
  weekStart: string;
  createdAt: string;
  presentCount: number;
  maleCount: number;
  femaleCount: number;
  boysCount: number;
  girlsCount: number;
  testifiersCount: number;
  firstTimersCount: number;
  recordedBy: { id: string; firstName: string; lastName: string } | null;
};

export type UnitAttendanceReportItem = {
  id: string;
  serviceUnitId: string;
  serviceUnitName: string;
  departmentCode: string | null;
  meetingDate: string;
  weekStart: string;
  createdAt: string;
  presentCount: number;
  maleCount: number;
  femaleCount: number;
  boysCount: number;
  girlsCount: number;
  testifiersCount: number;
  firstTimersCount: number;
  recordedBy: { id: string; firstName: string; lastName: string } | null;
};

export type SundayMeetingAttendanceItem = {
  id: string;
  source: 'ushering' | 'unit_attendance' | 'children_weekly';
  serviceUnitId: string;
  serviceUnitName: string;
  departmentCode: string | null;
  meetingDate: string;
  weekStart: string;
  createdAt: string;
  presentCount: number;
  maleCount: number;
  femaleCount: number;
  boysCount: number;
  girlsCount: number;
  babiesCount: number;
  childrenCount: number;
  testifiersCount: number;
  firstTimersCount: number;
  recordedBy: { id: string; firstName: string; lastName: string } | null;
};

export type OutreachInboxItem = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  convertStage: string;
  capturedAt: string;
  locationLabel: string | null;
  needsBusPickup: boolean;
  evangelist: string | null;
};

export type ServiceUnitInboxItem = {
  id: string;
  name: string;
  departmentCode: string | null;
};

type DeptReportItem = {
  id: string;
  title: string;
  body: string;
  submittedAt: string;
  author: { id: string; userId: string | null; firstName: string; lastName: string };
  serviceUnit: { id: string; name: string; departmentCode: string | null };
};

function exportMetricPdf(row: AttendanceMetricRow, kindLabel: string) {
  try {
    openAttendanceReportPdf({
      title: row.title,
      subtitle: row.subtitle,
      kindLabel,
      rows: [
        {
          dateLabel: formatAttendanceDate(row.meetingDate),
          presentCount: row.presentCount,
          maleCount: row.maleCount,
          femaleCount: row.femaleCount,
          boysCount: row.boysCount,
          girlsCount: row.girlsCount,
          testifiersCount: row.testifiersCount ?? 0,
          firstTimersCount: row.firstTimersCount ?? 0,
        },
      ],
    });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Could not export PDF');
  }
}

function toMetricRowsFromCells(items: CellAttendanceReportItem[]): AttendanceMetricRow[] {
  return items.map((r) => ({
    id: r.id,
    title: r.branchName,
    subtitle: [
      r.location,
      r.recordedBy ? `${r.recordedBy.firstName} ${r.recordedBy.lastName}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    meetingDate: r.meetingDate,
    presentCount: r.presentCount,
    maleCount: r.maleCount,
    femaleCount: r.femaleCount,
    boysCount: r.boysCount,
    girlsCount: r.girlsCount,
    testifiersCount: r.testifiersCount,
    firstTimersCount: r.firstTimersCount,
  }));
}

function toMetricRowsFromSunday(items: SundayMeetingAttendanceItem[]): AttendanceMetricRow[] {
  return items.map((r) => ({
    id: r.id,
    title: r.serviceUnitName,
    subtitle: [
      r.departmentCode,
      r.recordedBy ? `${r.recordedBy.firstName} ${r.recordedBy.lastName}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    meetingDate: r.meetingDate,
    presentCount: r.presentCount,
    maleCount: r.maleCount,
    femaleCount: r.femaleCount,
    boysCount: r.source === 'ushering' ? r.babiesCount : r.boysCount,
    girlsCount: r.source === 'ushering' ? r.childrenCount : r.girlsCount,
    testifiersCount: r.testifiersCount,
    firstTimersCount: r.firstTimersCount,
    metricLabels:
      r.source === 'ushering' ? { boys: 'Babies', girls: 'Children' } : undefined,
  }));
}

function toMetricRowsFromUnits(items: UnitAttendanceReportItem[]): AttendanceMetricRow[] {
  return items.map((r) => ({
    id: r.id,
    title: r.serviceUnitName,
    subtitle: [
      r.departmentCode,
      r.recordedBy ? `${r.recordedBy.firstName} ${r.recordedBy.lastName}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    meetingDate: r.meetingDate,
    presentCount: r.presentCount,
    maleCount: r.maleCount,
    femaleCount: r.femaleCount,
    boysCount: r.boysCount,
    girlsCount: r.girlsCount,
    testifiersCount: r.testifiersCount,
    firstTimersCount: r.firstTimersCount,
  }));
}

function MetricAttendanceInbox({
  title,
  description,
  emptyMessage,
  testId,
  kindLabel,
  rows,
  dateFrom,
  dateTo,
  setDateFrom,
  setDateTo,
  viewMode,
  setViewMode,
  accentClass,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  testId: string;
  kindLabel: string;
  rows: AttendanceMetricRow[];
  dateFrom: string;
  dateTo: string;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  viewMode: 'cards' | 'table';
  setViewMode: (v: 'cards' | 'table') => void;
  accentClass?: string;
}) {
  const groups = useMemo(() => groupByMonth(rows, (r) => r.meetingDate), [rows]);

  return (
    <AttendanceInboxShell
      title={title}
      description={description}
      count={rows.length}
      emptyMessage={emptyMessage}
      testId={testId}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateFrom={setDateFrom}
      onDateTo={setDateTo}
      onClearDates={() => {
        setDateFrom('');
        setDateTo('');
      }}
      viewMode={viewMode}
      onViewMode={setViewMode}
    >
      {viewMode === 'table' ? (
        <AttendanceExcelTable
          rows={rows}
          testId={`${testId}-excel`}
          onPdf={(row) => exportMetricPdf(row, kindLabel)}
        />
      ) : (
        <MonthGroupedSections
          groups={groups}
          renderItem={(row) => (
            <AttendanceMetricCard
              key={row.id}
              row={row}
              accentClass={accentClass}
              onPdf={() => exportMetricPdf(row, kindLabel)}
            />
          )}
        />
      )}
    </AttendanceInboxShell>
  );
}

export function CellAttendanceInbox({ all }: { all: CellAttendanceReportItem[] }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const filtered = useMemo(
    () =>
      filterAttendanceRows(
        all,
        (r) => r.meetingDate || r.createdAt,
        dateFrom,
        dateTo,
        dateFrom || dateTo ? undefined : (r) => r.branchId,
      ),
    [all, dateFrom, dateTo],
  );
  const rows = useMemo(() => toMetricRowsFromCells(filtered), [filtered]);

  return (
    <MetricAttendanceInbox
      title="Ministry / Cells attendance"
      description={
        dateFrom || dateTo
          ? 'Filtered by meeting date · grouped by month · scroll for more.'
          : 'Latest per branch · auto-grouped by month · use dates to filter.'
      }
      emptyMessage={
        dateFrom || dateTo
          ? 'No attendance reports in this date range.'
          : 'No Ministry/Cells attendance reports yet. Record attendance from a branch Weekly tab.'
      }
      testId="reports-cell-attendance-inbox"
      kindLabel="Ministry / Cells attendance"
      rows={rows}
      dateFrom={dateFrom}
      dateTo={dateTo}
      setDateFrom={setDateFrom}
      setDateTo={setDateTo}
      viewMode={viewMode}
      setViewMode={setViewMode}
      accentClass="border-l-4 border-l-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/20"
    />
  );
}

export function WeeklySundayMeetingInbox({ all }: { all: SundayMeetingAttendanceItem[] }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const filtered = useMemo(
    () =>
      filterAttendanceRows(all, (r) => r.meetingDate || r.createdAt, dateFrom, dateTo),
    [all, dateFrom, dateTo],
  );
  const rows = useMemo(() => toMetricRowsFromSunday(filtered), [filtered]);

  return (
    <MetricAttendanceInbox
      title="Weekly reports — Sunday meetings"
      description="Ushering, Protocol, Youth, Teens & Children · weekly rows grouped by month."
      emptyMessage="No Sunday meeting attendance yet from Ushering, Protocol, Youth, Teens, or Children."
      testId="reports-weekly-sunday-inbox"
      kindLabel="Sunday meeting attendance"
      rows={rows}
      dateFrom={dateFrom}
      dateTo={dateTo}
      setDateFrom={setDateFrom}
      setDateTo={setDateTo}
      viewMode={viewMode}
      setViewMode={setViewMode}
      accentClass="border-l-4 border-l-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/20"
    />
  );
}

export function DepartmentReportsInbox({
  units,
  unitAttendance,
  departmentReports,
}: {
  units: ServiceUnitInboxItem[];
  unitAttendance: UnitAttendanceReportItem[];
  departmentReports: DeptReportItem[];
}) {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const selectedUnit = units.find((u) => u.id === selectedUnitId) ?? null;

  const unitRows = useMemo(() => {
    if (!selectedUnitId) return [];
    const scoped = unitAttendance.filter((r) => r.serviceUnitId === selectedUnitId);
    return filterAttendanceRows(
      scoped,
      (r) => r.meetingDate || r.createdAt,
      dateFrom,
      dateTo,
    );
  }, [unitAttendance, selectedUnitId, dateFrom, dateTo]);

  const metricRows = useMemo(() => toMetricRowsFromUnits(unitRows), [unitRows]);
  const unitDeptReports = useMemo(
    () =>
      selectedUnitId
        ? departmentReports.filter((r) => r.serviceUnit.id === selectedUnitId)
        : [],
    [departmentReports, selectedUnitId],
  );

  if (!selectedUnit) {
    return (
      <Card className="flex min-h-[16rem] flex-col" data-testid="reports-department-units">
        <CardHeader className="space-y-1 p-3 pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold">Department reports</CardTitle>
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] tabular-nums">
              {units.length}
            </Badge>
          </div>
          <CardDescription className="text-[11px]">
            Select a unit / department to view attendance in the Ministry / Cells layout.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[min(28rem,58vh)] overflow-y-auto p-3 pt-0">
          <div className="grid gap-2 sm:grid-cols-2">
            {units.map((u) => {
              const attCount = unitAttendance.filter((a) => a.serviceUnitId === u.id).length;
              const reportCount = departmentReports.filter((d) => d.serviceUnit.id === u.id)
                .length;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUnitId(u.id)}
                  className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-left transition hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:hover:bg-sky-950/70"
                >
                  <p className="text-sm font-semibold">{u.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {u.departmentCode ?? 'Unit'} · {attCount} attendance · {reportCount} reports
                  </p>
                </button>
              );
            })}
            {units.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active service units found.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="text-[11px] font-medium text-primary hover:underline"
          onClick={() => setSelectedUnitId(null)}
        >
          ← All units
        </button>
        <span className="text-[11px] text-muted-foreground">{selectedUnit.name}</span>
      </div>
      <MetricAttendanceInbox
        title={`${selectedUnit.name} attendance`}
        description="Same layout as Ministry / Cells · monthly collapsible sections."
        emptyMessage="No attendance records for this unit yet."
        testId="reports-department-unit-attendance"
        kindLabel={`${selectedUnit.name} attendance`}
        rows={metricRows}
        dateFrom={dateFrom}
        dateTo={dateTo}
        setDateFrom={setDateFrom}
        setDateTo={setDateTo}
        viewMode={viewMode}
        setViewMode={setViewMode}
        accentClass="border-l-4 border-l-sky-500 bg-sky-50/80 dark:bg-sky-950/20"
      />
      {unitDeptReports.length > 0 ? (
        <Card>
          <CardHeader className="space-y-1 p-3 pb-2">
            <CardTitle className="text-sm font-semibold">Submitted department reports</CardTitle>
          </CardHeader>
          <CardContent className="max-h-48 space-y-2 overflow-y-auto p-3 pt-0">
            {unitDeptReports.map((r) => (
              <article key={r.id} className="rounded-md border px-2.5 py-2 text-sm">
                <p className="font-medium">{r.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.author.firstName} {r.author.lastName} ·{' '}
                  {new Date(r.submittedAt).toLocaleString()}
                </p>
                <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{r.body}</p>
              </article>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function OutreachInbox({ all }: { all: OutreachInboxItem[] }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const filtered = useMemo(
    () => filterAttendanceRows(all, (r) => r.capturedAt, dateFrom, dateTo),
    [all, dateFrom, dateTo],
  );

  const groups = useMemo(() => groupByMonth(filtered, (r) => r.capturedAt), [filtered]);

  return (
    <AttendanceInboxShell
      title="Outreach"
      description="Field captures by month · filter by capture date · Cards or Excel."
      count={filtered.length}
      emptyMessage="No outreach contacts yet."
      testId="reports-outreach-inbox"
      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateFrom={setDateFrom}
      onDateTo={setDateTo}
      onClearDates={() => {
        setDateFrom('');
        setDateTo('');
      }}
      viewMode={viewMode}
      onViewMode={setViewMode}
    >
      {viewMode === 'table' ? (
        <div className="overflow-x-auto rounded-md border border-border/70">
          <table className="w-full min-w-[640px] border-collapse text-left text-[11px]">
            <thead className="sticky top-0 z-[1] bg-muted/95 backdrop-blur">
              <tr className="border-b text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-1.5 font-semibold">Name</th>
                <th className="px-2 py-1.5 font-semibold">Stage</th>
                <th className="px-2 py-1.5 font-semibold">Phone</th>
                <th className="px-2 py-1.5 font-semibold">Evangelist</th>
                <th className="px-2 py-1.5 font-semibold">Captured</th>
                <th className="px-2 py-1.5 font-semibold">Bus</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.id}
                  className={cn(
                    'border-b border-border/50',
                    i % 2 === 0 ? 'bg-background' : 'bg-muted/30',
                  )}
                >
                  <td className="px-2 py-1 font-medium">
                    {r.firstName}
                    {r.lastName ? ` ${r.lastName}` : ''}
                  </td>
                  <td className="px-2 py-1">{r.convertStage}</td>
                  <td className="px-2 py-1">{r.phone || '—'}</td>
                  <td className="px-2 py-1">{r.evangelist || '—'}</td>
                  <td className="whitespace-nowrap px-2 py-1">
                    {formatAttendanceDate(r.capturedAt)}
                  </td>
                  <td className="px-2 py-1">{r.needsBusPickup ? 'Yes' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <MonthGroupedSections
          groups={groups}
          renderItem={(r) => (
            <article
              key={r.id}
              className="rounded-md border border-l-4 border-l-rose-500 bg-rose-50/70 px-2.5 py-1.5 dark:bg-rose-950/20"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {r.firstName}
                    {r.lastName ? ` ${r.lastName}` : ''}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.convertStage}
                    {r.evangelist ? ` · ${r.evangelist}` : ''}
                    {r.locationLabel ? ` · ${r.locationLabel}` : ''}
                    {' · '}
                    {formatAttendanceDate(r.capturedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.needsBusPickup ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Bus pickup
                    </Badge>
                  ) : null}
                  <span className="text-[11px] text-muted-foreground">
                    {r.phone || r.email || ''}
                  </span>
                </div>
              </div>
            </article>
          )}
        />
      )}
    </AttendanceInboxShell>
  );
}
