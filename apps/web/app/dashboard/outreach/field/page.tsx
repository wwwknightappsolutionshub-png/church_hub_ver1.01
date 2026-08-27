'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, WifiOff } from 'lucide-react';
import { useOfflineSync } from '@/lib/hooks/use-offline-sync';
import { OutreachCaptureForm } from '@/components/outreach/OutreachCaptureForm';
import { SyncQueuePanel } from '@/components/outreach/SyncQueuePanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/** Mobile-first outdoor field capture (Phase 6). */
export default function OutreachFieldPage() {
  const queryClient = useQueryClient();
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['outreach'] });
    queryClient.invalidateQueries({ queryKey: ['outreach-stats'] });
    queryClient.invalidateQueries({ queryKey: ['follow-up'] });
    queryClient.invalidateQueries({ queryKey: ['follow-up-stats'] });
  }, [queryClient]);

  const { pendingCount, online, syncing, syncNow } = useOfflineSync(refresh);

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/outreach">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Field Outreach
          </Link>
        </Button>
        <span className="font-heading text-sm font-semibold">Outreach Capture</span>
        {!online ? (
          <Badge variant="outline" className="gap-1 text-amber-700">
            <WifiOff className="h-3 w-3" />
            Offline
          </Badge>
        ) : (
          <Badge variant="success">Online</Badge>
        )}
      </header>

      <div className="space-y-4 p-4 pb-24">
        <p className="text-sm text-muted-foreground">
          Optimized for outdoor evangelism: large touch targets, GPS, voice notes, bus pickup flag,
          and offline queue.
        </p>
        <OutreachCaptureForm online={online} onSuccess={refresh} />
        <SyncQueuePanel
          online={online}
          pendingCount={pendingCount}
          syncing={syncing}
          onSync={syncNow}
        />
      </div>
    </div>
  );
}
