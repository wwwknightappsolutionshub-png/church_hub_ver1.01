'use client';

import { useCallback, useEffect, useRef } from 'react';
import { fetchReminderPrefs, fetchTodayContent } from '@/lib/wisdom365-api';
import { userDisplayName } from '@/lib/user-display';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import {
  markReminderFired,
  shouldFireVariantReminder,
  triggerWisdom365Alarm,
  type Wisdom365VariantReminder,
} from '@/lib/wisdom365-reminder';

const CHECK_MS = 30_000;
export const WISDOM365_REMINDERS_SYNC_EVENT = 'wisdom365-reminders-sync';

export function useWisdom365Reminder(enabled = true) {
  const { user, member } = useModuleAccess();
  const firstName = userDisplayName(user, member, 'friend').split(' ')[0];
  const prefsRef = useRef<Wisdom365VariantReminder[]>([]);

  const syncPrefs = useCallback(async () => {
    if (!enabled) return;
    try {
      const prefs = await fetchReminderPrefs();
      prefsRef.current = prefs.map((p) => ({
        variantSlug: p.variantSlug,
        variantName: p.variantName,
        hour: p.hour,
        minute: p.minute,
        alarmEnabled: p.alarmEnabled,
        timezone: p.timezone,
      }));
    } catch {
      prefsRef.current = [];
    }
  }, [enabled]);

  const checkReminder = useCallback(async () => {
    if (!enabled || prefsRef.current.length === 0) return;

    for (const pref of prefsRef.current) {
      if (!shouldFireVariantReminder(pref)) continue;

      try {
        const day = await fetchTodayContent(pref.variantSlug, firstName);
        markReminderFired(pref.variantSlug);
        void triggerWisdom365Alarm(
          pref.variantSlug,
          `Wisdom365+ — ${pref.variantName}`,
          day.focusLine,
          pref.alarmEnabled,
        );
      } catch {
        /* skip */
      }
    }
  }, [enabled, firstName]);

  useEffect(() => {
    if (!enabled) return;
    void syncPrefs();
    const syncId = setInterval(() => void syncPrefs(), 5 * 60_000);
    const onSync = () => void syncPrefs();
    window.addEventListener(WISDOM365_REMINDERS_SYNC_EVENT, onSync);
    return () => {
      clearInterval(syncId);
      window.removeEventListener(WISDOM365_REMINDERS_SYNC_EVENT, onSync);
    };
  }, [enabled, syncPrefs]);

  useEffect(() => {
    if (!enabled) return;
    void checkReminder();
    const id = setInterval(() => void checkReminder(), CHECK_MS);
    return () => clearInterval(id);
  }, [enabled, checkReminder]);

  return { syncPrefs, checkReminder };
}
