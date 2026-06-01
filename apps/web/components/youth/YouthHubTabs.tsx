'use client';

import { cn } from '@/lib/utils';
import type { YouthTabId } from '@/lib/youth';
import { YOUTH_TABS } from '@/lib/youth';

const TAB_COLORS: Partial<Record<YouthTabId, string>> = {
  overview: 'from-violet-500 to-fuchsia-500',
  groups: 'from-indigo-500 to-blue-500',
  events: 'from-amber-500 to-orange-500',
  chat: 'from-sky-500 to-cyan-500',
  resources: 'from-emerald-500 to-teal-500',
  help: 'from-rose-500 to-pink-500',
  gamification: 'from-yellow-500 to-amber-500',
  parents: 'from-purple-500 to-violet-500',
  admin: 'from-slate-600 to-slate-800',
};

interface Props {
  tabs: Array<(typeof YOUTH_TABS)[number]>;
  active: YouthTabId;
  onChange: (id: YouthTabId) => void;
}

export function YouthHubTabs({ tabs, active, onChange }: Props) {
  return (
    <nav
      className="sticky top-0 z-20 flex gap-2 overflow-x-auto border-b bg-background/95 px-4 py-3 backdrop-blur [-ms-overflow-style:none] [scrollbar-width:none] md:px-8 [&::-webkit-scrollbar]:hidden"
      aria-label="Youth hub sections"
      role="tablist"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          id={`youth-tab-${t.id}`}
          onClick={() => onChange(t.id)}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition',
            active === t.id
              ? `bg-gradient-to-r ${TAB_COLORS[t.id] ?? 'from-primary to-primary'} text-white shadow-md`
              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
