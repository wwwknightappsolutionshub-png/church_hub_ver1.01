'use client';

import { BrandIcon } from '@/components/brand/BrandMark';
import { cn } from '@/lib/utils';

interface AppSplashProps {
  exiting?: boolean;
}

const STATUS_LINES = [
  'Preparing your workspace',
  'Loading ministry modules',
  'Syncing your church data',
];

/** Full-screen branded boot splash shown while the app hydrates. */
export function AppSplash({ exiting }: AppSplashProps) {
  return (
    <div
      className={cn(
        'app-splash fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-[opacity,transform] duration-500 ease-out',
        exiting ? 'pointer-events-none scale-[1.02] opacity-0' : 'opacity-100',
      )}
      role="status"
      aria-live="polite"
      aria-label="Loading Church Hub"
    >
      <div className="app-splash-grid absolute inset-0 opacity-40" aria-hidden />
      <div className="app-splash-glow absolute inset-0" aria-hidden />
      <div className="app-splash-orb app-splash-orb-a absolute -left-24 top-24 h-64 w-64 rounded-full" aria-hidden />
      <div className="app-splash-orb app-splash-orb-b absolute -right-16 bottom-32 h-72 w-72 rounded-full" aria-hidden />

      <div className="relative flex flex-col items-center px-8 text-center">
        <div className="app-splash-logo-wrap relative mb-8">
          <div className="app-splash-ring absolute inset-[-10px] rounded-[1.85rem]" aria-hidden />
          <div className="app-splash-logo relative flex h-[5.5rem] w-[5.5rem] items-center justify-center overflow-hidden rounded-[1.65rem] shadow-brand ring-1 ring-white/25">
            <BrandIcon variant="light" className="h-full w-full" />
          </div>
        </div>

        <h1 className="app-splash-title font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Church<span className="text-[hsl(43,74%,58%)]">_Hub</span>
        </h1>
        <p className="app-splash-tagline mt-2 max-w-[280px] text-sm text-white/70 sm:text-base">
          Enterprise ministry platform
        </p>

        <div className="app-splash-progress mt-10 w-48 overflow-hidden rounded-full bg-white/10" aria-hidden>
          <div className="app-splash-progress-bar h-1 rounded-full bg-gradient-to-r from-indigo-300 via-[hsl(43,74%,58%)] to-indigo-200" />
        </div>

        <div className="app-splash-status relative mt-4 h-5 w-56 overflow-hidden text-xs font-medium tracking-wide text-white/55">
          {STATUS_LINES.map((line, i) => (
            <span
              key={line}
              className="app-splash-status-line absolute inset-x-0 top-0 text-center"
              style={{ animationDelay: `${i * 1.5}s` }}
            >
              {line}
            </span>
          ))}
        </div>
      </div>

      <p className="absolute bottom-8 text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
        Secure · Ministry-first
      </p>
    </div>
  );
}
