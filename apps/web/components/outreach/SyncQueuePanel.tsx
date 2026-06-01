'use client';

import { Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SyncQueuePanelProps {
  online: boolean;
  pendingCount: number;
  syncing: boolean;
  onSync: () => void;
  serverPending?: number;
}

export function SyncQueuePanel({
  online,
  pendingCount,
  syncing,
  onSync,
  serverPending = 0,
}: SyncQueuePanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Offline sync queue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            {online ? (
              <Wifi className="h-4 w-4 text-emerald-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-amber-600" />
            )}
            {online ? 'Online' : 'Offline'}
          </span>
          <Badge variant={online ? 'success' : 'gold'}>{online ? 'Connected' : 'Offline'}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Local queue</span>
          <span className="font-bold">{pendingCount}</span>
        </div>
        {serverPending > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Server queue</span>
            <span className="font-bold">{serverPending}</span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={!online || pendingCount === 0 || syncing}
          onClick={onSync}
        >
          {syncing ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-4 w-4" />
          )}
          Sync now ({pendingCount})
        </Button>
        <p className="text-[10px] text-muted-foreground">
          Captures sync automatically when you reconnect. IndexedDB stores data offline-first.
        </p>
      </CardContent>
    </Card>
  );
}
