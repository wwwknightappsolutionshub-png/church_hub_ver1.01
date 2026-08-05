'use client';

import { useEffect, useMemo, useState } from 'react';
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
import {
  filterOutreachItems,
  OutreachAdvancedFiltersPanel,
} from '@/components/reports/outreach-advanced-filters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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

function exportMetricPdf(row: AttendanceMetricRow, kindLabel: string, autoPrint = false) {
  try {
    openAttendanceReportPdf({
      title: row.title,
      subtitle: row.subtitle,
      kindLabel,
      autoPrint,
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
  toolbarExtra,
  expandMonthGroups = false,
}: {
  title: string;
  description?: string;
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
  toolbarExtra?: React.ReactNode;
  /** Open month sections that contain the current (filtered) results. */
  expandMonthGroups?: boolean;
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
      onApplyDates={(from, to) => {
        setDateFrom(from);
        setDateTo(to);
      }}
      onClearDates={() => {
        setDateFrom('');
        setDateTo('');
      }}
      viewMode={viewMode}
      onViewMode={setViewMode}
      toolbarExtra={toolbarExtra}
    >
      {viewMode === 'table' ? (
        <MonthGroupedSections
          groups={groups}
          expandAll={expandMonthGroups}
          renderGroupBody={(items) => (
            <AttendanceExcelTable
              rows={items}
              testId={`${testId}-excel`}
              onPdf={(row) => exportMetricPdf(row, kindLabel, false)}
              onPrint={(row) => exportMetricPdf(row, kindLabel, true)}
            />
          )}
        />
      ) : (
        <MonthGroupedSections
          groups={groups}
          expandAll={expandMonthGroups}
          renderItem={(row) => (
            <AttendanceMetricCard
              key={row.id}
              row={row}
              accentClass={accentClass}
              onPdf={() => exportMetricPdf(row, kindLabel, false)}
              onPrint={() => exportMetricPdf(row, kindLabel, true)}
            />
          )}
        />
      )}
    </AttendanceInboxShell>
  );
}

function matchesCellSearch(haystack: string | null | undefined, needle: string) {
  if (!needle.trim()) return true;
  return (haystack ?? '').toLowerCase().includes(needle.trim().toLowerCase());
}

function CellAdvancedFiltersPanel({
  cellName,
  province,
  leader,
  onApply,
  onReset,
  className,
}: {
  cellName: string;
  province: string;
  leader: string;
  onApply: (next: { cellName: string; province: string; leader: string }) => void;
  onReset: () => void;
  className?: string;
}) {
  const [draftCell, setDraftCell] = useState(cellName);
  const [draftProvince, setDraftProvince] = useState(province);
  const [draftLeader, setDraftLeader] = useState(leader);

  useEffect(() => {
    setDraftCell(cellName);
    setDraftProvince(province);
    setDraftLeader(leader);
  }, [cellName, province, leader]);

  const dirty =
    draftCell !== cellName || draftProvince !== province || draftLeader !== leader;
  const hasApplied = Boolean(cellName || province || leader);
  const hasDraft = Boolean(draftCell || draftProvince || draftLeader);

  const go = () =>
    onApply({ cellName: draftCell, province: draftProvince, leader: draftLeader });

  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-1.5', className)}>
      <span className="hidden h-4 w-px bg-border sm:inline-block" aria-hidden />
      <Label htmlFor="cell-filter-name" className="sr-only">
        Cell name
      </Label>
      <input
        id="cell-filter-name"
        type="search"
        placeholder="Cell name"
        value={draftCell}
        onChange={(e) => setDraftCell(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            go();
          }
        }}
        className="h-7 w-[7.5rem] rounded-md border border-input bg-background px-2 text-[11px]"
      />
      <Label htmlFor="cell-filter-province" className="sr-only">
        Province name
      </Label>
      <input
        id="cell-filter-province"
        type="search"
        placeholder="Province"
        value={draftProvince}
        onChange={(e) => setDraftProvince(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            go();
          }
        }}
        className="h-7 w-[7.5rem] rounded-md border border-input bg-background px-2 text-[11px]"
      />
      <Label htmlFor="cell-filter-leader" className="sr-only">
        Cell leader
      </Label>
      <input
        id="cell-filter-leader"
        type="search"
        placeholder="Cell leader"
        value={draftLeader}
        onChange={(e) => setDraftLeader(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            go();
          }
        }}
        className="h-7 w-[7.5rem] rounded-md border border-input bg-background px-2 text-[11px]"
      />
      <Button
        type="button"
        size="sm"
        className="h-7 px-2.5 text-[11px]"
        disabled={!dirty}
        onClick={go}
      >
        Go
      </Button>
      {hasApplied || hasDraft ? (
        <button
          type="button"
          className="text-[11px] font-medium text-primary hover:underline"
          onClick={() => {
            setDraftCell('');
            setDraftProvince('');
            setDraftLeader('');
            onReset();
          }}
        >
          Reset
        </button>
      ) : null}
    </div>
  );
}

