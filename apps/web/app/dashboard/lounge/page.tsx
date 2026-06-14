'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { useLoungePresence } from '@/lib/hooks/use-lounge-presence';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { LoungeCanvas, type LoungeMember } from '@/components/lounge/LoungeCanvas';
import { LoungeAnnouncementsPanel } from '@/components/lounge/LoungeAnnouncementsPanel';
import { LoungeJobsPanel } from '@/components/lounge/LoungeJobsPanel';
import { Badge } from '@/components/ui/badge';

export default function LoungePage() {
  const router = useRouter();
  const {
    isPlatformAdmin,
    isChurchStaff,
    isLoading: accessLoading,
    memberId,
    churchId,
    churchName,
  } = useModuleAccess();

  useEffect(() => {
    if (!accessLoading && isPlatformAdmin) {
      router.replace('/dashboard/platform');
    }
  }, [accessLoading, isPlatformAdmin, router]);

  const { data: members, isLoading, refetch } = useApiQuery<LoungeMember[]>(
    ['lounge-members'],
    '/lounge/members',
    { enabled: !isPlatformAdmin && !!churchId },
  );

  const { onlineMemberIds } = useLoungePresence(churchId ?? undefined, memberId ?? undefined);

  const mergedMembers = useMemo(() => {
    if (!members) return [];
    const online = new Set(onlineMemberIds);
    return members.map((m) => ({
      ...m,
      isOnline: online.has(m.id) || m.isOnline,
    }));
  }, [members, onlineMemberIds]);

  const onlineCount = useMemo(
    () => mergedMembers.filter((m) => m.isOnline && !m.isSelf).length,
    [mergedMembers],
  );

  const loungeDescription = churchName
    ? `${churchName} member lounge — see who is online, send connection requests, and browse announcements and jobs.`
    : MODULE_DESCRIPTIONS.lounge;

  if (accessLoading || isPlatformAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardModuleShell
      title="Lounge"
      description={loungeDescription}
      badge={
        !isLoading ? (
          <Badge variant="outline" className="border-slate-500/40 bg-slate-800/80 text-slate-100">
            {onlineCount} active
          </Badge>
        ) : undefined
      }
      contentClassName="space-y-6 pb-8"
    >
      <section className="w-full shrink-0" aria-label="Lounge presence floor">
        {isLoading ? (
          <div className="flex min-h-[min(58dvh,520px)] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <LoungeCanvas members={mergedMembers} onPresenceRefresh={() => refetch()} />
        )}
      </section>

      <div className="mt-20 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LoungeAnnouncementsPanel canManage={isChurchStaff} />
        <LoungeJobsPanel canManage={isChurchStaff} />
      </div>
    </DashboardModuleShell>
  );
}
