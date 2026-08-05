'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  groupByMonth,
  monthKeyFromIso,
  monthLabelFromKey,
} from '@/components/reports/month-grouped-attendance';
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
  onApply,
  onReset,
  className,
}: {
  items: OutreachFilterItem[];
  /** Applied filters (drive the list). */
  stage: string;
  monthKey: string;
  onApply: (stage: string, monthKey: string) => void;
  onReset: () => void;
  className?: string;
}) {
  const [draftStage, setDraftStage] = useState(stage);
  const [draftMonthKey, setDraftMonthKey] = useState(monthKey);

  useEffect(() => {
    setDraftStage(stage);
    setDraftMonthKey(monthKey);
  }, [stage, monthKey]);

  const months = useMemo(() => availableOutreachMonths(items), [items]);

  const dirty = draftStage !== stage || draftMonthKey !== monthKey;
  const hasApplied = stage !== 'all' || monthKey !== 'all';
  const hasDraft = draftStage !== 'all' || draftMonthKey !== 'all';

  const go = () => onApply(draftStage, draftMonthKey);

  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-1.5', className)}>
      <span className="hidden h-4 w-px bg-border sm:inline-block" aria-hidden />
      <div className="flex flex-wrap items-center gap-1.5">
        <Label htmlFor="outreach-stage-filter" className="sr-only">
          Journey / stage
        </Label>
        <select
          id="outreach-stage-filter"
          aria-label="Journey / stage"
          className="h-7 rounded-md border border-input bg-background px-2 text-[11px]"
          value={draftStage}
          onChange={(e) => setDraftStage(e.target.value)}
        >
          <option value="all">All stages</option>
          {OUTREACH_JOURNEY_STAGES.map((s) => (
            <option key={s} value={s}>
              {OUTREACH_STAGE_LABELS[s] ?? s}
            </option>
          ))}
        </select>
        <Label htmlFor="outreach-month-filter" className="sr-only">
          Month
        </Label>
        <select
          id="outreach-month-filter"
          aria-label="Month"
          className="h-7 rounded-md border border-input bg-background px-2 text-[11px]"
          value={draftMonthKey}
          onChange={(e) => setDraftMonthKey(e.target.value)}
        >
          <option value="all">All months</option>
          {months.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
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
              setDraftStage('all');
              setDraftMonthKey('all');
              onReset();
            }}
          >
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Re-export date helper for callers that display capture dates. */
export { formatAttendanceDate } from '@/components/reports/month-grouped-attendance';
