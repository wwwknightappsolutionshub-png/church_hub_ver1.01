'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  COMM_TAB_BADGE_KEYS,
  COMM_TAB_GROUPS,
  findCommTab,
  findCommTabGroup,
  type CommTabId,
} from '@/lib/communications';
import { cn } from '@/lib/utils';

export function CommunicationsTabNav({
  active,
  onChange,
  badges,
  ariaLabel = 'Communication sections',
}: {
  active: CommTabId;
  onChange: (id: CommTabId) => void;
  badges?: { unreadInApp?: number; queuePending?: number };
  ariaLabel?: string;
}) {
  const activeGroup = findCommTabGroup(active);
  const activeTab = findCommTab(active);
  const [focusedGroupId, setFocusedGroupId] = useState(activeGroup.id);

  useEffect(() => {
    setFocusedGroupId(activeGroup.id);
  }, [activeGroup.id]);

  const focusedGroup = useMemo(
    () => COMM_TAB_GROUPS.find((g) => g.id === focusedGroupId) ?? activeGroup,
    [focusedGroupId, activeGroup],
  );

  const badgeFor = (tabId: string) => {
    const key = COMM_TAB_BADGE_KEYS[tabId as CommTabId];
    if (!key || !badges) return 0;
    return badges[key] ?? 0;
  };

  return (
    <nav
      className="sticky top-0 z-20 border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-white/95 backdrop-blur-md dark:border-slate-800 dark:from-slate-950 dark:to-slate-950/95"
      aria-label={ariaLabel}
    >
      {/* Mobile & tablet: group switcher + tabs in group */}
      <div className="lg:hidden">
        <div
          className="flex gap-1 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Communication categories"
        >
          {COMM_TAB_GROUPS.map((group) => {
            const isGroupActive = focusedGroupId === group.id;
            return (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={isGroupActive}
                onClick={() => {
                  setFocusedGroupId(group.id);
                  const hasActive = group.tabs.some((t) => t.id === active);
                  if (!hasActive) onChange(group.tabs[0].id as CommTabId);
                }}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  isGroupActive
                    ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
                )}
              >
                {group.label}
              </button>
            );
          })}
        </div>

        <div
          className="flex gap-1.5 overflow-x-auto border-t border-slate-200/60 px-3 py-2 dark:border-slate-800"
          role="tablist"
        >
          {focusedGroup.tabs.map((tab) => {
            const isActive = active === tab.id;
            const Icon = tab.icon;
            const count = badgeFor(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onChange(tab.id as CommTabId)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-left transition',
                  isActive
                    ? 'border-emerald-500/40 bg-emerald-50 text-emerald-950 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-100'
                    : 'border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-xs font-semibold">{tab.shortLabel}</span>
                {count > 0 && (
                  <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab.description && (
          <p className="border-t border-slate-200/60 px-4 py-1.5 text-[11px] text-muted-foreground dark:border-slate-800">
            {activeTab.description}
          </p>
        )}
      </div>

      {/* Desktop: grouped inline nav */}
      <div className="mx-auto hidden max-w-7xl lg:block">
        <div className="flex flex-wrap items-stretch gap-x-4 gap-y-2 px-6 py-3 xl:px-8">
          {COMM_TAB_GROUPS.map((group, groupIndex) => (
            <div key={group.id} className="flex min-w-0 items-center gap-2">
              {groupIndex > 0 && (
                <div className="mr-2 hidden h-9 w-px shrink-0 bg-slate-200 dark:bg-slate-700 xl:block" aria-hidden />
              )}
              <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 xl:inline">
                {group.label}
              </span>
              <div className="flex flex-wrap gap-1" role="tablist" aria-label={group.label}>
                {group.tabs.map((tab) => {
                  const isActive = active === tab.id;
                  const Icon = tab.icon;
                  const count = badgeFor(tab.id);
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-current={isActive ? 'page' : undefined}
                      title={tab.description}
                      onClick={() => onChange(tab.id as CommTabId)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                        isActive
                          ? 'bg-slate-900 text-white shadow-md dark:bg-emerald-600 dark:text-white'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="whitespace-nowrap">{tab.label}</span>
                      {count > 0 && (
                        <span
                          className={cn(
                            'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                            isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
                          )}
                        >
                          {count > 99 ? '99+' : count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200/60 px-6 py-2 dark:border-slate-800 xl:px-8">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{activeTab.label}</span>
            {' — '}
            {activeTab.description}
          </p>
        </div>
      </div>
    </nav>
  );
}
