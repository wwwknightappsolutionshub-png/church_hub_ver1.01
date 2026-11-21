'use client';

import { DEVOTIONAL_HUB_TABS, type DevotionalHubTabId } from '@/lib/devotional-hub';
import { SectionTabNav } from '@/components/ui/section-tab-nav';

interface DevotionalHubTabsProps {
  tab: DevotionalHubTabId;
  onTabChange: (tab: DevotionalHubTabId) => void;
}

export function DevotionalHubTabs({ tab, onTabChange }: DevotionalHubTabsProps) {
  const activeMeta = DEVOTIONAL_HUB_TABS.find((t) => t.id === tab) ?? DEVOTIONAL_HUB_TABS[0];

  return (
    <div
      className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
      data-testid="devotional-hub-tabs"
    >
      <div className="w-full px-4 py-3 sm:px-6 md:px-8">
        <SectionTabNav
          items={DEVOTIONAL_HUB_TABS.map((t) => ({
            id: t.id,
            label: t.label,
            testId: `devotional-tab-${t.id}`,
          }))}
          activeId={tab}
          onChange={(id) => onTabChange(id as DevotionalHubTabId)}
          ariaLabel="Devotional sections"
          size="sm"
          compactSelectBelow="lg"
          selectId="devotional-hub-tab-select"
          selectTestId="devotional-hub-tab-select"
        />
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
