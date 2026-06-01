'use client';

import { BookOpen, Compass, PenLine, Sparkles, TrendingUp } from 'lucide-react';
import type { Wisdom365TabId } from '@/lib/wisdom365';
import { cn } from '@/lib/utils';

const TAB_ICONS: Record<Wisdom365TabId, typeof Sparkles> = {
  today: Sparkles,
  journey: Compass,
  apply: PenLine,
  library: BookOpen,
  insights: TrendingUp,
};

export function Wisdom365MobileTabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: Wisdom365TabId; label: string; shortLabel?: string }>;
  active: Wisdom365TabId;
  onChange: (id: Wisdom365TabId) => void;
}) {
  return (
    <nav
      className={cn(
        'fixed inset-x-0 z-40 border-t border-border/80 bg-card/95 backdrop-blur-xl',
        'bottom-[calc(4.25rem+env(safe-area-inset-bottom))] xl:bottom-0',
      )}
      aria-label="Wisdom365+ sections"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {tabs.map((t) => {
          const Icon = TAB_ICONS[t.id];
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 transition',
                isActive ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'scale-110')} strokeWidth={isActive ? 2.5 : 2} />
              <span className="max-w-full truncate text-[10px] font-medium">
                {t.shortLabel ?? t.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
