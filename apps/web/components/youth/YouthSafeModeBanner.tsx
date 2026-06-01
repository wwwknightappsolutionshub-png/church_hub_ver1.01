'use client';

import { Shield } from 'lucide-react';
import { useYouthContext } from './YouthProvider';

export function YouthSafeModeBanner() {
  const ctx = useYouthContext();
  if (!ctx?.safeMode.enabled) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-emerald-200/60 bg-emerald-50/50 px-6 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200 md:px-8"
    >
      <p className="flex flex-wrap items-center gap-2">
        <Shield className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          <strong className="font-medium">Youth-safe mode</strong>
          {' — '}
          {ctx.safeMode.description}
        </span>
        {ctx.gamification && (
          <span className="text-emerald-800/80 dark:text-emerald-300/80">
            · {ctx.gamification.points} pts · Lv.{ctx.gamification.level}{' '}
            {ctx.gamification.tierTitle}
          </span>
        )}
      </p>
    </div>
  );
}
