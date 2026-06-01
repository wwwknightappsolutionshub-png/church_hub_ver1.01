import type { DevotionalReminderDeliveryDto } from '@church-hub/shared-types';

const SYNC_STORAGE_KEY = 'devotional-reminder-sync-version';
const ALARM_AUDIO_KEY = 'devotional-alarm-enabled';

export function getLastSyncVersion(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(SYNC_STORAGE_KEY) ?? '0', 10) || 0;
}

export function setLastSyncVersion(version: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SYNC_STORAGE_KEY, String(version));
}

export function isAlarmEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(ALARM_AUDIO_KEY) !== 'false';
}

export function setAlarmEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ALARM_AUDIO_KEY, enabled ? 'true' : 'false');
}

/** Browser notification + optional short tone for device alarm channel. */
export async function triggerDeviceAlarm(delivery: DevotionalReminderDeliveryDto) {
  if (typeof window === 'undefined') return;

  if ('Notification' in window && Notification.permission === 'granted') {
    const n = new Notification(delivery.title, {
      body: delivery.body,
      tag: delivery.id,
      requireInteraction: delivery.channel === 'ALARM',
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  }

  if (isAlarmEnabled() && delivery.channel === 'ALARM') {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      gain.gain.value = 0.08;
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      /* audio blocked */
    }
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}
