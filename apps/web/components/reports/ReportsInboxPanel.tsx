'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ChevronUp,
  FileDown,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { openAttendanceReportPdf } from '@/lib/attendance-report-pdf';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type QueueStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
type TriageKind =
  | 'all'
  | 'department'
  | 'weekly'
  | 'cell'
  | 'unit'
  | 'meeting'
  | 'rtp'
  | 'queue'
  | 'notification'
  | 'message';

interface ReplyTarget {
  userId: string;
  label: string;
  source: string;
}

export interface CellAttendanceReportItem {
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
}

export interface UnitAttendanceReportItem {
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
}

export interface ReportsInboxData {
  reports: {
    department: Array<{
      id: string;
      title: string;
      body: string;
      submittedAt: string;
      author: { id: string; userId: string | null; firstName: string; lastName: string };
      serviceUnit: { id: string; name: string; departmentCode: string | null };
    }>;
    weekly: Array<{
      id: string;
      body: string;
      weekStart: string;
      createdAt: string;
      stats?: Record<string, unknown> | null;
      serviceUnit: { id: string; name: string; departmentCode: string | null };
    }>;
    cellAttendance?: CellAttendanceReportItem[];
    unitAttendance?: UnitAttendanceReportItem[];
    meetingSummaries?: Array<{
      id: string;
      title: string;
      body: string;
      meetingDate: string | null;
      createdAt: string;
      serviceUnit: { id: string; name: string; departmentCode: string | null };
      author: { id: string; userId: string | null; firstName: string; lastName: string };
    }>;
    rtpRequests?: Array<{
      id: string;
      title: string;
      status: 'SUBMITTED' | 'PROCESSING' | 'APPROVED' | 'REJECTED';
      fieldValues: Record<string, unknown>;
      createdAt: string;
      receivedAt: string | null;
      approvedAt: string | null;
      rejectedAt: string | null;
      rejectionReason: string | null;
      serviceUnit: { id: string; name: string; departmentCode: string | null };
      submittedBy: { id: string; firstName: string; lastName: string; email: string | null };
      receivedBy: { id: string; firstName: string; lastName: string } | null;
      approvedBy: { id: string; firstName: string; lastName: string } | null;
    }>;
  };
  queue: Array<{
    id: string;
    kind: string;
    title: string;
    body: string;
    status: string;
    createdAt: string;
    targetUserId?: string | null;
    serviceUnit?: { id: string; name: string } | null;
    metadata?: {
      tags?: string[];
      branchName?: string;
      date?: string;
      reportType?: string;
      timestamp?: string;
      presentCount?: number;
      maleCount?: number;
      femaleCount?: number;
      boysCount?: number;
      girlsCount?: number;
      firstTimersCount?: number;
      testifiersCount?: number;
    } | null;
  }>;
  notifications: Array<{ id: string; title: string; body: string; type: string; sentAt: string }>;
  messages: Array<{
    id: string;
    subject?: string | null;
    body: string;
    createdAt: string;
    sender: { id: string; firstName: string; lastName: string };
    recipient: { id: string; firstName: string; lastName: string };
  }>;
  replyTargets: ReplyTarget[];
}

const STATUS_OPTIONS: Array<{ value: 'all' | QueueStatus; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SENT', label: 'Sent' },
  { value: 'FAILED', label: 'Failed' },
];

const KIND_OPTIONS: Array<{ value: TriageKind; label: string }> = [
  { value: 'all', label: 'All types' },
  { value: 'department', label: 'Department reports' },
  { value: 'weekly', label: 'Weekly reports' },
  { value: 'meeting', label: 'Meeting summaries' },
  { value: 'rtp', label: 'RTP Requests' },
  { value: 'cell', label: 'Ministry / Cells' },
  { value: 'unit', label: 'Service units' },
  { value: 'queue', label: 'Queue alerts' },
  { value: 'notification', label: 'Notifications' },
  { value: 'message', label: 'In-app messages' },
];

/** Left-rail + overview cards (no “All types”). */
const SOURCE_OPTIONS = KIND_OPTIONS.filter(
  (o): o is { value: Exclude<TriageKind, 'all'>; label: string } => o.value !== 'all',
);

const SOURCE_CARD_CLASS: Record<Exclude<TriageKind, 'all'>, string> = {
  department: 'border-sky-200 bg-sky-100 text-sky-950 hover:bg-sky-200/80 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-50',
  weekly: 'border-indigo-200 bg-indigo-100 text-indigo-950 hover:bg-indigo-200/80 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-50',
  meeting: 'border-violet-200 bg-violet-100 text-violet-950 hover:bg-violet-200/80 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-50',
  rtp: 'border-orange-200 bg-orange-100 text-orange-950 hover:bg-orange-200/80 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-50',
  cell: 'border-emerald-200 bg-emerald-100 text-emerald-950 hover:bg-emerald-200/80 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-50',
  unit: 'border-teal-200 bg-teal-100 text-teal-950 hover:bg-teal-200/80 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-50',
  queue: 'border-rose-200 bg-rose-100 text-rose-950 hover:bg-rose-200/80 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-50',
  notification: 'border-amber-200 bg-amber-100 text-amber-950 hover:bg-amber-200/80 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-50',
  message: 'border-slate-200 bg-slate-100 text-slate-950 hover:bg-slate-200/80 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-50',
};

