'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
  collapsible = false,
  defaultExpanded = true,
  collapseTestId,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  accent?: 'primary' | 'gold' | 'slate';
  collapsible?: boolean;
  defaultExpanded?: boolean;
  collapseTestId?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const rail =
    accent === 'gold'
      ? 'border-l-amber-500'
      : accent === 'slate'
        ? 'border-l-slate-400'
        : 'border-l-slate-900 dark:border-l-slate-100';

  const showBody = !collapsible || expanded;

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-card',
        'border-l-[3px]',
        rail,
        className,
      )}
    >
      <div
        className={cn(
          'flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between',
          showBody && 'border-b border-slate-200/80 dark:border-slate-800',
        )}
      >
        <div className="min-w-0 flex-1">
          {collapsible ? (
            <button
              type="button"
              data-testid={collapseTestId}
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full items-start gap-2 rounded-md text-left transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-slate-200"
            >
              {expanded ? (
                <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <div className="min-w-0">
                <h3 className="font-heading text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  {title}
                </h3>
                {expanded && subtitle ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
                ) : null}
              </div>
            </button>
          ) : (
            <>
              <h3 className="font-heading text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {title}
              </h3>
              {subtitle ? (
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
              ) : null}
            </>
          )}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      {showBody ? (
        <div className={cn('px-4 py-3 sm:px-5 sm:py-4', bodyClassName)}>{children}</div>
      ) : null}
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
