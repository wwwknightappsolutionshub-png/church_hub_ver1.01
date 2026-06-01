'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  getDevotionalPendingItems,
  markDevotionalPendingFailed,
  markDevotionalPendingSynced,
  type DevotionalOfflinePending,
} from '@/lib/devotional-offline';

export function useDevotionalOffline() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPending = useCallback(async () => {
    const items = await getDevotionalPendingItems();
    setPendingCount(items.length);
    return items;
  }, []);

  const flushPending = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    setSyncing(true);
    try {
      const items = await getDevotionalPendingItems();
      for (const item of items) {
        await syncOne(item);
      }
      await refreshPending();
    } finally {
      setSyncing(false);
    }
  }, [refreshPending]);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      void flushPending();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    void refreshPending();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [flushPending, refreshPending]);

  return { online, pendingCount, syncing, flushPending, refreshPending };
}

async function syncOne(item: DevotionalOfflinePending) {
  try {
    if (item.type === 'PLAN_COMPLETE') {
      const planId = item.payload.planId as string;
      await api.post(`/devotional-hub/plans/${planId}/complete`, {
        dayNumber: item.payload.dayNumber,
        dayId: item.payload.dayId,
      });
    }
    await markDevotionalPendingSynced(item.clientId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync failed';
    await markDevotionalPendingFailed(item.clientId, msg);
  }
}
