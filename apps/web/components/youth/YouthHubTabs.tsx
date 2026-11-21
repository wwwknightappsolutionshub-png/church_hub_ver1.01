'use client';

import { SectionTabNav } from '@/components/ui/section-tab-nav';
import type { YouthTabId } from '@/lib/youth';
import { YOUTH_TABS } from '@/lib/youth';

interface Props {
  tabs: Array<(typeof YOUTH_TABS)[number]>;
  active: YouthTabId;
  onChange: (id: YouthTabId) => void;
}

export function YouthHubTabs({ tabs, active, onChange }: Props) {
  return (
    <nav
      className="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-8"
      aria-label="Youth hub sections"
    >
      <SectionTabNav
        items={tabs.map((t) => ({ id: t.id, label: t.label }))}
        activeId={active}
        onChange={(id) => onChange(id as YouthTabId)}
        ariaLabel="Youth hub sections"
        size="sm"
        compactSelectBelow="sm"
        selectId="youth-hub-tabs-select"
      />
    </nav>
  );
}
