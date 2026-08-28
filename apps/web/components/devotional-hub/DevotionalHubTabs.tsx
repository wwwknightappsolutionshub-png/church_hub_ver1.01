'use client';

import { useEffect, useRef } from 'react';
import { DEVOTIONAL_HUB_TABS, type DevotionalHubTabId } from '@/lib/devotional-hub';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface DevotionalHubTabsProps {
  tab: DevotionalHubTabId;
  onTabChange: (tab: DevotionalHubTabId) => void;
}

export function DevotionalHubTabs({ tab, onTabChange }: DevotionalHubTabsProps) {
  const navRef = useRef<HTMLElement>(null);
  const activeMeta = DEVOTIONAL_HUB_TABS.find((t) => t.id === tab) ?? DEVOTIONAL_HUB_TABS[0];

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>(`#devotional-tab-${tab}`);
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [tab]);

  return (
    <div
      className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
      data-testid="devotional-hub-tabs"
    >
      <div className="w-full px-4 py-3 sm:px-6 md:px-8">
        <div className="lg:hidden">
          <Label htmlFor="devotional-hub-tab-select" className="sr-only">
            Devotional section
          </Label>
          <select
            id="devotional-hub-tab-select"
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium shadow-sm"
            value={tab}
            onChange={(e) => onTabChange(e.target.value as DevotionalHubTabId)}
            aria-controls={`devotional-panel-${tab}`}
            data-testid="devotional-hub-tab-select"
          >
            {DEVOTIONAL_HUB_TABS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="relative hidden lg:block">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-6 bg-gradient-to-r from-white/95 to-transparent dark:from-slate-950/95"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-6 bg-gradient-to-r from-transparent to-white/95 dark:to-slate-950/95"
            aria-hidden
          />
          <nav
            ref={navRef}
            className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                  aria-label={t.label}
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
                    'min-h-[2.5rem] shrink-0 snap-start rounded-lg px-3 py-2 text-sm font-semibold transition',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    selected
                      ? 'bg-slate-900 text-white shadow-sm dark:bg-emerald-900 dark:text-emerald-50'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div
        className="border-t border-slate-200/70 bg-emerald-50/50 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground dark:border-slate-800 dark:bg-emerald-950/20 sm:px-6 md:px-8"
        data-testid="devotional-hub-tab-description"
      >
        <span className="font-semibold text-foreground">{activeMeta.label} — </span>
        {activeMeta.description}
      </div>
    </div>
  );
}
