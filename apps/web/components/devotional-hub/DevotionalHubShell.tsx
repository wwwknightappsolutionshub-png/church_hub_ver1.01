'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { DEVOTIONAL_HUB_ROUTES } from '@/lib/devotional-hub';
import { cn } from '@/lib/utils';

export function DevotionalHubShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHub = pathname === DEVOTIONAL_HUB_ROUTES.hub;

  return (
    <div className="devotional-hub-root min-h-full bg-gradient-to-b from-slate-50 via-background to-emerald-50/20 dark:from-slate-950 dark:via-background dark:to-emerald-950/10">
      <a
        href="#devotional-hub-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to devotional content
      </a>
      {!isHub && (
        <nav
          className="border-b border-slate-200/80 bg-white/90 px-4 py-2 backdrop-blur md:px-8 dark:border-slate-800 dark:bg-slate-950/90"
          aria-label="Devotional Hub"
        >
          <Link
            href={DEVOTIONAL_HUB_ROUTES.hub}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
            )}
          >
            <BookOpen className="h-4 w-4 text-emerald-700 dark:text-emerald-500" />
            Devotional Hub
          </Link>
        </nav>
      )}
      <main id="devotional-hub-main" className="devotional-hub-main min-h-0">
        {children}
      </main>
    </div>
  );
}

export function DevotionalHubHero({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge?: React.ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-slate-200/80 bg-slate-900 text-white dark:border-slate-800">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(120deg, rgba(6,78,59,0.85) 0%, rgba(15,23,42,0.95) 55%, rgba(15,23,42,1) 100%)',
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
          Devotional Hub
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">{description}</p>
          </div>
          {badge}
        </div>
      </div>
    </header>
  );
}
