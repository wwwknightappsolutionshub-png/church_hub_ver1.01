'use client';

import { useMemo, useState } from 'react';
import { LayoutGrid, Loader2, Table2, X } from 'lucide-react';
import {
  AttendanceExcelTable,
  AttendanceMetricCard,
  AttendanceMetricRow,
  formatAttendanceDate,
  groupByMonth,
  MonthGroupedSections,
} from '@/components/reports/month-grouped-attendance';
import { openAttendanceReportPdf } from '@/lib/attendance-report-pdf';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { CellProvinceRow } from '@/components/ministry-cells/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ProvinceAttendanceReport = {
  province: {
    id: string;
    name: string;
    assignedAt?: string;
    leader: { id: string; name: string; email: string; phone?: string | null };
  };
  from: string;
  to: string;
  branchCount: number;
  branches: Array<{
    branchId: string;
    name: string;
    postcode: string | null;
    location?: string | null;
    weeksRecorded: number;
    avgPresent: number;
    records: Array<{
      id: string;
      weekStart: string;
      meetingDate: string | null;
      presentCount: number;
      maleCount: number;
      femaleCount: number;
      boysCount: number;
      girlsCount: number;
      testifiersCount: number;
      firstTimersCount: number;
      recordedBy?: { id: string; firstName: string; lastName: string } | null;
    }>;
  }>;
};

function toMetricRows(
  branches: ProvinceAttendanceReport['branches'],
  selectedBranchId: string | null,
): AttendanceMetricRow[] {
  const scoped = selectedBranchId
    ? branches.filter((b) => b.branchId === selectedBranchId)
    : branches;
  const rows: AttendanceMetricRow[] = [];
  for (const b of scoped) {
    for (const r of b.records) {
      rows.push({
        id: r.id,
        title: b.name,
        subtitle: [
          b.postcode,
          b.location,
          r.recordedBy ? `${r.recordedBy.firstName} ${r.recordedBy.lastName}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        meetingDate: (r.meetingDate || r.weekStart) as string,
        presentCount: r.presentCount,
        maleCount: r.maleCount,
        femaleCount: r.femaleCount,
        boysCount: r.boysCount,
        girlsCount: r.girlsCount,
        testifiersCount: r.testifiersCount,
        firstTimersCount: r.firstTimersCount,
      });
    }
  }
  return rows.sort(
    (a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime(),
  );
}

export function ProvinceDetailPanel({
  province,
  onClose,
}: {
  province: CellProvinceRow;
  onClose: () => void;
}) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const { data, isLoading } = useApiQuery<ProvinceAttendanceReport>(
    ['ministry-cells', 'province-detail', province.id],
    `/ministry-cells/provinces/${province.id}/attendance-report`,
  );

  const metricRows = useMemo(
    () => toMetricRows(data?.branches ?? [], selectedBranchId),
    [data?.branches, selectedBranchId],
  );
  const groups = useMemo(
    () => groupByMonth(metricRows, (r) => r.meetingDate),
    [metricRows],
  );

  const assignedAt = province.assignedAt || province.createdAt;
  const leaderPhone = data?.province.leader.phone ?? province.leader.phone;

  const exportPdf = (row: AttendanceMetricRow) => {
    try {
      openAttendanceReportPdf({
        title: row.title,
        subtitle: row.subtitle,
        kindLabel: `${province.name} cell attendance`,
        autoPrint: false,
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[min(94vh,56rem)] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-background shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="province-detail-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 id="province-detail-title" className="truncate text-base font-semibold">
              {province.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {province.postcodes.join(', ') || 'No coverage postcodes'}
            </p>
          </div>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <Card className="shadow-sm">
            <CardHeader className="px-4 py-2.5">
              <CardTitle className="text-sm font-semibold">Provincial leader</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 px-4 pb-3 pt-0 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ['Name', province.leader.name],
                  ['Email', province.leader.email],
                  ['Phone', leaderPhone?.trim() || '—'],
                  [
                    'Date of assignment',
                    assignedAt
                      ? new Date(assignedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—',
                  ],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border/60 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="truncate text-sm font-medium">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Cells in this province</h3>
              <Badge variant="outline" className="tabular-nums">
                {data?.branches.length ?? province.branchCount}
              </Badge>
            </div>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setSelectedBranchId(null)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left text-sm transition',
                    selectedBranchId === null
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  <p className="font-semibold">All cells</p>
                  <p className="text-[11px] text-muted-foreground">Province attendance</p>
                </button>
                {(data?.branches ?? []).map((b) => (
                  <button
                    key={b.branchId}
                    type="button"
                    onClick={() => setSelectedBranchId(b.branchId)}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-left text-sm transition',
                      selectedBranchId === b.branchId
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
                        : 'border-border hover:border-primary/40',
                    )}
                  >
                    <p className="truncate font-semibold">{b.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {b.postcode ?? 'No postcode'} · avg {b.avgPresent}
                    </p>
                  </button>
                ))}
                {(data?.branches.length ?? 0) === 0 && (
                  <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
                    No cells mapped to this province yet.
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                Attendance
                {selectedBranchId
                  ? ` · ${data?.branches.find((b) => b.branchId === selectedBranchId)?.name ?? 'Cell'}`
                  : ' · All cells'}
              </h3>
              <div
                className="inline-flex rounded-md border border-border p-0.5"
                role="group"
                aria-label="Attendance view"
              >
                <button
                  type="button"
                  className={cn(
                    'inline-flex h-7 items-center gap-1 rounded-sm px-2 text-[11px] font-medium',
                    viewMode === 'cards'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Cards
                </button>
                <button
                  type="button"
                  className={cn(
                    'inline-flex h-7 items-center gap-1 rounded-sm px-2 text-[11px] font-medium',
                    viewMode === 'table'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                  onClick={() => setViewMode('table')}
                >
                  <Table2 className="h-3.5 w-3.5" />
                  Excel
                </button>
              </div>
            </div>

            {metricRows.length === 0 ? (
              <p className="rounded-xl border border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                No attendance records for this selection.
              </p>
            ) : viewMode === 'table' ? (
              <MonthGroupedSections
                groups={groups}
                expandAll={Boolean(selectedBranchId)}
                renderGroupBody={(items) => (
                  <AttendanceExcelTable
                    rows={items}
                    onPdf={(row) => exportPdf(row)}
                    onPrint={(row) => {
                      try {
                        openAttendanceReportPdf({
                          title: row.title,
                          subtitle: row.subtitle,
                          kindLabel: `${province.name} cell attendance`,
                          autoPrint: true,
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
                        toast.error(e instanceof Error ? e.message : 'Could not print');
                      }
                    }}
                  />
                )}
              />
            ) : (
              <MonthGroupedSections
                groups={groups}
                expandAll={Boolean(selectedBranchId)}
                renderItem={(row) => (
                  <AttendanceMetricCard
                    key={row.id}
                    row={row}
                    accentClass="border-l-4 border-l-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/20"
                    onPdf={() => exportPdf(row)}
                  />
                )}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
