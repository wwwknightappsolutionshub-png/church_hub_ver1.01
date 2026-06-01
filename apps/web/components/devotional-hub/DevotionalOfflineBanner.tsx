'use client';

import { CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDevotionalOffline } from '@/lib/hooks/use-devotional-offline';

export function DevotionalOfflineBanner() {
  const { online, pendingCount, syncing, flushPending } = useDevotionalOffline();

  if (online && pendingCount === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-2 text-sm dark:border-amber-900/50 dark:bg-amber-950/40"
    >
      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
        <CloudOff className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          {!online
            ? 'You are offline — cached devotionals remain available.'
            : `${pendingCount} item${pendingCount === 1 ? '' : 's'} waiting to sync.`}
        </span>
      </div>
      {online && pendingCount > 0 && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          disabled={syncing}
          onClick={() => void flushPending()}
        >
          <RefreshCw className={cnIcon(syncing)} aria-hidden />
          Sync now
        </Button>
      )}
    </div>
  );
}

function cnIcon(syncing: boolean) {
  return `mr-1.5 h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`;
}
