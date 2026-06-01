/**
 * Local time helpers for devotional reminders (quiet hours, due checks).
 * Uses Intl for timezone-aware hour/minute without extra dependencies.
 */

export function getLocalParts(date: Date, timezone: string): { hour: number; minute: number; ymd: string } {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = fmt.formatToParts(date);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
    const year = parts.find((p) => p.type === 'year')?.value ?? '';
    const month = parts.find((p) => p.type === 'month')?.value ?? '';
    const day = parts.find((p) => p.type === 'day')?.value ?? '';
    return { hour, minute, ymd: `${year}-${month}-${day}` };
  } catch {
    return {
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      ymd: date.toISOString().slice(0, 10),
    };
  }
}

/** Quiet window may span midnight (e.g. 22:00 – 07:00). */
export function isInQuietHours(
  hour: number,
  quietStartHour: number,
  quietEndHour: number,
): boolean {
  if (quietStartHour === quietEndHour) return false;
  if (quietStartHour < quietEndHour) {
    return hour >= quietStartHour && hour < quietEndHour;
  }
  return hour >= quietStartHour || hour < quietEndHour;
}

export function isReminderDueNow(input: {
  now: Date;
  timezone: string;
  frequency: 'HOURLY' | 'DAILY';
  hourLocal: number;
  minuteLocal: number;
  lastSentAt: Date | null;
  quietStartHour: number;
  quietEndHour: number;
}): boolean {
  const { hour, minute, ymd } = getLocalParts(input.now, input.timezone);
  if (isInQuietHours(hour, input.quietStartHour, input.quietEndHour)) {
    return false;
  }

  if (input.frequency === 'DAILY') {
    if (hour !== input.hourLocal || minute !== input.minuteLocal) {
      return false;
    }
    if (!input.lastSentAt) return true;
    const last = getLocalParts(input.lastSentAt, input.timezone);
    return last.ymd !== ymd;
  }

  // HOURLY: fire at minuteLocal each hour (e.g. :00)
  if (minute !== input.minuteLocal) return false;
  if (!input.lastSentAt) return true;
  const elapsed = input.now.getTime() - input.lastSentAt.getTime();
  return elapsed >= 55 * 60 * 1000;
}

export function snoozeUntilFromMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
