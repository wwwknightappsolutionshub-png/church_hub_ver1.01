'use client';

import { useMemo } from 'react';
import {
  groupByMonth,
  monthKeyFromIso,
  monthLabelFromKey,
} from '@/components/reports/month-grouped-attendance';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const OUTREACH_JOURNEY_STAGES = [
  'CAPTURED',
  'CONTACTED',
  'VISITED',
  'READY_FOR_MEMBERSHIP',
  'CONVERTED',
  'ARCHIVED',
] as const;

export const OUTREACH_STAGE_LABELS: Record<string, string> = {
  CAPTURED: 'Captured',
  CONTACTED: 'Contacted',
  VISITED: 'Visited',
  READY_FOR_MEMBERSHIP: 'Ready for membership',
  CONVERTED: 'Converted',
  ARCHIVED: 'Archived',
};

export type OutreachFilterItem = {
  id: string;
  convertStage: string;
  capturedAt: string;
};

export function filterOutreachItems<T extends OutreachFilterItem>(
  items: T[],
  opts: { stage: string; monthKey: string; dateFrom: string; dateTo: string },
): T[] {
  return items.filter((item) => {
    if (opts.stage !== 'all' && item.convertStage !== opts.stage) return false;
    if (opts.monthKey !== 'all' && monthKeyFromIso(item.capturedAt) !== opts.monthKey) {
      return false;
    }
    if (opts.dateFrom || opts.dateTo) {
      const key = item.capturedAt.slice(0, 10);
      // Prefer local date key via monthKeyFromIso's date portion
      const d = new Date(item.capturedAt);
      if (!Number.isNaN(d.getTime())) {
        const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (opts.dateFrom && local < opts.dateFrom) return false;
        if (opts.dateTo && local > opts.dateTo) return false;
      } else if (key) {
        if (opts.dateFrom && key < opts.dateFrom) return false;
        if (opts.dateTo && key > opts.dateTo) return false;
      }
    }
    return true;
  });
}

export function outreachTotalsByStage<T extends OutreachFilterItem>(items: T[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.convertStage, (map.get(item.convertStage) ?? 0) + 1);
  }
  return OUTREACH_JOURNEY_STAGES.filter((s) => map.has(s)).map((stage) => ({
    stage,
    label: OUTREACH_STAGE_LABELS[stage] ?? stage,
    count: map.get(stage) ?? 0,
  }));
}

export function outreachTotalsByMonth<T extends OutreachFilterItem>(items: T[]) {
  const groups = groupByMonth(items, (i) => i.capturedAt);
  return groups.map((g) => ({ key: g.key, label: g.label, count: g.items.length }));
}

export function availableOutreachMonths<T extends OutreachFilterItem>(items: T[]) {
  const keys = new Set(items.map((i) => monthKeyFromIso(i.capturedAt)));
  return Array.from(keys)
    .filter((k) => k !== 'unknown')
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({ key, label: monthLabelFromKey(key) }));
}

export function OutreachAdvancedFiltersPanel({
  items,
  stage,
  monthKey,
  onStage,
  onMonthKey,
  className,
}: {
  items: OutreachFilterItem[];
  stage: string;
  monthKey: string;
  onStage: (v: string) => void;
  onMonthKey: (v: string) => void;
  className?: string;
}) {
  const months = useMemo(() => availableOutreachMonths(items), [items]);
  const byStage = useMemo(() => outreachTotalsByStage(items), [items]);
  const byMonth = useMemo(() => outreachTotalsByMonth(items), [items]);

  return (
    <div className={cn('space-y-2 rounded-md border border-border/70 bg-muted/20 p-2.5', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Advanced outreach filters
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="outreach-stage-filter" className="text-[10px] text-muted-foreground">
            Journey / stage
          </Label>
          <select
            id="outreach-stage-filter"
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={stage}
            onChange={(e) => onStage(e.target.value)}
          >
            <option value="all">All stages</option>
            {OUTREACH_JOURNEY_STAGES.map((s) => (
              <option key={s} value={s}>
                {OUTREACH_STAGE_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="outreach-month-filter" className="text-[10px] text-muted-foreground">
            Month
          </Label>
          <select
            id="outreach-month-filter"
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={monthKey}
            onChange={(e) => onMonthKey(e.target.value)}
          >
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        {(stage !== 'all' || monthKey !== 'all') && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-[11px]"
            onClick={() => {
              onStage('all');
              onMonthKey('all');
            }}
          >
            Reset filters
          </Button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] font-medium text-muted-foreground">Total by stage</p>
          <div className="flex flex-wrap gap-1">
            {byStage.length === 0 ? (
              <span className="text-[11px] text-muted-foreground">No data</span>
            ) : (
              byStage.map((s) => (
                <button
                  key={s.stage}
                  type="button"
                  onClick={() => onStage(s.stage === stage ? 'all' : s.stage)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]',
                    stage === s.stage
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background',
                  )}
                >
                  {s.label}
                  <Badge variant="secondary" className="h-4 px-1 text-[9px] tabular-nums">
                    {s.count}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-medium text-muted-foreground">Total by month</p>
          <div className="flex flex-wrap gap-1">
            {byMonth.length === 0 ? (
              <span className="text-[11px] text-muted-foreground">No data</span>
            ) : (
              byMonth.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => onMonthKey(m.key === monthKey ? 'all' : m.key)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]',
                    monthKey === m.key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background',
                  )}
                >
                  {m.label}
                  <Badge variant="secondary" className="h-4 px-1 text-[9px] tabular-nums">
                    {m.count}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Re-export date helper for callers that display capture dates. */
export { formatAttendanceDate } from '@/components/reports/month-grouped-attendance';
