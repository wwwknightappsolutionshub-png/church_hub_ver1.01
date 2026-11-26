export const OPERATIONAL_EMAIL_KINDS = [
  'departmentDigest',
  'cellDigest',
  'sundayAttendance',
  'membershipWeekly',
] as const;

export type OperationalEmailKind = (typeof OPERATIONAL_EMAIL_KINDS)[number];

export type OperationalEmailSchedule = {
  enabled: boolean;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  /** 0–23 in timeZone */
  hour: number;
  timeZone: string;
};

/** Defaults match the schedules that were previously hardcoded. */
export const OPERATIONAL_EMAIL_DEFAULTS: Record<OperationalEmailKind, OperationalEmailSchedule> = {
  departmentDigest: { enabled: true, weekday: 1, hour: 10, timeZone: 'Europe/London' },
  cellDigest: { enabled: true, weekday: 6, hour: 21, timeZone: 'Europe/London' },
  sundayAttendance: { enabled: true, weekday: 0, hour: 15, timeZone: 'UTC' },
  membershipWeekly: { enabled: true, weekday: 1, hour: 0, timeZone: 'UTC' },
};

const SETTINGS_KEY = 'operationalEmailSchedules';

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function clampSchedule(
  kind: OperationalEmailKind,
  raw: unknown,
  churchTimeZone: string,
): OperationalEmailSchedule {
  const fallback = { ...OPERATIONAL_EMAIL_DEFAULTS[kind] };
  if (kind === 'sundayAttendance') {
    fallback.timeZone = isValidTimeZone(churchTimeZone) ? churchTimeZone : 'UTC';
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback;
  const row = raw as Record<string, unknown>;
  const weekday = Number(row.weekday);
  const hour = Number(row.hour);
  const timeZone = typeof row.timeZone === 'string' ? row.timeZone.trim() : '';
  return {
    enabled: row.enabled === false ? false : fallback.enabled,
    weekday: Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 ? weekday : fallback.weekday,
    hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : fallback.hour,
    timeZone: isValidTimeZone(timeZone) ? timeZone : fallback.timeZone,
  };
}

export function readOperationalEmailSchedules(
  settings: unknown,
  churchTimeZone = 'UTC',
): Record<OperationalEmailKind, OperationalEmailSchedule> {
  const root =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? (settings as Record<string, unknown>)
      : {};
  const stored =
    root[SETTINGS_KEY] && typeof root[SETTINGS_KEY] === 'object' && !Array.isArray(root[SETTINGS_KEY])
      ? (root[SETTINGS_KEY] as Record<string, unknown>)
      : {};
  return {
    departmentDigest: clampSchedule('departmentDigest', stored.departmentDigest, churchTimeZone),
    cellDigest: clampSchedule('cellDigest', stored.cellDigest, churchTimeZone),
    sundayAttendance: clampSchedule('sundayAttendance', stored.sundayAttendance, churchTimeZone),
    membershipWeekly: clampSchedule('membershipWeekly', stored.membershipWeekly, churchTimeZone),
  };
}

export function mergeOperationalEmailSchedules(
  settings: unknown,
  patch: Partial<Record<OperationalEmailKind, OperationalEmailSchedule>>,
  churchTimeZone = 'UTC',
): Record<string, unknown> {
  const root =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? { ...(settings as Record<string, unknown>) }
      : {};
  const current = readOperationalEmailSchedules(root, churchTimeZone);
  const next = { ...current };
  for (const kind of OPERATIONAL_EMAIL_KINDS) {
    if (patch[kind]) next[kind] = patch[kind]!;
  }
  root[SETTINGS_KEY] = next;
  return root;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function zonedClock(
  now: Date,
  timeZone: string,
): { weekday: number; hour: number; dateKey: string } {
  const zone = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const hour = parseInt(get('hour'), 10);
  return {
    weekday: WEEKDAY_INDEX[get('weekday')] ?? -1,
    hour: Number.isFinite(hour) ? hour : -1,
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

/** True during the configured clock hour. Used by the 15-minute digest polls. */
export function isExactHourDue(
  now: Date,
  schedule: OperationalEmailSchedule,
): { due: boolean; dateKey: string } {
  const clock = zonedClock(now, schedule.timeZone);
  return {
    due: schedule.enabled && clock.weekday === schedule.weekday && clock.hour === schedule.hour,
    dateKey: clock.dateKey,
  };
}

/** True from the configured hour onward on that weekday. Used by coarser polls. */
export function isFromHourDue(
  now: Date,
  schedule: OperationalEmailSchedule,
): { due: boolean; dateKey: string } {
  const clock = zonedClock(now, schedule.timeZone);
  return {
    due: schedule.enabled && clock.weekday === schedule.weekday && clock.hour >= schedule.hour,
    dateKey: clock.dateKey,
  };
}