export function CellAttendanceInbox({ all }: { all: CellAttendanceReportItem[] }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [cellName, setCellName] = useState('');
  const [province, setProvince] = useState('');
  const [leader, setLeader] = useState('');

  const filtered = useMemo(() => {
    const dateFiltered = filterAttendanceRows(
      all,
      (r) => r.meetingDate || r.createdAt,
      dateFrom,
      dateTo,
      dateFrom || dateTo ? undefined : (r) => r.branchId,
    );
    return dateFiltered.filter((r) => {
      if (!matchesCellSearch(r.branchName, cellName)) return false;
      if (!matchesCellSearch(r.location, province)) return false;
      const leaderName = r.recordedBy
        ? `${r.recordedBy.firstName} ${r.recordedBy.lastName}`
        : '';
      if (!matchesCellSearch(leaderName, leader)) return false;
      return true;
    });
  }, [all, dateFrom, dateTo, cellName, province, leader]);

  const rows = useMemo(() => toMetricRowsFromCells(filtered), [filtered]);
  const searchActive = Boolean(cellName || province || leader);

  return (
    <MetricAttendanceInbox
      title="Ministry / Cell attendance"
      emptyMessage={
        dateFrom || dateTo || cellName || province || leader
          ? 'No attendance reports match your filters.'
          : 'No Ministry/Cell attendance reports yet. Record attendance from a branch Weekly tab.'
      }
      testId="reports-cell-attendance-inbox"
      kindLabel="Ministry / Cell attendance"
      rows={rows}
      dateFrom={dateFrom}
      dateTo={dateTo}
      setDateFrom={setDateFrom}
      setDateTo={setDateTo}
      viewMode={viewMode}
      setViewMode={setViewMode}
      accentClass="border-l-4 border-l-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/20"
      expandMonthGroups={searchActive}
      toolbarExtra={
        <CellAdvancedFiltersPanel
          cellName={cellName}
          province={province}
          leader={leader}
          onApply={(next) => {
            setCellName(next.cellName);
            setProvince(next.province);
            setLeader(next.leader);
          }}
          onReset={() => {
            setCellName('');
            setProvince('');
            setLeader('');
          }}
        />
      }
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
      title="Sunday Attendance"
      emptyMessage="No Sunday attendance recorded yet."
      testId="reports-weekly-sunday-inbox"
      kindLabel="Sunday Attendance"
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
            <CardTitle className="text-sm font-semibold">Departmental Report</CardTitle>
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] tabular-nums">
              {units.length}
            </Badge>
          </div>
          <CardDescription className="text-[11px]">
            Select any of the church units to view their monthly meeting attendance report
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[min(28rem,58vh)] overflow-y-auto p-3 pt-0">
          <div className="grid gap-2 sm:grid-cols-2">
            {units.map((u) => {
              const attCount = unitAttendance.filter((a) => a.serviceUnitId === u.id).length;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUnitId(u.id)}
                  className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-left transition hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:hover:bg-sky-950/70"
                >
                  <p className="text-sm font-semibold">{u.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {u.departmentCode ?? 'Unit'} · {attCount} meeting attendance
                    {attCount === 1 ? '' : ' records'}
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
        title={`${selectedUnit.name} meeting attendance`}
        emptyMessage="No meeting attendance sent by unit leaders for this unit yet."
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
  const [stage, setStage] = useState('all');
  const [monthKey, setMonthKey] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const filtered = useMemo(
    () => filterOutreachItems(all, { stage, monthKey, dateFrom, dateTo }),
    [all, stage, monthKey, dateFrom, dateTo],
  );

  const dateScoped = useMemo(
    () => filterOutreachItems(all, { stage: 'all', monthKey: 'all', dateFrom, dateTo }),
    [all, dateFrom, dateTo],
  );

  const groups = useMemo(() => groupByMonth(filtered, (r) => r.capturedAt), [filtered]);

  return (
    <AttendanceInboxShell
      title="Outreach"
      count={filtered.length}
      emptyMessage="No outreach contacts match your filters."
      testId="reports-outreach-inbox"
      dateFrom={dateFrom}
      dateTo={dateTo}
      onApplyDates={(from, to) => {
        setDateFrom(from);
        setDateTo(to);
      }}
      onClearDates={() => {
        setDateFrom('');
        setDateTo('');
      }}
      viewMode={viewMode}
      onViewMode={setViewMode}
      toolbarExtra={
        <OutreachAdvancedFiltersPanel
          items={dateScoped}
          stage={stage}
          monthKey={monthKey}
          onApply={(nextStage, nextMonth) => {
            setStage(nextStage);
            setMonthKey(nextMonth);
          }}
          onReset={() => {
            setStage('all');
            setMonthKey('all');
          }}
        />
      }
    >
      {viewMode === 'table' ? (
        <MonthGroupedSections
          groups={groups}
          renderGroupBody={(items) => (
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
                  {items.map((r, i) => (
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
          )}
        />
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
