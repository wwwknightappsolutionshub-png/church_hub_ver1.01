'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { DevotionalReminderSyncDto } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import {
  getLastSyncVersion,
  setLastSyncVersion,
  triggerDeviceAlarm,
} from '@/lib/devotional-reminder-alarm';
import { DEVOTIONAL_QUERY_KEYS } from '@/lib/devotional-hub';

const POLL_MS = 45_000;

export function useDevotionalReminderSync(enabled = true) {
  const queryClient = useQueryClient();
  const seenRef = useRef<Set<string>>(new Set());

  const poll = useCallback(async () => {
    try {
      const { data } = await api.get<DevotionalReminderSyncDto>('/devotional-hub/reminders/sync');
      const lastVersion = getLastSyncVersion();
      if (data.syncVersion !== lastVersion) {
        setLastSyncVersion(data.syncVersion);
        queryClient.setQueryData(['devotional-reminder-sync'], data);
        queryClient.invalidateQueries({ queryKey: DEVOTIONAL_QUERY_KEYS.plans() });
      } else {
        queryClient.setQueryData(['devotional-reminder-sync'], data);
      }

      for (const d of data.pendingDeliveries) {
        if (d.status === 'DONE' || d.status === 'DISMISSED') continue;
        if (seenRef.current.has(d.id)) continue;
        if (d.snoozedUntil && new Date(d.snoozedUntil) > new Date()) continue;

        seenRef.current.add(d.id);
        if (d.channel === 'ALARM' || d.channel === 'IN_APP' || d.channel === 'PUSH') {
          void triggerDeviceAlarm(d);
        }
      }
    } catch {
      /* offline */
    }
  }, [queryClient]);

  useEffect(() => {
    if (!enabled) return;
    void poll();
    const id = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(id);
  }, [enabled, poll]);

  return { refresh: poll };
}
