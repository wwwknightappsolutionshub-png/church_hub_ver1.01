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
  title: _title,
  description: _description,
  badge,
}: {
  title: string;
  description: string;
  badge?: React.ReactNode;
}) {
  // Match app-wide module chrome: hide dark title banner; keep badge if provided.
  if (!badge) return null;

  return (
    <div className="border-b border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl justify-end px-4 py-3 sm:px-6 md:px-8">{badge}</div>
    </div>
  );
}
