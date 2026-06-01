'use client';

import { cn } from '@/lib/utils';

interface AppSplashProps {
  exiting?: boolean;
}

export function AppSplash({ exiting }: AppSplashProps) {
  return (
    <div
      className={cn(
        'app-splash fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 ease-out',
        exiting ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
      role="status"
      aria-label="Loading Church Hub"
    >
      <div className="app-splash-glow absolute inset-0" aria-hidden />
      <div className="relative flex flex-col items-center px-8 text-center">
        <div className="app-splash-logo mb-6 flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-white/15 shadow-brand ring-1 ring-white/25">
          <svg viewBox="0 0 32 32" className="h-14 w-14" fill="none" aria-hidden>
            <path
              d="M16 4L26 10V22L16 28L6 22V10L16 4Z"
              className="fill-white"
              opacity="0.95"
            />
            <path
              d="M16 10V22M11 13L16 10L21 13"
              stroke="hsl(43 74% 55%)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white">
          Church<span className="text-[hsl(43,74%,58%)]">_Hub</span>
        </h1>
        <p className="mt-2 max-w-[240px] text-sm text-white/75">
          Your church community, connected
        </p>
        <div className="app-splash-dots mt-10 flex gap-2" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-white/90" />
          <span className="h-2 w-2 rounded-full bg-white/60" />
          <span className="h-2 w-2 rounded-full bg-white/35" />
        </div>
      </div>
    </div>
  );
}
