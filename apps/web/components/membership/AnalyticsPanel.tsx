'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Enterprise section panel — left accent rail, hairline header, no nested card chrome. */
export function AnalyticsPanel({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
  accent = 'primary',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  accent?: 'primary' | 'gold' | 'slate';
}) {
  const rail =
    accent === 'gold'
      ? 'border-l-amber-500'
      : accent === 'slate'
        ? 'border-l-slate-400'
        : 'border-l-slate-900 dark:border-l-slate-100';

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-card',
        'border-l-[3px]',
        rail,
        className,
      )}
    >
      <div className="flex flex-col gap-2 border-b border-slate-200/80 px-4 py-3 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800">
        <div className="min-w-0">
          <h3 className="font-heading text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      <div className={cn('px-4 py-3 sm:px-5 sm:py-4', bodyClassName)}>{children}</div>
    </section>
  );
}

export function AnalyticsEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[8rem] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <p className="max-w-sm text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
