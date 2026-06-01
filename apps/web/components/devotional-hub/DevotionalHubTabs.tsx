'use client';

import { DEVOTIONAL_HUB_TABS, type DevotionalHubTabId } from '@/lib/devotional-hub';
import { cn } from '@/lib/utils';

interface DevotionalHubTabsProps {
  tab: DevotionalHubTabId;
  onTabChange: (tab: DevotionalHubTabId) => void;
}

export function DevotionalHubTabs({ tab, onTabChange }: DevotionalHubTabsProps) {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <nav
        className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 md:px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Devotional sections"
      >
        {DEVOTIONAL_HUB_TABS.map((t) => {
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              id={`devotional-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`devotional-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onTabChange(t.id)}
              onKeyDown={(e) => {
                const idx = DEVOTIONAL_HUB_TABS.findIndex((x) => x.id === t.id);
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  const next = DEVOTIONAL_HUB_TABS[(idx + 1) % DEVOTIONAL_HUB_TABS.length];
                  onTabChange(next.id);
                }
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const next =
                    DEVOTIONAL_HUB_TABS[(idx - 1 + DEVOTIONAL_HUB_TABS.length) % DEVOTIONAL_HUB_TABS.length];
                  onTabChange(next.id);
                }
              }}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-semibold transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                selected
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
