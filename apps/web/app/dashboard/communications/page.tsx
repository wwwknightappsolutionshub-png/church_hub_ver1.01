'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Disc3, Radio, Shield } from 'lucide-react';
import { type CommTabId, COMM_TABS } from '@/lib/communications';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { DashboardPageSkeleton } from '@/components/dashboard/DashboardPageSkeleton';
import { CommOverviewPanel } from '@/components/communications/CommOverviewPanel';
import { CommPushPanel } from '@/components/communications/CommPushPanel';
import { CommInboxPanel } from '@/components/communications/CommInboxPanel';
import { CommAnnouncementsPanel } from '@/components/communications/CommAnnouncementsPanel';
import { CommSermonsPanel } from '@/components/communications/CommSermonsPanel';
import { CommDevotionalsPanel } from '@/components/communications/CommDevotionalsPanel';
import { CommChannelsPanel } from '@/components/communications/CommChannelsPanel';
import { CommQueuePanel } from '@/components/communications/CommQueuePanel';
import { CommConversationsPanel } from '@/components/communications/CommConversationsPanel';
import { CommAutomationsPanel } from '@/components/communications/CommAutomationsPanel';
import { CommCelebrationTemplatesPanel } from '@/components/communications/CommCelebrationTemplatesPanel';
import { CommunicationsTabNav } from '@/components/communications/CommunicationsTabNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useModuleAccess } from '@/lib/hooks/use-module-access';

interface CommStats {
  announcements: number;
  unreadInApp: number;
  queuePending?: number;
  channels?: number;
}

function CommunicationsPageContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<CommTabId>('overview');
  const { canManageCommunications, isLoading: accessLoading } = useModuleAccess();
  const { data: stats } = useApiQuery<CommStats>(['comm-stats'], '/communications/stats');

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && COMM_TABS.some((x) => x.id === t)) {
      setTab(t as CommTabId);
    }
  }, [searchParams]);

  return (
    <DashboardModuleShell
      eyebrow="Church communications"
      title="Communication Hub"
      description={MODULE_DESCRIPTIONS.communications}
      contentClassName="space-y-6"
      badge={
        <Badge variant="success" className="gap-1 border-emerald-600/50 bg-emerald-900/40 text-emerald-100">
          <Radio className="h-3 w-3" />
          {stats?.announcements ?? 0} announcements
          {(stats?.unreadInApp ?? 0) > 0 && ` · ${stats?.unreadInApp} unread`}
        </Badge>
      }
      actions={
        <Button size="sm" className="shadow-brand" asChild>
          <Link href="/dashboard/communications/sermons">
            <Disc3 className="mr-1.5 h-4 w-4" />
            Spirify
          </Link>
        </Button>
      }
      tabNav={
        <CommunicationsTabNav
          active={tab}
          onChange={setTab}
          badges={{
            unreadInApp: stats?.unreadInApp,
            queuePending: stats?.queuePending,
          }}
          ariaLabel="Communication sections"
        />
      }
    >
      <div className="rounded-xl border border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-lg sm:p-6 dark:border-slate-700">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-white/10 p-2.5">
              <Shield className="h-5 w-5 text-emerald-300" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200/90">
                Corporate communications
              </p>
              <p className="mt-1 max-w-2xl text-sm text-slate-200">
                Queue governance, moderated channels, and branded celebration templates — organized by
                operational priority.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {[
              { label: 'Unread', value: stats?.unreadInApp ?? 0 },
              { label: 'Queue', value: stats?.queuePending ?? 0 },
              { label: 'Announce', value: stats?.announcements ?? 0 },
              { label: 'Channels', value: stats?.channels ?? 0 },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center"
              >
                <p className="text-[10px] uppercase tracking-wide text-slate-400">{kpi.label}</p>
                <p className="text-lg font-bold tabular-nums">{kpi.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!accessLoading && !canManageCommunications && (
        <div className="rounded-lg border border-amber-200/60 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          View-only mode: you can read announcements, messages, and media. Only church admin and pastor
          can send notifications, publish content, or moderate channels.
        </div>
      )}
      {tab === 'overview' && <CommOverviewPanel />}
      {tab === 'queue' && canManageCommunications && <CommQueuePanel />}
      {tab === 'queue' && !canManageCommunications && (
        <p className="text-sm text-muted-foreground">Queue management requires admin or pastor role.</p>
      )}
      {tab === 'conversations' && <CommConversationsPanel />}
      {tab === 'push' && (
        <div className="space-y-6">
          <CommPushPanel />
          {canManageCommunications && <CommAutomationsPanel />}
        </div>
      )}
      {tab === 'celebrations' && canManageCommunications && <CommCelebrationTemplatesPanel />}
      {tab === 'celebrations' && !canManageCommunications && (
        <p className="text-sm text-muted-foreground">Celebration templates require admin or pastor role.</p>
      )}
      {tab === 'inbox' && <CommInboxPanel />}
      {tab === 'announcements' && <CommAnnouncementsPanel />}
      {tab === 'sermons' && <CommSermonsPanel />}
      {tab === 'devotionals' && <CommDevotionalsPanel />}
      {tab === 'channels' && <CommChannelsPanel />}
    </DashboardModuleShell>
  );
}

export default function CommunicationsPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={4} />}>
      <CommunicationsPageContent />
    </Suspense>
  );
}
