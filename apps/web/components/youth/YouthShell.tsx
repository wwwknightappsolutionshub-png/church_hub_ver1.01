'use client';

import type { ReactNode } from 'react';
import { YouthFeatureNav } from './YouthFeatureNav';
import { YouthSafeModeBanner } from './YouthSafeModeBanner';

export function YouthShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#youth-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to youth content
      </a>
      <YouthSafeModeBanner />
      <YouthFeatureNav />
      <main
        id="youth-main"
        tabIndex={-1}
        className="min-h-[50dvh] bg-gradient-to-b from-violet-50/40 via-background to-cyan-50/30 dark:from-violet-950/20 dark:via-background dark:to-cyan-950/10"
      >
        {children}
      </main>
    </>
  );
}
