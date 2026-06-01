'use client';

import { useMemo, useState } from 'react';
import { YOUTH_TABS, type YouthTabId } from '@/lib/youth';
import { YouthOverviewPanel } from '@/components/youth/YouthOverviewPanel';
import { YouthGroupsPanel } from '@/components/youth/YouthGroupsPanel';
import { YouthEventsPanel } from '@/components/youth/YouthEventsPanel';
import { YouthChatPanel } from '@/components/youth/YouthChatPanel';
import { YouthResourcesPanel } from '@/components/youth/YouthResourcesPanel';
import { YouthHelpPanel } from '@/components/youth/YouthHelpPanel';
import { YouthGamificationPanel } from '@/components/youth/YouthGamificationPanel';
import { YouthParentsPanel } from '@/components/youth/YouthParentsPanel';
import { YouthAdminPanel } from '@/components/youth/YouthAdminPanel';
import { YouthHubHero } from '@/components/youth/YouthHubHero';
import { YouthHubTabs } from '@/components/youth/YouthHubTabs';
import { useYouthContext } from '@/components/youth/YouthProvider';

export default function YouthPage() {
  const ctx = useYouthContext();
  const [tab, setTab] = useState<YouthTabId>('overview');

  const tabs = useMemo(
    () =>
      YOUTH_TABS.filter((t) => {
        if (t.assignerOnly) return ctx?.permissions.assignYouthAdmins;
        if (t.leaderOnly) return ctx?.permissions.manageYouthHub;
        return true;
      }),
    [ctx?.permissions.assignYouthAdmins, ctx?.permissions.manageYouthHub],
  );

  return (
    <div className="min-h-0 pb-6">
      <YouthHubHero />
      <YouthHubTabs tabs={tabs} active={tab} onChange={setTab} />
      <div
        className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8"
        role="tabpanel"
        aria-labelledby={`youth-tab-${tab}`}
      >
        {tab === 'overview' && <YouthOverviewPanel />}
        {tab === 'groups' && <YouthGroupsPanel />}
        {tab === 'events' && <YouthEventsPanel />}
        {tab === 'chat' && <YouthChatPanel />}
        {tab === 'resources' && <YouthResourcesPanel />}
        {tab === 'help' && <YouthHelpPanel />}
        {tab === 'gamification' && <YouthGamificationPanel />}
        {tab === 'parents' && <YouthParentsPanel />}
        {tab === 'admin' && <YouthAdminPanel />}
      </div>
    </div>
  );
}
