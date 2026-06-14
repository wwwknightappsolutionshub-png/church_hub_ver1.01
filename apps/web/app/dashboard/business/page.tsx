'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Briefcase } from 'lucide-react';
import { KONNECT_TABS, type KonnectTabId } from '@/lib/konnect';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { KonnectOverviewPanel } from '@/components/business/KonnectOverviewPanel';
import { KonnectDirectoryPanel } from '@/components/business/KonnectDirectoryPanel';
import { KonnectVerificationPanel } from '@/components/business/KonnectVerificationPanel';
import { KonnectMarketplacePanel } from '@/components/business/KonnectMarketplacePanel';
import { KonnectJobsPanel } from '@/components/business/KonnectJobsPanel';
import { KonnectEventsPanel } from '@/components/business/KonnectEventsPanel';
import { KonnectMentorshipPanel } from '@/components/business/KonnectMentorshipPanel';
import { IdeaHub } from '@/components/business/IdeaHub';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import {
  EnterpriseContent,
  EnterpriseHero,
  EnterpriseShell,
  EnterpriseTabNav,
} from '@/components/layout/EnterpriseModuleShell';
import { Badge } from '@/components/ui/badge';

interface KonnectStats {
  verified: number;
  pending: number;
}

const TAB_IDS = new Set<KonnectTabId>(KONNECT_TABS.map((t) => t.id));

export default function BusinessPage() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const initialTab =
    tabFromUrl && TAB_IDS.has(tabFromUrl as KonnectTabId) ? (tabFromUrl as KonnectTabId) : 'overview';
  const [tab, setTab] = useState<KonnectTabId>(initialTab);
  const { data: stats } = useApiQuery<KonnectStats>(['konnect-stats'], '/business/stats');
  const { userRoles } = useModuleAccess();
  const canSeeVerification = userRoles.includes('ADMIN') || userRoles.includes('PASTOR');
  const visibleTabs = KONNECT_TABS.filter((t) => t.id !== 'verification' || canSeeVerification);

  useEffect(() => {
    if (tabFromUrl && TAB_IDS.has(tabFromUrl as KonnectTabId)) {
      const next = tabFromUrl as KonnectTabId;
      if (next === 'verification' && !canSeeVerification) setTab('overview');
      else setTab(next);
    }
  }, [tabFromUrl, canSeeVerification]);

  useEffect(() => {
    if (tab === 'verification' && !canSeeVerification) setTab('overview');
  }, [tab, canSeeVerification]);

  return (
    <EnterpriseShell>
      <EnterpriseHero
        title="Kingdom Konnect"
        description={MODULE_DESCRIPTIONS.business}
        badge={
          <Badge className="gap-1 border-slate-600 bg-slate-800 text-slate-100">
            <Briefcase className="h-3 w-3" />
            {stats?.verified ?? 0} verified · {stats?.pending ?? 0} pending review
          </Badge>
        }
      />
      <EnterpriseTabNav
        ariaLabel="Kingdom Konnect sections"
        tabs={visibleTabs.map((t) => ({ id: t.id, label: t.label }))}
        active={tab}
        onChange={(id) => setTab(id as KonnectTabId)}
      />
      <EnterpriseContent>
          {tab === 'overview' && <KonnectOverviewPanel />}
          {tab === 'directory' && <KonnectDirectoryPanel />}
          {tab === 'verification' && <KonnectVerificationPanel />}
          {tab === 'marketplace' && <KonnectMarketplacePanel />}
          {tab === 'jobs' && <KonnectJobsPanel />}
          {tab === 'events' && <KonnectEventsPanel />}
          {tab === 'mentorship' && <KonnectMentorshipPanel />}
          {tab === 'ideas' && <IdeaHub />}
      </EnterpriseContent>
    </EnterpriseShell>
  );
}
