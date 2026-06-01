'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Disc3, Radio } from 'lucide-react';
import { type CommTabId } from '@/lib/communications';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
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
import { CommunicationsTabNav } from '@/components/communications/CommunicationsTabNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useModuleAccess } from '@/lib/hooks/use-module-access';

interface CommStats {
  announcements: number;
  unreadInApp: number;
  queuePending?: number;
}

export default function CommunicationsPage() {
  const [tab, setTab] = useState<CommTabId>('overview');
  const { canManageCommunications, isLoading: accessLoading } = useModuleAccess();
  const { data: stats } = useApiQuery<CommStats>(['comm-stats'], '/communications/stats');

  return (
    <DashboardModuleShell
      title="Communication Hub"
      description="Enterprise communications—notification queue, conversations, department broadcasts, service automations, announcements, and media."
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
      {tab === 'inbox' && <CommInboxPanel />}
      {tab === 'announcements' && <CommAnnouncementsPanel />}
      {tab === 'sermons' && <CommSermonsPanel />}
      {tab === 'devotionals' && <CommDevotionalsPanel />}
      {tab === 'channels' && <CommChannelsPanel />}
    </DashboardModuleShell>
  );
}
