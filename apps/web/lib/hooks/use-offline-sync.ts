'use client';

import { useCallback, useEffect, useState } from 'react';
import { getPendingSyncItems, syncPendingOutreach } from '@/lib/offline-sync';

export function useOfflineSync(onSynced?: () => void) {
  const [pendingCount, setPendingCount] = useState(0);
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    const items = await getPendingSyncItems();
    setPendingCount(items.length);
  }, []);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await syncPendingOutreach();
      await refresh();
      if (result.synced > 0) onSynced?.();
      return result;
    } finally {
      setSyncing(false);
    }
  }, [refresh, onSynced]);

  useEffect(() => {
    refresh();
    const trySync = () => {
      if (!navigator.onLine) return;
      syncPendingOutreach()
        .then(() => refresh())
        .catch(() => refresh());
    };
    const onOnline = () => {
      setOnline(true);
      trySync();
    };
    const onOffline = () => setOnline(false);
    const onVisible = () => {
      if (document.visibilityState === 'visible') trySync();
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return { pendingCount, online, syncing, refresh, syncNow };
}
