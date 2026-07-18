'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Shared corporate / enterprise module chrome (Kingdom Konnect style). */
export function EnterpriseShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'min-h-0 bg-gradient-to-b from-slate-50 via-background to-slate-50/80',
        'dark:from-slate-950 dark:via-background dark:to-slate-950/50',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EnterpriseHero({
  eyebrow: _eyebrow,
  title: _title,
  description: _description,
  badge,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  // Module title banners are hidden app-wide; keep a compact strip only when
  // the page still needs hero actions or a status badge.
  if (!actions && !badge) return null;

  return (
    <div className="border-b border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-2 px-4 py-3 sm:px-6 md:px-8">
        {badge}
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function EnterpriseTabNav({
  tabs,
  active,
  onChange,
  ariaLabel,
}: {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  return (
    <nav
      className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
      aria-label={ariaLabel ?? 'Module sections'}
    >
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 md:px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              'shrink-0 rounded-md px-4 py-2.5 text-sm font-semibold transition',
              active === t.id
                ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function EnterpriseContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8', className)}>
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-card">
        {children}
      </div>
    </div>
  );
}
