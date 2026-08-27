'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Megaphone, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useOfflineSync } from '@/lib/hooks/use-offline-sync';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { OutreachCaptureForm } from '@/components/outreach/OutreachCaptureForm';
import { EvangelistQrPanel } from '@/components/outreach/EvangelistQrPanel';
import { SyncQueuePanel } from '@/components/outreach/SyncQueuePanel';
import { SyncConflictsPanel } from '@/components/outreach/SyncConflictsPanel';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OutreachStats {
  total: number;
  today: number;
  welcomeSent: number;
  pendingSync: number;
  qrScans: number;
}

export default function OutreachPage() {
  const queryClient = useQueryClient();

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['outreach'] });
    queryClient.invalidateQueries({ queryKey: ['outreach-stats'] });
    queryClient.invalidateQueries({ queryKey: ['follow-up'] });
    queryClient.invalidateQueries({ queryKey: ['follow-up-stats'] });
  }, [queryClient]);

  const { pendingCount, online, syncing, syncNow } = useOfflineSync(refreshData);

  const { data: stats } = useApiQuery<OutreachStats>(['outreach-stats'], '/outreach/stats');

  const handleSync = async () => {
    try {
      const result = await syncNow();
      if (result.synced > 0) {
        toast.success(`Synced ${result.synced} capture(s)`);
      } else if (!result.skipped) {
        toast.info('Sync finished — some items may have failed');
      }
      refreshData();
    } catch {
      toast.error('Sync failed — check API connection');
    }
  };

  return (
    <DashboardModuleShell
      eyebrow="Evangelism"
      title="Field Outreach"
      description={MODULE_DESCRIPTIONS.outreach}
      badge={<Badge variant="success">Offline-ready</Badge>}
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/outreach/field">Field mode</Link>
        </Button>
      }
    >
      <div className="space-y-6">
        {stats && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-violet-200/60 bg-violet-50/40 dark:bg-violet-950/20">
              <CardContent className="flex items-center gap-3 p-4">
                <Megaphone className="h-8 w-8 text-violet-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total contacts</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-sky-200/60 bg-sky-50/40 dark:bg-sky-950/20">
              <CardContent className="flex items-center gap-3 p-4">
                <Users className="h-8 w-8 text-sky-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.today}</p>
                  <p className="text-xs text-muted-foreground">Captured today</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-emerald-200/60 bg-emerald-50/40 dark:bg-emerald-950/20">
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{stats.welcomeSent}</p>
                <p className="text-xs text-muted-foreground">Welcome messages sent</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200/60 bg-amber-50/40 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{stats.qrScans}</p>
                <p className="text-xs text-muted-foreground">QR / NFC scans</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Outreach Capture Form</CardTitle>
                <CardDescription>
                  Offline-first capture. Creates a New Contact in Outreach, auto-assigns when possible,
                  and alerts the outreach team (in-app + email). View and progress leads on{' '}
                  <Link href="/dashboard/follow-up" className="font-medium text-primary underline-offset-2 hover:underline">
                    Outreach
                  </Link>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OutreachCaptureForm online={online} onSuccess={refreshData} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <EvangelistQrPanel />
            <SyncQueuePanel
              online={online}
              pendingCount={pendingCount}
              syncing={syncing}
              onSync={handleSync}
              serverPending={stats?.pendingSync}
            />
            <SyncConflictsPanel />
          </div>
        </div>
      </div>
    </DashboardModuleShell>
  );
}