function formatWeekLabel(iso: string) {
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return iso;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function weeklyReportTitle(body: string, serviceUnitName: string) {
  const firstLine = body.split('\n').find((line) => line.trim())?.trim();
  return firstLine || `${serviceUnitName} weekly report`;
}

function InboxScrollCard({
  title,
  description,
  count,
  emptyMessage,
  testId,
  children,
  className,
}: {
  title: string;
  description?: string;
  count: number;
  emptyMessage: string;
  testId?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn('flex min-h-[22rem] flex-col xl:min-h-[26rem]', className)}
      data-testid={testId}
    >
      <CardHeader className="shrink-0 space-y-1 pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="outline" className="shrink-0 tabular-nums">
            {count}
          </Badge>
        </div>
        {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden p-0 pb-4">
        <div className="max-h-[min(26rem,52vh)] overflow-y-auto overscroll-contain px-6">
          <div className="space-y-3 pb-1">{children}</div>
          {count === 0 ? (
            <p className="pb-2 text-xs text-muted-foreground">{emptyMessage}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyReportItem({ report }: { report: ReportsInboxData['reports']['weekly'][number] }) {
  const [expanded, setExpanded] = useState(false);
  const title = weeklyReportTitle(report.body, report.serviceUnit.name);
  const isLong = report.body.length > 320 || report.body.split('\n').length > 8;

  return (
    <article className="rounded-lg border bg-card px-3 py-2.5 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium leading-snug">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {report.serviceUnit.name}
            {report.serviceUnit.departmentCode ? ` · ${report.serviceUnit.departmentCode}` : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            Week of {formatWeekLabel(report.weekStart)} ·{' '}
            {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          Weekly
        </Badge>
      </div>
      <pre
        className={cn(
          'mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-muted/45 p-2.5 font-sans text-xs leading-relaxed text-foreground',
          !expanded && isLong && 'max-h-36 overflow-hidden',
        )}
      >
        {report.body}
      </pre>
      {isLong ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-7 gap-1 px-2 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Show full report
            </>
          )}
        </Button>
      ) : null}
    </article>
  );
}

function threeMonthsAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d;
}

function reportSortTime(iso: string) {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function latestByKey<T>(
  items: T[],
  keyFn: (item: T) => string,
  timeFn: (item: T) => string,
): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = keyFn(item);
    const prev = map.get(key);
    if (!prev || reportSortTime(timeFn(item)) > reportSortTime(timeFn(prev))) {
      map.set(key, item);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => reportSortTime(timeFn(b)) - reportSortTime(timeFn(a)),
  );
}

function historyInWindow<T>(
  items: T[],
  key: string,
  keyFn: (item: T) => string,
  timeFn: (item: T) => string,
): T[] {
  const cutoff = threeMonthsAgo().getTime();
  return items
    .filter((item) => keyFn(item) === key && reportSortTime(timeFn(item)) >= cutoff)
    .sort((a, b) => reportSortTime(timeFn(b)) - reportSortTime(timeFn(a)));
}

function formatAttendanceDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function CellAttendanceReportItemCard({
  report,
  history,
}: {
  report: CellAttendanceReportItem;
  history: CellAttendanceReportItem[];
}) {
  const [open, setOpen] = useState(false);
  const dateLabel = formatAttendanceDate(report.meetingDate);
  const details = [
    { label: 'Male', value: report.maleCount },
    { label: 'Female', value: report.femaleCount },
    { label: 'Boys', value: report.boysCount },
    { label: 'Girls', value: report.girlsCount },
    { label: 'First timers', value: report.firstTimersCount },
  ];

  const exportPdf = (rows: CellAttendanceReportItem[]) => {
    try {
      openAttendanceReportPdf({
        title: report.branchName,
        subtitle: report.location ?? undefined,
        kindLabel: 'Ministry / Cells attendance',
        rows: rows.map((r) => ({
          dateLabel: formatAttendanceDate(r.meetingDate),
          presentCount: r.presentCount,
          maleCount: r.maleCount,
          femaleCount: r.femaleCount,
          boysCount: r.boysCount,
          girlsCount: r.girlsCount,
          testifiersCount: r.testifiersCount,
          firstTimersCount: r.firstTimersCount,
          recordedAt: r.createdAt,
          recordedBy: r.recordedBy
            ? `${r.recordedBy.firstName} ${r.recordedBy.lastName}`
            : undefined,
        })),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not export PDF');
    }
  };

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'cursor-pointer rounded-lg border px-3 py-2.5 text-sm transition hover:border-primary/40',
          URGENCY_META.low.card,
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium leading-snug">{report.branchName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {report.location ? `${report.location} · ` : ''}
              {dateLabel}
              {report.recordedBy
                ? ` · ${report.recordedBy.firstName} ${report.recordedBy.lastName}`
                : ''}
              {' · '}
              <span className="text-primary">Latest · click for history</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant="secondary" className="text-[10px]">
              Ministry / Cells
            </Badge>
            <p className="text-lg font-bold tabular-nums leading-none">{report.presentCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Total attendance
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {details.map((d) => (
            <div
              key={d.label}
              className="rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-center"
            >
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{d.label}</p>
              <p className="text-sm font-semibold tabular-nums">{d.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">
            Recorded {new Date(report.createdAt).toLocaleString()}
            {report.testifiersCount > 0 ? ` · Testifiers: ${report.testifiersCount}` : ''}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              exportPdf([report]);
            }}
          >
            <FileDown className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </article>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
              onClick={() => setOpen(false)}
            >
              <div
                className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-background p-4 shadow-xl sm:rounded-2xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{report.branchName}</h3>
                    <p className="text-sm text-muted-foreground">
                      Attendance history (last 3 months)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => exportPdf(history.length ? history : [report])}
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Export PDF
                    </Button>
                    <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="pb-2 font-medium">Date</th>
                        <th className="pb-2 font-medium">Total</th>
                        <th className="pb-2 font-medium">Male</th>
                        <th className="pb-2 font-medium">Female</th>
                        <th className="pb-2 font-medium">Boys</th>
                        <th className="pb-2 font-medium">Girls</th>
                        <th className="pb-2 font-medium">First timers</th>
                        <th className="pb-2 font-medium">Testifiers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(history.length ? history : [report]).map((row) => (
                        <tr key={row.id} className="border-b border-border/60">
                          <td className="py-2">{formatAttendanceDate(row.meetingDate)}</td>
                          <td className="py-2 tabular-nums">{row.presentCount}</td>
                          <td className="py-2 tabular-nums">{row.maleCount}</td>
                          <td className="py-2 tabular-nums">{row.femaleCount}</td>
                          <td className="py-2 tabular-nums">{row.boysCount}</td>
                          <td className="py-2 tabular-nums">{row.girlsCount}</td>
                          <td className="py-2 tabular-nums">{row.firstTimersCount}</td>
                          <td className="py-2 tabular-nums">{row.testifiersCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function UnitAttendanceReportItemCard({
  report,
  history,
}: {
  report: UnitAttendanceReportItem;
  history: UnitAttendanceReportItem[];
}) {
  const [open, setOpen] = useState(false);
  const dateLabel = formatAttendanceDate(report.meetingDate);
  const details = [
    { label: 'Male', value: report.maleCount },
    { label: 'Female', value: report.femaleCount },
    { label: 'First timers', value: report.firstTimersCount },
    { label: 'Testifiers', value: report.testifiersCount },
  ];

  const exportPdf = (rows: UnitAttendanceReportItem[]) => {
    try {
      openAttendanceReportPdf({
        title: report.serviceUnitName,
        subtitle: report.departmentCode ?? undefined,
        kindLabel: 'Service unit attendance',
        omitChildrenCols: true,
        rows: rows.map((r) => ({
          dateLabel: formatAttendanceDate(r.meetingDate),
          presentCount: r.presentCount,
          maleCount: r.maleCount,
          femaleCount: r.femaleCount,
          testifiersCount: r.testifiersCount,
          firstTimersCount: r.firstTimersCount,
          recordedAt: r.createdAt,
          recordedBy: r.recordedBy
            ? `${r.recordedBy.firstName} ${r.recordedBy.lastName}`
            : undefined,
        })),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not export PDF');
    }
  };

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'cursor-pointer rounded-lg border px-3 py-2.5 text-sm transition hover:border-primary/40',
          URGENCY_META.low.card,
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium leading-snug">{report.serviceUnitName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {report.departmentCode ? `${report.departmentCode} · ` : ''}
              {dateLabel}
              {report.recordedBy
                ? ` · ${report.recordedBy.firstName} ${report.recordedBy.lastName}`
                : ''}
              {' · '}
              <span className="text-primary">Latest · click for history</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant="secondary" className="text-[10px]">
              Service unit
            </Badge>
            <p className="text-lg font-bold tabular-nums leading-none">{report.presentCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Total attendance
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {details.map((d) => (
            <div
              key={d.label}
              className="rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-center"
            >
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{d.label}</p>
              <p className="text-sm font-semibold tabular-nums">{d.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">
            Recorded {new Date(report.createdAt).toLocaleString()}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              exportPdf([report]);
            }}
          >
            <FileDown className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </article>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
              onClick={() => setOpen(false)}
            >
              <div
                className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-background p-4 shadow-xl sm:rounded-2xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{report.serviceUnitName}</h3>
                    <p className="text-sm text-muted-foreground">
                      Attendance history (last 3 months)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => exportPdf(history.length ? history : [report])}
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Export PDF
                    </Button>
                    <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="pb-2 font-medium">Date</th>
                        <th className="pb-2 font-medium">Total</th>
                        <th className="pb-2 font-medium">Male</th>
                        <th className="pb-2 font-medium">Female</th>
                        <th className="pb-2 font-medium">First timers</th>
                        <th className="pb-2 font-medium">Testifiers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(history.length ? history : [report]).map((row) => (
                        <tr key={row.id} className="border-b border-border/60">
                          <td className="py-2">{formatAttendanceDate(row.meetingDate)}</td>
                          <td className="py-2 tabular-nums">{row.presentCount}</td>
                          <td className="py-2 tabular-nums">{row.maleCount}</td>
                          <td className="py-2 tabular-nums">{row.femaleCount}</td>
                          <td className="py-2 tabular-nums">{row.firstTimersCount}</td>
                          <td className="py-2 tabular-nums">{row.testifiersCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

function queueUrgency(status: string): UrgencyLevel {
  if (status === 'FAILED') return 'critical';
  if (status === 'PENDING') return 'high';
  if (status === 'PROCESSING') return 'medium';
  if (status === 'SENT') return 'low';
  return 'info';
}

const URGENCY_META: Record<
  UrgencyLevel,
  { label: string; card: string; badge: string; dot: string }
> = {
  critical: {
    label: 'Critical',
    card: 'border-l-4 border-l-red-600 bg-red-50/90 dark:bg-red-950/25',
    badge: 'border-red-600/50 bg-red-600 text-white',
    dot: 'bg-red-600',
  },
  high: {
    label: 'High',
    card: 'border-l-4 border-l-orange-500 bg-orange-50/90 dark:bg-orange-950/20',
    badge: 'border-orange-500/50 bg-orange-500 text-white',
    dot: 'bg-orange-500',
  },
  medium: {
    label: 'Medium',
    card: 'border-l-4 border-l-amber-500 bg-amber-50/80 dark:bg-amber-950/20',
    badge: 'border-amber-500/50 bg-amber-500 text-white',
    dot: 'bg-amber-500',
  },
  low: {
    label: 'Low',
    card: 'border-l-4 border-l-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/20',
    badge: 'border-emerald-600/50 bg-emerald-600 text-white',
    dot: 'bg-emerald-600',
  },
  info: {
    label: 'Info',
    card: 'border-l-4 border-l-slate-400 bg-slate-50/80 dark:bg-slate-900/40',
    badge: 'border-slate-400/50 bg-slate-600 text-white',
    dot: 'bg-slate-500',
  },
};

export interface ReportsInboxPanelProps {
  queryKey: string;
  inboxPath: string;
  replyPath: string;
  replyFormId: string;
  eyebrow: string;
  title: string;
  description: string;
  defaultReplySubject?: string;
}

export function ReportsInboxPanel({
  queryKey,
  inboxPath,
  replyPath,
  replyFormId,
  eyebrow,
  title,
  description,
  defaultReplySubject = 'Re: Church report',
}: ReportsInboxPanelProps) {
  const qc = useQueryClient();
  const { data, isLoading } = useApiQuery<ReportsInboxData>([queryKey], inboxPath);
  const [reply, setReply] = useState({ recipientId: '', subject: '', body: '' });
  const [busy, setBusy] = useState(false);
  const [digestBusy, setDigestBusy] = useState<'dept' | 'cell' | null>(null);
  const [digestMenuOpen, setDigestMenuOpen] = useState(false);
  const digestMenuRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | QueueStatus>('all');
  const [kindFilter, setKindFilter] = useState<TriageKind>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel | 'all'>('all');
  const [replyOpen, setReplyOpen] = useState(false);
  const isOverview = kindFilter === 'all';

  useEffect(() => {
    if (!digestMenuOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (target && !digestMenuRef.current?.contains(target)) {
        setDigestMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDigestMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [digestMenuOpen]);

  const sendDepartmentDigest = async () => {
    setDigestBusy('dept');
    try {
      const res = await api.post<{ emailed: number }>(
        '/service-units/departments/digests/weekly',
        {},
      );
      const n = res.data?.emailed ?? 0;
      toast.success(
        n > 0
          ? `Department digest emailed to ${n} recipient(s)`
          : 'Digest built but no Admin/Pastor email found',
      );
      qc.invalidateQueries({ queryKey: [queryKey] });
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not send department digest'));
    } finally {
      setDigestBusy(null);
    }
  };

  const sendCellDigest = async () => {
    setDigestBusy('cell');
    try {
      const res = await api.post<{ emailed: number }>('/ministry-cells/digests/weekly', {});
      const n = res.data?.emailed ?? 0;
      toast.success(
        n > 0
          ? `Cell digest emailed to ${n} recipient(s)`
          : 'Digest built but no Admin/Pastor email found',
      );
      qc.invalidateQueries({ queryKey: [queryKey] });
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not send cell digest'));
    } finally {
      setDigestBusy(null);
    }
  };

  const selectedTarget = useMemo(
    () => data?.replyTargets.find((t) => t.userId === reply.recipientId),
    [data?.replyTargets, reply.recipientId],
  );

  const pickReply = (target: { userId: string; subject: string }) => {
    setReply((p) => ({
      ...p,
      recipientId: target.userId,
      subject: target.subject,
    }));
    setReplyOpen(true);
    requestAnimationFrame(() => {
      document.getElementById(replyFormId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const deptReports = useMemo(() => {
    if (kindFilter !== 'all' && kindFilter !== 'department') return [];
    if (urgencyFilter !== 'all' && urgencyFilter !== 'medium') return [];
    return data?.reports.department ?? [];
  }, [data, kindFilter, urgencyFilter]);

  const weeklyReports = useMemo(() => {
    if (kindFilter !== 'all' && kindFilter !== 'weekly') return [];
    if (urgencyFilter !== 'all' && urgencyFilter !== 'info') return [];
    return data?.reports.weekly ?? [];
  }, [data, kindFilter, urgencyFilter]);

  const cellAttendanceAll = useMemo(() => {
    if (kindFilter !== 'all' && kindFilter !== 'cell') return [];
    if (urgencyFilter !== 'all' && urgencyFilter !== 'low') return [];
    return data?.reports.cellAttendance ?? [];
  }, [data, kindFilter, urgencyFilter]);

  const cellAttendanceReports = useMemo(
    () =>
      latestByKey(
        cellAttendanceAll,
        (r) => r.branchId,
        (r) => r.meetingDate || r.createdAt,
      ),
    [cellAttendanceAll],
  );

  const unitAttendanceAll = useMemo(() => {
    if (kindFilter !== 'all' && kindFilter !== 'unit') return [];
    if (urgencyFilter !== 'all' && urgencyFilter !== 'low') return [];
    return data?.reports.unitAttendance ?? [];
  }, [data, kindFilter, urgencyFilter]);

  const unitAttendanceReports = useMemo(
    () =>
      latestByKey(
        unitAttendanceAll,
        (r) => r.serviceUnitId,
        (r) => r.meetingDate || r.createdAt,
      ),
    [unitAttendanceAll],
  );

  const meetingSummaries = useMemo(() => {
    if (kindFilter !== 'all' && kindFilter !== 'meeting') return [];
    if (urgencyFilter !== 'all' && urgencyFilter !== 'medium') return [];
    return data?.reports.meetingSummaries ?? [];
  }, [data, kindFilter, urgencyFilter]);

  const rtpRequests = useMemo(() => {
    if (kindFilter !== 'all' && kindFilter !== 'rtp') return [];
    return (data?.reports.rtpRequests ?? []).filter((r) => {
      const urgency =
        r.status === 'SUBMITTED' ? 'high' : r.status === 'PROCESSING' ? 'medium' : 'info';
      return urgencyFilter === 'all' || urgencyFilter === urgency;
    });
  }, [data, kindFilter, urgencyFilter]);

  const queueItems = useMemo(() => {
    if (kindFilter !== 'all' && kindFilter !== 'queue') return [];
    return (data?.queue ?? []).filter((q) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (urgencyFilter !== 'all' && queueUrgency(q.status) !== urgencyFilter) return false;
      return true;
    });
  }, [data, kindFilter, statusFilter, urgencyFilter]);

  const notifications = useMemo(() => {
    if (kindFilter !== 'all' && kindFilter !== 'notification') return [];
    if (urgencyFilter !== 'all' && urgencyFilter !== 'info') return [];
    return data?.notifications ?? [];
  }, [data, kindFilter, urgencyFilter]);

  const messages = useMemo(() => {
    if (kindFilter !== 'all' && kindFilter !== 'message') return [];
    if (urgencyFilter !== 'all' && urgencyFilter !== 'info') return [];
    return data?.messages ?? [];
  }, [data, kindFilter, urgencyFilter]);

  const triageCount =
    deptReports.length +
    weeklyReports.length +
    meetingSummaries.length +
    rtpRequests.length +
    cellAttendanceReports.length +
    unitAttendanceReports.length +
    queueItems.length +
    notifications.length +
    messages.length;

  const urgencyCounts = useMemo(() => {
    const counts: Record<UrgencyLevel, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    const include = (kind: Exclude<TriageKind, 'all'>) =>
      kindFilter === 'all' || kindFilter === kind;

    if (include('queue')) {
      for (const q of data?.queue ?? []) {
        counts[queueUrgency(q.status)] += 1;
      }
    }
    if (include('department')) counts.medium += data?.reports.department.length ?? 0;
    if (include('weekly')) counts.info += data?.reports.weekly.length ?? 0;
    if (include('meeting')) counts.medium += data?.reports.meetingSummaries?.length ?? 0;
    if (include('rtp')) {
      for (const r of data?.reports.rtpRequests ?? []) {
        if (r.status === 'SUBMITTED') counts.high += 1;
        else if (r.status === 'PROCESSING') counts.medium += 1;
        else counts.info += 1;
      }
    }
    if (include('cell')) counts.low += data?.reports.cellAttendance?.length ?? 0;
    if (include('unit')) counts.low += data?.reports.unitAttendance?.length ?? 0;
    if (include('notification')) counts.info += data?.notifications.length ?? 0;
    if (include('message')) counts.info += data?.messages.length ?? 0;
    return counts;
  }, [data, kindFilter]);

  const allPriorityCount = useMemo(
    () =>
      urgencyCounts.critical +
      urgencyCounts.high +
      urgencyCounts.medium +
      urgencyCounts.low +
      urgencyCounts.info,
    [urgencyCounts],
  );

  const sourceCounts = useMemo(() => {
    const dept = (data?.reports.department ?? []).filter(() =>
      urgencyFilter === 'all' || urgencyFilter === 'medium',
    ).length;
    const weekly = (data?.reports.weekly ?? []).filter(() =>
      urgencyFilter === 'all' || urgencyFilter === 'info',
    ).length;
    const meeting = (data?.reports.meetingSummaries ?? []).filter(() =>
      urgencyFilter === 'all' || urgencyFilter === 'medium',
    ).length;
    const rtp = (data?.reports.rtpRequests ?? []).filter((r) => {
      const urgency =
        r.status === 'SUBMITTED' ? 'high' : r.status === 'PROCESSING' ? 'medium' : 'info';
      return urgencyFilter === 'all' || urgencyFilter === urgency;
    }).length;
    const cell = (data?.reports.cellAttendance ?? []).filter(() =>
      urgencyFilter === 'all' || urgencyFilter === 'low',
    ).length;
    const unit = (data?.reports.unitAttendance ?? []).filter(() =>
      urgencyFilter === 'all' || urgencyFilter === 'low',
    ).length;
    const queue = (data?.queue ?? []).filter((q) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      return urgencyFilter === 'all' || queueUrgency(q.status) === urgencyFilter;
    }).length;
    const notification = (data?.notifications ?? []).filter(() =>
      urgencyFilter === 'all' || urgencyFilter === 'info',
    ).length;
    const message = (data?.messages ?? []).filter(() =>
      urgencyFilter === 'all' || urgencyFilter === 'info',
    ).length;
    return {
      all: dept + weekly + meeting + rtp + cell + unit + queue + notification + message,
      department: dept,
      weekly,
      meeting,
      rtp,
      cell,
      unit,
      queue,
      notification,
      message,
    };
  }, [data, statusFilter, urgencyFilter]);

  const reportTotal =
    (data?.reports.department.length ?? 0) +
    (data?.reports.weekly.length ?? 0) +
    (data?.reports.meetingSummaries?.length ?? 0) +
    (data?.reports.rtpRequests?.length ?? 0) +
    (data?.reports.cellAttendance?.length ?? 0) +
    (data?.reports.unitAttendance?.length ?? 0);
  const criticalNeeds = urgencyCounts.critical + urgencyCounts.high;

  /** Right pane lists a source only when that source is selected (not on overview). */
  const showSource = (kind: Exclude<TriageKind, 'all'>, _count: number) => {
    return kindFilter === kind;
  };

  const selectedSourceLabel = isOverview
    ? 'Sources overview'
    : (SOURCE_OPTIONS.find((o) => o.value === kindFilter)?.label ?? 'Source');
  const selectedUrgencyLabel =
    urgencyFilter === 'all' ? 'All priorities' : URGENCY_META[urgencyFilter].label;

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.recipientId || !reply.body.trim()) {
      toast.error('Pick a recipient and write a message');
      return;
    }
    setBusy(true);
    try {
      await api.post(replyPath, {
        recipientId: reply.recipientId,
        subject: reply.subject.trim() || defaultReplySubject,
        body: reply.body.trim(),
      });
      toast.success('Reply sent');
      setReply({ recipientId: '', subject: '', body: '' });
      qc.invalidateQueries({ queryKey: [queryKey] });
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not send reply'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardModuleShell
      eyebrow={eyebrow}
      title={title}
      description={description}
      badge={
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success" className="gap-1 border-emerald-600/50 bg-emerald-900/40 text-emerald-100">
            <Mail className="h-3 w-3" />
            {reportTotal} reports · {data?.messages.length ?? 0} messages
          </Badge>
          {criticalNeeds > 0 ? (
            <Badge className="border-red-500/40 bg-red-600/90 text-white">
              {criticalNeeds} need attention
            </Badge>
          ) : null}
        </div>
      }
      actions={
        <div className="relative" ref={digestMenuRef} data-testid="reports-digest-actions">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="border-white/25 bg-white/10 text-white hover:bg-white/20"
            aria-expanded={digestMenuOpen}
            aria-haspopup="menu"
            disabled={digestBusy !== null}
            onClick={() => setDigestMenuOpen((o) => !o)}
          >
            {digestBusy ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-4 w-4" />
            )}
            Send digests
            <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-80" />
          </Button>
          {digestMenuOpen ? (
            <div
              role="menu"
              className="absolute left-0 z-30 mt-1 w-64 rounded-lg border border-border bg-card p-1 text-foreground shadow-lg sm:left-auto sm:right-0"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                disabled={digestBusy !== null}
                onClick={() => {
                  setDigestMenuOpen(false);
                  void sendDepartmentDigest();
                }}
              >
                <Send className="h-4 w-4 shrink-0" />
                Department digest
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                disabled={digestBusy !== null}
                onClick={() => {
                  setDigestMenuOpen(false);
                  void sendCellDigest();
                }}
              >
                <Mail className="h-4 w-4 shrink-0" />
                Cell digest
              </button>
              <p className="border-t border-border px-3 py-2 text-[10px] leading-snug text-muted-foreground">
                Auto: departments Mon 10:00 · cells Sat 21:00 (Europe/London)
              </p>
            </div>
          ) : null}
        </div>
      }
      contentClassName="!p-0 md:!p-0"
    >
      <div className="flex flex-col gap-0 lg:min-h-[calc(100dvh-11rem)] lg:flex-row">
        {/* Triage rail */}
        <aside
          className="shrink-0 border-b border-border bg-slate-50/80 lg:w-56 lg:border-b-0 lg:border-r dark:bg-slate-950/40"
          data-testid="reports-urgency-strip"
        >
          <div className="space-y-4 p-3 sm:p-4">
            <div>
              <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Needs action
              </p>
              <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                <button
                  type="button"
                  onClick={() => {
                    setUrgencyFilter('all');
                    setKindFilter('all');
                  }}
                  className={cn(
                    'flex shrink-0 items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition lg:w-full',
                    urgencyFilter === 'all' && isOverview
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-700 hover:bg-slate-200/80 dark:text-slate-300 dark:hover:bg-slate-800',
                  )}
                >
                  <span>All priorities</span>
                  <span className="tabular-nums text-xs opacity-80">{allPriorityCount}</span>
                </button>
                {(Object.keys(URGENCY_META) as UrgencyLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setUrgencyFilter(level)}
                    className={cn(
                      'flex shrink-0 items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition lg:w-full',
                      urgencyFilter === level
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'text-slate-700 hover:bg-slate-200/80 dark:text-slate-300 dark:hover:bg-slate-800',
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', URGENCY_META[level].dot)} aria-hidden />
                      {URGENCY_META[level].label}
                    </span>
                    <span className="tabular-nums text-xs opacity-80">{urgencyCounts[level]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Sources
              </p>
              <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                {SOURCE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setKindFilter(o.value)}
                    className={cn(
                      'flex shrink-0 items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition lg:w-full',
                      kindFilter === o.value
                        ? 'bg-primary/15 font-medium text-primary'
                        : 'text-slate-700 hover:bg-slate-200/80 dark:text-slate-300 dark:hover:bg-slate-800',
                    )}
                  >
                    <span className="truncate">{o.label}</span>
                    <span className="tabular-nums text-xs opacity-70">
                      {sourceCounts[o.value] ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Working surface */}
        <div className="min-w-0 flex-1 space-y-4 p-4 md:p-5">
          <div className="sticky top-[calc(3rem+env(safe-area-inset-top))] z-10 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-5 md:px-5 xl:top-16">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              {kindFilter === 'queue' ? (
                <div className="space-y-1">
                  <Label htmlFor={`${replyFormId}-status`} className="text-xs text-muted-foreground">
                    Queue status
                  </Label>
                  <select
                    id={`${replyFormId}-status`}
                    className="h-10 w-full min-w-[140px] rounded-md border border-input bg-background px-3 text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | QueueStatus)}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div />
              )}
              <div className="sm:text-right">
                <p className="text-xs font-medium text-foreground">
                  {selectedUrgencyLabel} · {selectedSourceLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isLoading
                    ? 'Loading…'
                    : isOverview
                      ? `${sourceCounts.all} update${sourceCounts.all === 1 ? '' : 's'} across sources`
                      : `${triageCount} item${triageCount === 1 ? '' : 's'} match`}
                </p>
                {!isOverview ? (
                  <button
                    type="button"
                    className="mt-1 text-xs font-medium text-primary hover:underline"
                    onClick={() => setKindFilter('all')}
                  >
                    Back to sources overview
                  </button>
                ) : null}
              </div>
            </div>
          </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4" data-testid="reports-inbox-grid">
          {isOverview ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="reports-sources-overview">
                {SOURCE_OPTIONS.map((o) => {
                  const count = sourceCounts[o.value] ?? 0;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setKindFilter(o.value)}
                      className={cn(
                        'flex min-h-[7.5rem] flex-col justify-between rounded-xl border p-4 text-left shadow-sm transition',
                        SOURCE_CARD_CLASS[o.value],
                      )}
                    >
                      <span className="text-sm font-semibold leading-snug">{o.label}</span>
                      <span className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{count}</span>
                      <span className="mt-1 text-[11px] font-medium opacity-70">
                        {count === 1 ? 'update' : 'updates'} · open
                      </span>
                    </button>
                  );
                })}
              </div>
              <Card id={`${replyFormId}-overview`}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
                  aria-expanded={replyOpen}
                  onClick={() => setReplyOpen((o) => !o)}
                >
                  <div>
                    <CardTitle className="text-base">Reply</CardTitle>
                    <CardDescription className="text-xs">
                      Respond to a report author, queue target, or staff member.
                    </CardDescription>
                  </div>
                  {replyOpen ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
                {replyOpen ? (
                  <CardContent className="border-t border-border pt-4">
                    <form onSubmit={submitReply} className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor={`${replyFormId}-target-ov`} className="text-xs text-muted-foreground">
                          Recipient (member, leader, or pastor)
                        </Label>
                        <select
                          id={`${replyFormId}-target-ov`}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={reply.recipientId}
                          onChange={(e) => setReply((p) => ({ ...p, recipientId: e.target.value }))}
                        >
                          <option value="">Select recipient…</option>
                          {(data?.replyTargets ?? []).map((t) => (
                            <option key={t.userId} value={t.userId}>
                              {t.label} — {t.source}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Input
                        placeholder="Subject"
                        value={reply.subject}
                        onChange={(e) => setReply((p) => ({ ...p, subject: e.target.value }))}
                      />
                      <textarea
                        className="min-h-[120px] w-full rounded-md border border-input px-3 py-2 text-sm"
                        placeholder="Write reply..."
                        value={reply.body}
                        onChange={(e) => setReply((p) => ({ ...p, body: e.target.value }))}
                      />
                      <Button type="submit" disabled={busy} className="gap-1">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send reply
                      </Button>
                    </form>
                  </CardContent>
                ) : null}
              </Card>
            </div>
          ) : (
            <>
          {triageCount === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No items match {selectedUrgencyLabel.toLowerCase()} in {selectedSourceLabel}.
              </CardContent>
            </Card>
          ) : null}

          {showSource('department', deptReports.length) || showSource('weekly', weeklyReports.length) ? (
            <div className="grid gap-4 xl:grid-cols-2 xl:items-stretch">
              {showSource('department', deptReports.length) ? (
                <InboxScrollCard
                  title="Department reports"
                  description="Submitted from department modules and leadership workflows."
                  count={deptReports.length}
                  emptyMessage="No department reports match your filters."
                  testId="reports-dept-inbox"
                >
                  {deptReports.map((r) => (
                    <div
                      key={r.id}
                      className={cn('rounded-lg border px-3 py-2.5 text-sm', URGENCY_META.medium.card)}
                    >
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.serviceUnit.name} · {r.author.firstName} {r.author.lastName} ·{' '}
                        {new Date(r.submittedAt).toLocaleString()}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{r.body}</p>
                      {r.author.userId ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() =>
                            pickReply({
                              userId: r.author.userId!,
                              subject: `Re: ${r.title}`,
                            })
                          }
                        >
                          <MessageSquare className="mr-1 h-3.5 w-3.5" />
                          Reply to sender
                        </Button>
                      ) : (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                          No linked user account — pick recipient manually below.
                        </p>
                      )}
                    </div>
                  ))}
                </InboxScrollCard>
              ) : null}

              {showSource('weekly', weeklyReports.length) ? (
                <InboxScrollCard
                  title="Weekly reports"
                  description="Auto-generated department summaries with attendance and activity stats."
                  count={weeklyReports.length}
                  emptyMessage="No weekly reports match your filters."
                  testId="reports-weekly-inbox"
                >
                  {weeklyReports.map((r) => (
                    <WeeklyReportItem key={r.id} report={r} />
                  ))}
                </InboxScrollCard>
              ) : null}
            </div>
          ) : null}

          {showSource('cell', cellAttendanceReports.length) ? (
            <InboxScrollCard
              title="Ministry / Cells attendance"
              description="Latest report per branch/cell — click a card for 3-month history and PDF export."
              count={cellAttendanceReports.length}
              emptyMessage="No Ministry/Cells attendance reports yet. Record attendance from a branch Weekly tab."
              testId="reports-cell-attendance-inbox"
            >
              {cellAttendanceReports.map((r) => (
                <CellAttendanceReportItemCard
                  key={r.branchId}
                  report={r}
                  history={historyInWindow(
                    cellAttendanceAll,
                    r.branchId,
                    (x) => x.branchId,
                    (x) => x.meetingDate || x.createdAt,
                  )}
                />
              ))}
            </InboxScrollCard>
          ) : null}

          {showSource('unit', unitAttendanceReports.length) ? (
            <InboxScrollCard
              title="Service unit attendance"
              description="Latest report per service unit — click a card for 3-month history and PDF export."
              count={unitAttendanceReports.length}
              emptyMessage="No service unit attendance reports yet. Record attendance from a unit Attendance tab."
              testId="reports-unit-attendance-inbox"
            >
              {unitAttendanceReports.map((r) => (
                <UnitAttendanceReportItemCard
                  key={r.serviceUnitId}
                  report={r}
                  history={historyInWindow(
                    unitAttendanceAll,
                    r.serviceUnitId,
                    (x) => x.serviceUnitId,
                    (x) => x.meetingDate || x.createdAt,
                  )}
                />
              ))}
            </InboxScrollCard>
          ) : null}

          {showSource('meeting', meetingSummaries.length) ? (
            <InboxScrollCard
              title="Meeting summaries"
              description="Published service unit meeting summaries."
              count={meetingSummaries.length}
              emptyMessage="No meeting summaries match your filters."
              testId="reports-meeting-summaries-inbox"
            >
              {meetingSummaries.map((s) => (
                <article
                  key={s.id}
                  className={cn('rounded-lg border px-3 py-2.5 text-sm', URGENCY_META.medium.card)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{s.title}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {s.serviceUnit.name}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.author.firstName} {s.author.lastName}
                    {s.meetingDate ? ` · ${formatAttendanceDate(s.meetingDate)}` : ''}
                    {` · ${new Date(s.createdAt).toLocaleString()}`}
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/45 p-2.5 font-sans text-xs leading-relaxed">
                    {s.body}
                  </pre>
                </article>
              ))}
            </InboxScrollCard>
          ) : null}

          {showSource('rtp', rtpRequests.length) ? (
            <InboxScrollCard
              title="RTP Requests"
              description="Service unit Request to Purchase — mark Received to stop 15-minute reminders and notify the originator (Processing)."
              count={rtpRequests.length}
              emptyMessage="No RTP requests match your filters."
              testId="reports-rtp-inbox"
            >
              {rtpRequests.map((r) => {
                const urgency =
                  r.status === 'SUBMITTED' ? 'high' : r.status === 'PROCESSING' ? 'medium' : 'info';
                const meta = URGENCY_META[urgency];
                const values = r.fieldValues ?? {};
                const lineItems = Array.isArray(values.line_items)
                  ? (values.line_items as Array<Record<string, unknown>>)
                  : [];
                const skipKeys = new Set([
                  'line_items',
                  'item_description',
                  'quantity',
                  'unit_cost',
                ]);
                const entries = Object.entries(values).filter(([key]) => !skipKeys.has(key));
                return (
                  <article key={r.id} className={cn('rounded-lg border px-3 py-2.5 text-sm', meta.card)}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{r.title}</p>
                      <Badge className={cn('text-[10px]', meta.badge)}>{r.status}</Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {r.serviceUnit.name}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.submittedBy.firstName} {r.submittedBy.lastName}
                      {` · ${new Date(r.createdAt).toLocaleString()}`}
                    </p>
                    {lineItems.length > 0 && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full min-w-[480px] text-xs">
                          <thead>
                            <tr className="border-b border-border/60 text-left text-muted-foreground">
                              <th className="py-1 pr-2 font-medium">Item</th>
                              <th className="py-1 pr-2 font-medium">Qty</th>
                              <th className="py-1 pr-2 font-medium">Unit</th>
                              <th className="py-1 pr-2 font-medium">Total</th>
                              <th className="py-1 font-medium">Link</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lineItems.map((item, idx) => {
                              const url = String(item.websiteUrl ?? item.website_url ?? '');
                              return (
                                <tr key={idx} className="border-b border-border/40 last:border-0">
                                  <td className="py-1 pr-2 align-top">
                                    {String(item.description ?? '—')}
                                  </td>
                                  <td className="py-1 pr-2 align-top">{String(item.quantity ?? '—')}</td>
                                  <td className="py-1 pr-2 align-top">{String(item.unitCost ?? '—')}</td>
                                  <td className="py-1 pr-2 align-top">
                                    {String(item.lineTotal ?? '—')}
                                  </td>
                                  <td className="py-1 align-top">
                                    {url ? (
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary underline-offset-2 hover:underline"
                                      >
                                        Open
                                      </a>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {entries.length > 0 && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full min-w-[280px] text-xs">
                          <thead>
                            <tr className="border-b border-border/60 text-left text-muted-foreground">
                              <th className="py-1 pr-3 font-medium">Field</th>
                              <th className="py-1 font-medium">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entries.map(([key, value]) => (
                              <tr key={key} className="border-b border-border/40 last:border-0">
                                <td className="py-1 pr-3 align-top font-medium">
                                  {key.replace(/_/g, ' ')}
                                </td>
                                <td className="py-1 align-top whitespace-pre-wrap">
                                  {value === null || value === undefined || value === ''
                                    ? '—'
                                    : String(value)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.status === 'SUBMITTED' && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={async () => {
                            try {
                              await api.post(`/rtp/requests/${r.id}/received`);
                              toast.success('Marked Received — originator notified (Processing)');
                              qc.invalidateQueries({ queryKey: [queryKey] });
                            } catch (e) {
                              toast.error(apiErrorMessage(e, 'Could not mark received'));
                            }
                          }}
                        >
                          Received
                        </Button>
                      )}
                      {(r.status === 'SUBMITTED' || r.status === 'PROCESSING') && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await api.post(`/rtp/requests/${r.id}/approve`);
                                toast.success('RTP approved');
                                qc.invalidateQueries({ queryKey: [queryKey] });
                              } catch (e) {
                                toast.error(apiErrorMessage(e, 'Could not approve RTP'));
                              }
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              const reason = window.prompt('Rejection reason (optional)') ?? undefined;
                              try {
                                await api.post(`/rtp/requests/${r.id}/reject`, { reason });
                                toast.success('RTP rejected');
                                qc.invalidateQueries({ queryKey: [queryKey] });
                              } catch (e) {
                                toast.error(apiErrorMessage(e, 'Could not reject RTP'));
                              }
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </InboxScrollCard>
          ) : null}

          {showSource('queue', queueItems.length) || showSource('notification', notifications.length) ? (
            <div className="grid gap-4 xl:grid-cols-2 xl:items-stretch">
              {showSource('queue', queueItems.length) ? (
                <InboxScrollCard
                  title="Queue alerts"
                  description="Automation queue items — failed sends and pending pastoral alerts."
                  count={queueItems.length}
                  emptyMessage="No queue alerts match your filters."
                  testId="reports-queue-inbox"
                >
                  {queueItems.map((q) => {
                    const urgency = queueUrgency(q.status);
                    const meta = URGENCY_META[urgency];
                    return (
                      <div key={q.id} className={cn('rounded-lg border px-3 py-2.5 text-sm', meta.card)}>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{q.title}</p>
                          <Badge className={cn('text-[10px]', meta.badge)}>
                            {meta.label} · {q.status}
                          </Badge>
                          {(q.metadata?.tags ?? []).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {q.kind} · {new Date(q.createdAt).toLocaleString()}
                          {q.serviceUnit?.name ? ` · ${q.serviceUnit.name}` : ''}
                          {q.metadata?.branchName ? ` · ${q.metadata.branchName}` : ''}
                        </p>
                        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                          {q.body}
                        </p>
                        {q.targetUserId ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() =>
                              pickReply({
                                userId: q.targetUserId!,
                                subject: `Re: ${q.title}`,
                              })
                            }
                          >
                            <MessageSquare className="mr-1 h-3.5 w-3.5" />
                            Reply
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </InboxScrollCard>
              ) : null}

              {showSource('notification', notifications.length) ? (
                <InboxScrollCard
                  title="Notifications"
                  description="In-app alerts sent to administrators and pastoral staff."
                  count={notifications.length}
                  emptyMessage="No notifications match your filters."
                  testId="reports-notifications-inbox"
                >
                  {notifications.map((n) => (
                    <div key={n.id} className="rounded-lg border bg-card px-3 py-2.5 text-sm">
                      <p className="font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {n.type} · {new Date(n.sentAt).toLocaleString()}
                      </p>
                      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {n.body}
                      </p>
                    </div>
                  ))}
                </InboxScrollCard>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-1 xl:items-start">
            <Card id={replyFormId} className="xl:sticky xl:top-4">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
                aria-expanded={replyOpen}
                onClick={() => setReplyOpen((o) => !o)}
              >
                <div>
                  <CardTitle className="text-base">Reply</CardTitle>
                  <CardDescription className="text-xs">
                    Respond to a report author, queue target, or staff member.
                  </CardDescription>
                </div>
                {replyOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
              {replyOpen ? (
                <CardContent className="border-t border-border pt-4">
                  <form onSubmit={submitReply} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor={`${replyFormId}-target`} className="text-xs text-muted-foreground">
                        Recipient (member, leader, or pastor)
                      </Label>
                      <select
                        id={`${replyFormId}-target`}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={reply.recipientId}
                        onChange={(e) => setReply((p) => ({ ...p, recipientId: e.target.value }))}
                      >
                        <option value="">Select recipient…</option>
                        {(data?.replyTargets ?? []).map((t) => (
                          <option key={t.userId} value={t.userId}>
                            {t.label} — {t.source}
                          </option>
                        ))}
                      </select>
                      {selectedTarget && (
                        <p className="text-xs text-muted-foreground">{selectedTarget.source}</p>
                      )}
                    </div>
                    <Input
                      placeholder="Subject"
                      value={reply.subject}
                      onChange={(e) => setReply((p) => ({ ...p, subject: e.target.value }))}
                    />
                    <textarea
                      className="min-h-[120px] w-full rounded-md border border-input px-3 py-2 text-sm"
                      placeholder="Write reply..."
                      value={reply.body}
                      onChange={(e) => setReply((p) => ({ ...p, body: e.target.value }))}
                    />
                    <Button type="submit" disabled={busy} className="gap-1">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send reply
                    </Button>
                  </form>
                </CardContent>
              ) : null}
            </Card>

            {showSource('message', messages.length) ? (
              <InboxScrollCard
                title="In-app messages"
                description="Church-wide direct messages between members and leadership."
                count={messages.length}
                emptyMessage="No messages match your filters."
                testId="reports-messages-inbox"
                className="min-h-0 xl:min-h-[22rem]"
              >
                {messages.map((m) => (
                  <div key={m.id} className="rounded-lg border bg-card px-3 py-2.5 text-sm">
                    <p className="font-medium">{m.subject ?? '(no subject)'}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.sender.firstName} {m.sender.lastName} → {m.recipient.firstName}{' '}
                      {m.recipient.lastName} · {new Date(m.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          pickReply({
                            userId: m.sender.id,
                            subject: m.subject ? `Re: ${m.subject}` : 'Re: Your message',
                          })
                        }
                      >
                        <MessageSquare className="mr-1 h-3.5 w-3.5" />
                        Reply to {m.sender.firstName}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          pickReply({
                            userId: m.recipient.id,
                            subject: m.subject ? `Re: ${m.subject}` : 'Follow-up',
                          })
                        }
                      >
                        Message {m.recipient.firstName}
                      </Button>
                    </div>
                  </div>
                ))}
              </InboxScrollCard>
            ) : null}
          </div>
            </>
          )}
        </div>
      )}
        </div>
      </div>
    </DashboardModuleShell>
  );
}
