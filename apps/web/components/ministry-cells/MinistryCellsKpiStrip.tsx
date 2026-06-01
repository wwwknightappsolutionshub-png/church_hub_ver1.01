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
    { label: 'Unassigned', value: unassigned, icon: UserCircle, muted: unassigned === 0 },
  ];

  return (
    <div
      className={cn(
        'flex flex-wrap items-stretch gap-px overflow-hidden rounded-xl border border-slate-200/80 bg-slate-900 text-white shadow-sm dark:border-slate-700',
        className,
      )}
    >
      {items.map(({ label, value, icon: Icon, alert, muted }) => (
        <div
          key={label}
          className={cn(
            'flex min-w-[calc(50%-1px)] flex-1 items-center gap-2.5 px-3 py-2.5 sm:min-w-0',
            alert ? 'bg-red-950/40' : 'bg-slate-900',
          )}
        >
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              alert ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-slate-300',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
            <p
              className={cn(
                'font-heading text-xl font-bold tabular-nums leading-none',
                alert && 'text-red-300',
                muted && 'text-slate-500',
              )}
            >
              {value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
