'use client';

import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

export function Wisdom365Hero({
  description,
  badge,
  actions,
  streakLabel,
  compact,
}: {
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  streakLabel?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-5 w-5 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <h1 className="truncate font-heading text-base font-bold">
              Wisdom<span className="text-amber-500">365+</span>
            </h1>
            {streakLabel ? (
              <p className="truncate text-[11px] text-muted-foreground">{streakLabel}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge}
          {actions}
        </div>
      </header>
    );
  }

  const subtitle =
    description ?? 'Daily biblical wisdom with practical life application for every season.';

  return (
    <header className="relative overflow-hidden border-b border-amber-900/30 bg-slate-950 text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(120,53,15,0.55) 42%, rgba(15,23,42,0.98) 100%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Wisdom<span className="text-amber-400">365+</span>
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-slate-300">{subtitle}</p>
            {streakLabel ? (
              <p className="text-xs font-medium text-amber-200/80">{streakLabel}</p>
            ) : null}
            {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
          </div>
          {badge ? <div className="shrink-0 lg:pt-1">{badge}</div> : null}
        </div>
      </div>
    </header>
  );
}
