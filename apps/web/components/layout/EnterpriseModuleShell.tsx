'use client';

import type { ReactNode } from 'react';
import { useModuleHeroStickyTitle } from '@/components/layout/useStickyModuleTitle';
import { cn } from '@/lib/utils';

/** High-contrast chip styles for controls placed on the dark enterprise hero. */
export const enterpriseHeroChipClass =
  'border-white/30 bg-white/12 font-semibold text-white shadow-sm backdrop-blur-sm hover:bg-white/22 hover:text-white';

export const enterpriseHeroBadgeGoldClass =
  'border border-amber-200/45 bg-amber-400/25 px-3 py-1 text-amber-50 shadow-sm';

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
  const headerRef = useModuleHeroStickyTitle(title);
  const showEyebrow =
    eyebrow?.trim() && eyebrow.trim().toLowerCase() !== title.trim().toLowerCase();

  return (
    <header
      ref={headerRef}
      className="relative overflow-hidden border-b border-white/10 bg-[#0b1220] text-white"
      data-module-hero
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(135deg, #0b1220 0%, #152238 42%, #1a2744 68%, #0b1220 100%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse at 30% 40%, black 15%, transparent 70%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 top-0 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 bottom-0 h-28 w-28 rounded-full bg-amber-400/15 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5 md:px-8">
        {showEyebrow ? (
          <p className="inline-flex items-center rounded-full border border-amber-300/35 bg-amber-400/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100">
            {eyebrow}
          </p>
        ) : null}
        <div
          className={cn(
            'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
            showEyebrow && 'mt-2',
          )}
        >
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl font-bold tracking-tight text-white sm:text-2xl">
              {title}
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-200/85 line-clamp-2 sm:text-sm">
              {description}
            </p>
            {actions && <div className="mt-2.5 flex flex-wrap gap-2">{actions}</div>}
          </div>
          {badge ? <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{badge}</div> : null}
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
  actions,
}: {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  /** Right-side controls on the same row as the tabs (e.g. Export). */
  actions?: ReactNode;
}) {
  return (
    <nav
      className="sticky top-[calc(3rem+env(safe-area-inset-top))] z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur xl:top-16 dark:border-slate-800 dark:bg-slate-950/95"
      aria-label={ariaLabel ?? 'Module sections'}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 sm:px-6 md:px-8">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </nav>
  );
}

export function EnterpriseContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5 md:px-8', className)}>
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-card">
        {children}
      </div>
    </div>
  );
}
