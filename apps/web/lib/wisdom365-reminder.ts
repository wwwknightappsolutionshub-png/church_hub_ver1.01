import { ensureNotificationPermission } from '@/lib/devotional-reminder-alarm';

export interface Wisdom365ReminderSettings {
  hour: number;
  minute: number;
  timezone: string;
  alarmEnabled: boolean;
}

export interface Wisdom365VariantReminder extends Wisdom365ReminderSettings {
  variantSlug: string;
  variantName: string;
}

const FIRED_PREFIX = 'wisdom365-fired';

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getLastReminderFired(variantSlug: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`${FIRED_PREFIX}-${variantSlug}-${todayDateKey()}`);
}

export function markReminderFired(variantSlug: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${FIRED_PREFIX}-${variantSlug}-${todayDateKey()}`, '1');
}

export async function triggerWisdom365Alarm(
  variantSlug: string,
  title: string,
  body: string,
  alarmEnabled: boolean,
) {
  if (typeof window === 'undefined') return;

  if ('Notification' in window && Notification.permission === 'granted') {
    const n = new Notification(title, {
      body,
      tag: `wisdom365-${variantSlug}`,
      requireInteraction: true,
      icon: '/icons/pwa-icon.svg',
    });
    n.onclick = () => {
      window.focus();
      window.location.href = '/dashboard/wisdom365';
      n.close();
    };
  }

  if (alarmEnabled) {
    try {
      const ctx = new AudioContext();
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.value = 0.1;
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playTone(523.25, 0, 0.2);
      playTone(659.25, 0.25, 0.25);
      playTone(783.99, 0.55, 0.35);
    } catch {
      /* audio blocked until user gesture */
    }
  }
}

export function shouldFireVariantReminder(
  pref: Wisdom365VariantReminder,
  now = new Date(),
): boolean {
  if (!pref.alarmEnabled) return false;
  if (getLastReminderFired(pref.variantSlug)) return false;
  return now.getHours() === pref.hour && now.getMinutes() === pref.minute;
}

export function formatReminderTime(settings: Pick<Wisdom365ReminderSettings, 'hour' | 'minute'>): string {
  const h = settings.hour % 12 || 12;
  const m = settings.minute.toString().padStart(2, '0');
  const ampm = settings.hour >= 12 ? 'PM' : 'AM';
  return `${h}:${m} ${ampm}`;
}

export async function ensureWisdom365NotificationPermission(): Promise<boolean> {
  return ensureNotificationPermission();
}
