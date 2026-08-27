'use client';

import { cn } from '@/lib/utils';

export type AnalyticsKpi = {
  label: string;
  value: string;
  hint?: string;
};

/** Executive KPI strip — uppercase micro-labels, no icon boxes. */
export function AnalyticsKpiRail({
  items,
  className,
}: {
  items: AnalyticsKpi[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-px overflow-hidden rounded-xl border border-slate-200/80 bg-slate-200/80 shadow-sm sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-800 dark:bg-slate-800',
        className,
      )}
      role="group"
      aria-label="Key membership metrics"
    >
      {items.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-white px-4 py-3.5 sm:px-5 sm:py-4 dark:bg-card"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {kpi.label}
          </p>
          <p className="mt-1.5 font-heading text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
            {kpi.value}
          </p>
          {kpi.hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
