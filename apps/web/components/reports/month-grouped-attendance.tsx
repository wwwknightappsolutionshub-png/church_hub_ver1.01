'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, FileDown, LayoutGrid, Printer, Table2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type AttendanceMetricRow = {
  id: string;
  title: string;
  subtitle?: string;
  meetingDate: string;
  presentCount: number;
  maleCount: number;
  femaleCount: number;
  boysCount: number;
  girlsCount: number;
  testifiersCount?: number;
  firstTimersCount?: number;
  metricLabels?: { boys?: string; girls?: string };
};

export function toDateInputValue(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function inDateRange(iso: string, from: string, to: string) {
  const key = toDateInputValue(iso);
  if (!key) return !from && !to;
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
}

export function formatAttendanceDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function monthKeyFromIso(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabelFromKey(key: string) {
  if (key === 'unknown') return 'Unknown';
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function groupByMonth<T>(
  items: T[],
  dateFn: (item: T) => string,
): Array<{ key: string; label: string; items: T[] }> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = monthKeyFromIso(dateFn(item));
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, groupItems]) => ({
      key,
      label: monthLabelFromKey(key),
      items: groupItems,
    }));
}

export function MonthGroupedSections<T>({
  groups,
  renderItem,
  renderGroupBody,
  emptyMessage,
  defaultOpen = false,
}: {
  groups: Array<{ key: string; label: string; items: T[] }>;
  renderItem?: (item: T) => React.ReactNode;
  /** When set, renders the full group body (e.g. one Excel table per month). */
  renderGroupBody?: (items: T[], group: { key: string; label: string }) => React.ReactNode;
  emptyMessage?: string;
  /** When false (default), all month sections start collapsed. */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpen((prev) => {
      const next = { ...prev };
      for (const g of groups) {
        if (next[g.key] === undefined) {
          next[g.key] = defaultOpen;
        }
      }
      return next;
    });
  }, [groups, defaultOpen]);

  if (groups.length === 0) {
    return emptyMessage ? (
      <p className="pb-2 text-xs text-muted-foreground">{emptyMessage}</p>
    ) : null;
  }

  return (
    <div className="space-y-2">
      {groups.map((g) => {
        const isOpen = open[g.key] ?? defaultOpen;
        return (
          <section key={g.key} className="rounded-md border border-border/70">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left hover:bg-muted/40"
              aria-expanded={isOpen}
              onClick={() => setOpen((p) => ({ ...p, [g.key]: !isOpen }))}
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                {g.label}
              </span>
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] tabular-nums">
                {g.items.length}
              </Badge>
            </button>
            {isOpen ? (
              <div className="space-y-1.5 border-t border-border/60 px-2 py-2">
                {renderGroupBody
                  ? renderGroupBody(g.items, g)
                  : g.items.map((item) => renderItem?.(item))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

export function AttendanceMetricCard({
  row,
  accentClass,
  onPdf,
  onPrint,
  onClick,
}: {
  row: AttendanceMetricRow;
  accentClass?: string;
  onPdf?: () => void;
  onPrint?: () => void;
  onClick?: () => void;
}) {
  const boysLabel = row.metricLabels?.boys ?? 'B';
  const girlsLabel = row.metricLabels?.girls ?? 'G';
  const details = [
    { label: 'M', value: row.maleCount },
    { label: 'F', value: row.femaleCount },
    { label: boysLabel, value: row.boysCount },
    { label: girlsLabel, value: row.girlsCount },
    ...(typeof row.firstTimersCount === 'number'
      ? [{ label: 'FT', value: row.firstTimersCount }]
      : []),
  ];

  return (
    <article
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'rounded-md border px-2.5 py-1.5 transition',
        onClick && 'cursor-pointer hover:border-primary/40',
        accentClass ?? 'border-l-4 border-l-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/20',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-sm font-semibold leading-tight">{row.title}</p>
            <p className="text-[11px] text-muted-foreground">
              {row.subtitle ? `${row.subtitle} · ` : ''}
              {formatAttendanceDate(row.meetingDate)}
            </p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {details.map((d) => (
              <span
                key={d.label}
                className="inline-flex items-center gap-1 rounded border border-border/50 bg-background/70 px-1.5 py-0.5 text-[10px]"
              >
                <span className="text-muted-foreground">{d.label}</span>
                <span className="font-semibold tabular-nums">{d.value}</span>
              </span>
            ))}
            {typeof row.testifiersCount === 'number' && row.testifiersCount > 0 ? (
              <span className="text-[10px] text-muted-foreground">
                Testifiers {row.testifiersCount}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <p className="text-base font-bold tabular-nums leading-none">{row.presentCount}</p>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Total</p>
          </div>
          {onPdf || onPrint ? (
            <div className="flex items-center gap-1">
              {onPdf ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-[11px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPdf();
                  }}
                >
                  <FileDown className="h-3.5 w-3.5" />
                  PDF
                </Button>
              ) : null}
              {onPrint ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-[11px]"
                  aria-label="Print"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrint();
                  }}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function AttendanceInboxShell({
  title,
  description,
  count,
  emptyMessage,
  testId,
  dateFrom,
  dateTo,
  onApplyDates,
  onClearDates,
  viewMode,
  onViewMode,
  toolbarExtra,
  children,
}: {
  title: string;
  description?: string;
  count: number;
  emptyMessage: string;
  testId?: string;
  dateFrom: string;
  dateTo: string;
  onApplyDates: (from: string, to: string) => void;
  onClearDates: () => void;
  viewMode: 'cards' | 'table';
  onViewMode: (v: 'cards' | 'table') => void;
  toolbarExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const fromId = `${testId ?? 'att'}-from`;
  const toId = `${testId ?? 'att'}-to`;
  const [draftFrom, setDraftFrom] = useState(dateFrom);
  const [draftTo, setDraftTo] = useState(dateTo);

  useEffect(() => {
    setDraftFrom(dateFrom);
    setDraftTo(dateTo);
  }, [dateFrom, dateTo]);

  const draftDirty = draftFrom !== dateFrom || draftTo !== dateTo;

  return (
    <Card className="flex min-h-[16rem] flex-col xl:min-h-[20rem]" data-testid={testId}>
      <CardHeader className="shrink-0 space-y-1.5 p-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-none">{title}</CardTitle>
          <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px] tabular-nums">
            {count}
          </Badge>
        </div>
        {description ? (
          <CardDescription className="text-[11px] leading-snug">{description}</CardDescription>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Label htmlFor={fromId} className="sr-only">
              From date
            </Label>
            <Input
              id={fromId}
              type="date"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="h-7 w-[8.5rem] px-2 text-[11px]"
            />
            <span className="text-[10px] text-muted-foreground">to</span>
            <Label htmlFor={toId} className="sr-only">
              To date
            </Label>
            <Input
              id={toId}
              type="date"
              value={draftTo}
              onChange={(e) => setDraftTo(e.target.value)}
              className="h-7 w-[8.5rem] px-2 text-[11px]"
            />
            <Button
              type="button"
              size="sm"
              className="h-7 px-2.5 text-[11px]"
              disabled={!draftDirty}
              onClick={() => onApplyDates(draftFrom, draftTo)}
            >
              Apply
            </Button>
            {dateFrom || dateTo || draftFrom || draftTo ? (
              <button
                type="button"
                className="text-[11px] font-medium text-primary hover:underline"
                onClick={() => {
                  setDraftFrom('');
                  setDraftTo('');
                  onClearDates();
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
          {toolbarExtra}
          <div
            className="ml-auto inline-flex rounded-md border border-border p-0.5"
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              className={cn(
                'inline-flex h-7 items-center gap-1 rounded-sm px-2 text-[11px] font-medium transition',
                viewMode === 'cards'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
              aria-pressed={viewMode === 'cards'}
              onClick={() => onViewMode('cards')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </button>
            <button
              type="button"
              className={cn(
                'inline-flex h-7 items-center gap-1 rounded-sm px-2 text-[11px] font-medium transition',
                viewMode === 'table'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
              aria-pressed={viewMode === 'table'}
              onClick={() => onViewMode('table')}
            >
              <Table2 className="h-3.5 w-3.5" />
              Excel
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden p-0 pb-3">
        <div className="max-h-[min(28rem,58vh)] overflow-y-auto overscroll-contain px-3">
          {count === 0 ? (
            <p className="pb-2 text-xs text-muted-foreground">{emptyMessage}</p>
          ) : (
            children
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AttendanceExcelTable({
  rows,
  testId,
  onPdf,
  onPrint,
  compact,
}: {
  rows: AttendanceMetricRow[];
  testId?: string;
  onPdf?: (row: AttendanceMetricRow) => void;
  onPrint?: (row: AttendanceMetricRow) => void;
  compact?: boolean;
}) {
  const showActions = Boolean(onPdf || onPrint);
  return (
    <div className={cn('overflow-x-auto rounded-md border border-border/70', compact && 'border-0')}>
      <table
        className="w-full min-w-[720px] border-collapse text-left text-[11px]"
        data-testid={testId}
      >
        <thead className="sticky top-0 z-[1] bg-muted/95 backdrop-blur">
          <tr className="border-b text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="px-2 py-1.5 font-semibold">Name</th>
            <th className="px-2 py-1.5 font-semibold">Meta</th>
            <th className="px-2 py-1.5 font-semibold">Date</th>
            <th className="px-2 py-1.5 font-semibold">Total</th>
            <th className="px-2 py-1.5 font-semibold">M</th>
            <th className="px-2 py-1.5 font-semibold">F</th>
            <th className="px-2 py-1.5 font-semibold">B</th>
            <th className="px-2 py-1.5 font-semibold">G</th>
            <th className="px-2 py-1.5 font-semibold">FT</th>
            <th className="px-2 py-1.5 font-semibold">Test.</th>
            {showActions ? <th className="px-2 py-1.5 font-semibold">Export</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.id}
              className={cn(
                'border-b border-border/50',
                i % 2 === 0 ? 'bg-background' : 'bg-muted/30',
              )}
            >
              <td className="px-2 py-1 font-medium">{r.title}</td>
              <td className="px-2 py-1 text-muted-foreground">{r.subtitle || '—'}</td>
              <td className="whitespace-nowrap px-2 py-1">{formatAttendanceDate(r.meetingDate)}</td>
              <td className="px-2 py-1 font-semibold tabular-nums">{r.presentCount}</td>
              <td className="px-2 py-1 tabular-nums">{r.maleCount}</td>
              <td className="px-2 py-1 tabular-nums">{r.femaleCount}</td>
              <td className="px-2 py-1 tabular-nums">{r.boysCount}</td>
              <td className="px-2 py-1 tabular-nums">{r.girlsCount}</td>
              <td className="px-2 py-1 tabular-nums">{r.firstTimersCount ?? 0}</td>
              <td className="px-2 py-1 tabular-nums">{r.testifiersCount ?? 0}</td>
              {showActions ? (
                <td className="px-2 py-1">
                  <div className="inline-flex items-center gap-0.5">
                    {onPdf ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 gap-1 px-1.5 text-[10px]"
                        onClick={() => onPdf(r)}
                      >
                        <FileDown className="h-3 w-3" />
                        PDF
                      </Button>
                    ) : null}
                    {onPrint ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 gap-1 px-1.5 text-[10px]"
                        aria-label="Print"
                        onClick={() => onPrint(r)}
                      >
                        <Printer className="h-3 w-3" />
                        Print
                      </Button>
                    ) : null}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function filterAttendanceRows<T>(
  all: T[],
  dateFn: (item: T) => string,
  dateFrom: string,
  dateTo: string,
  latestKeyFn?: (item: T) => string,
): T[] {
  const ranged =
    dateFrom || dateTo
      ? all.filter((r) => inDateRange(dateFn(r), dateFrom, dateTo))
      : all;
  const sorted = [...ranged].sort(
    (a, b) => new Date(dateFn(b)).getTime() - new Date(dateFn(a)).getTime(),
  );
  if (dateFrom || dateTo || !latestKeyFn) return sorted;
  const map = new Map<string, T>();
  for (const item of sorted) {
    const key = latestKeyFn(item);
    if (!map.has(key)) map.set(key, item);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(dateFn(b)).getTime() - new Date(dateFn(a)).getTime(),
  );
}
