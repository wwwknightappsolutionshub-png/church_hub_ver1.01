'use client';

import { AlertTriangle, Network, UserCircle, Users } from 'lucide-react';
import type { BranchRow } from '@/components/ministry-cells/types';
import { cn } from '@/lib/utils';

export function MinistryCellsKpiStrip({
  branches,
  className,
}: {
  branches: BranchRow[];
  className?: string;
}) {
  const totalMembers = branches.reduce((n, b) => n + b.memberCount, 0);
  const totalIncidents = branches.reduce((n, b) => n + b.incidentCount, 0);
  const unassigned = branches.filter((b) => !b.leader).length;

  const items = [
    { label: 'Branches', value: branches.length, icon: Network },
    { label: 'Members', value: totalMembers, icon: Users },
    { label: 'Incidents', value: totalIncidents, icon: AlertTriangle, alert: totalIncidents > 0 },
    {
      label: 'Unassigned Cells',
      value: unassigned,
      icon: UserCircle,
      muted: unassigned === 0,
    },
  ];

  return (
    <div
      className={cn(
        'flex min-w-0 flex-wrap items-stretch divide-x divide-slate-200',
        className,
      )}
      role="group"
      aria-label="Ministry cells summary"
    >
      {items.map(({ label, value, icon: Icon, alert, muted }) => (
        <div key={label} className="min-w-0 px-4 first:pl-0 last:pr-0">
          <div className="flex items-center gap-1.5">
            <Icon
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                alert ? 'text-red-600' : 'text-slate-500',
              )}
              aria-hidden
            />
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {label}
            </p>
          </div>
          <p
            className={cn(
              'mt-0.5 font-heading text-lg font-bold tabular-nums leading-tight text-slate-900',
              alert && 'text-red-700',
              muted && 'text-slate-400',
            )}
          >
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
