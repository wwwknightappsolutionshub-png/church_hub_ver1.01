'use client';

import { cn } from '@/lib/utils';
import { MEMBER_STATUSES, STATUS_LABELS } from '@/lib/membership';

interface StatusPipelineProps {
  counts: Record<string, number>;
  activeFilter?: string;
  onFilter?: (status: string | undefined) => void;
}

export function StatusPipeline({ counts, activeFilter, onFilter }: StatusPipelineProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {MEMBER_STATUSES.map((status, i) => {
        const active = activeFilter === status;
        const count = counts[status] ?? 0;
        return (
          <button
            key={status}
            type="button"
            onClick={() => onFilter?.(active ? undefined : status)}
            className={cn(
              'relative rounded-xl border p-4 text-left transition-all',
              active
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border bg-card hover:border-primary/30 hover:bg-muted/30',
            )}
          >
            {i < MEMBER_STATUSES.length - 1 && (
              <span className="absolute -right-2 top-1/2 hidden h-0.5 w-4 bg-border lg:block" aria-hidden />
            )}
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-sm font-medium">{STATUS_LABELS[status]}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {i === 0 ? 'Entry' : i === MEMBER_STATUSES.length - 1 ? 'Mature' : 'Stage ' + (i + 1)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
