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
  eyebrow,
  title,
  description,
  badge,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  const showEyebrow =
    eyebrow?.trim() &&
    eyebrow.trim().toLowerCase() !== title.trim().toLowerCase();

  return (
    <header className="relative overflow-visible border-b border-slate-200/80 bg-slate-900 text-white dark:border-slate-800">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,58,95,0.9) 50%, rgba(15,23,42,0.95) 100%)',
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10 md:px-8">
        {showEyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
        ) : null}
        <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', showEyebrow && 'mt-2')}>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">{description}</p>
            {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
          </div>
          {badge}
        </div>
      </div>
    </header>
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
