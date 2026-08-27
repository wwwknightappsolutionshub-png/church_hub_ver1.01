'use client';

import type { MembershipAnalyticsDemographicsDto } from '@church-hub/shared-types';
import { AnalyticsPanel } from '@/components/membership/AnalyticsPanel';

function DemoColumn({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; label: string; count: number }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {title}
      </p>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="mb-0.5 flex justify-between text-xs">
              <span className="font-medium">{r.label}</span>
              <span className="tabular-nums text-muted-foreground">{r.count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-slate-800 dark:bg-slate-200"
                style={{ width: `${Math.round((r.count / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AnalyticsDemographicsPanel({
  demographics,
}: {
  demographics: MembershipAnalyticsDemographicsDto;
}) {
  return (
    <AnalyticsPanel
      title="Demographics"
      subtitle="Gender, age band, and family linkage for the filtered membership set."
    >
      <div className="grid gap-6 sm:grid-cols-3" data-testid="analytics-demographics">
        <DemoColumn title="Gender" rows={demographics.byGender} />
        <DemoColumn title="Age band" rows={demographics.byAgeBand} />
        <DemoColumn title="Family" rows={demographics.byFamily} />
      </div>
    </AnalyticsPanel>
  );
}
