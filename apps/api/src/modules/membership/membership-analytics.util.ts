/** Date bucket helpers + filter helpers for membership analytics (testable, no I/O). */

export interface DateBucket {
  key: string;
  start: Date;
  end: Date;
}

export function buildMonthBuckets(months: number, now = new Date()): DateBucket[] {
  const buckets: DateBucket[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1));
    const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
    buckets.push({ key, start, end });
  }
  return buckets;
}

/** Inclusive calendar-month buckets covering [from, to]. */
export function buildMonthBucketsForRange(from: Date, to: Date): DateBucket[] {
  const startMonth = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const endExclusive = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() + 1, 1));
  const buckets: DateBucket[] = [];
  let cursor = startMonth;
  while (cursor < endExclusive) {
    const start = new Date(cursor);
    const end = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
    buckets.push({ key, start, end });
    cursor = end;
  }
  return buckets.length > 0 ? buckets : buildMonthBuckets(1, to);
}

export function buildWeekBuckets(weeks: number, now = new Date()): DateBucket[] {
  const buckets: DateBucket[] = [];
  const endAnchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  endAnchor.setUTCHours(0, 0, 0, 0);
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(endAnchor);
    end.setUTCDate(end.getUTCDate() - i * 7);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 7);
    const key = end.toISOString().slice(0, 10);
    buckets.push({ key, start, end });
  }
  return buckets;
}

/** Week buckets ending at `end` covering the same span length as months/range. */
export function buildWeekBucketsEndingAt(end: Date, weekCount: number): DateBucket[] {
  return buildWeekBuckets(weekCount, end);
}

export function priorEqualRange(start: Date, end: Date): { start: Date; end: Date } {
  const ms = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - ms),
    end: new Date(start.getTime()),
  };
}

export function retentionRate(retained: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((retained / total) * 1000) / 1000;
}

export function attendanceRate(present: number, absent: number): number {
  const total = present + absent;
  if (total <= 0) return 0;
  return Math.round((present / total) * 1000) / 1000;
}

export function deltaValue(current: number, prior: number): number {
  return Math.round((current - prior) * 1000) / 1000;
}

export const ANALYTICS_AGE_BANDS = [
  { key: '0-12', label: '0–12', min: 0, max: 12 },
  { key: '13-17', label: '13–17', min: 13, max: 17 },
  { key: '18-29', label: '18–29', min: 18, max: 29 },
  { key: '30-49', label: '30–49', min: 30, max: 49 },
  { key: '50-64', label: '50–64', min: 50, max: 64 },
  { key: '65+', label: '65+', min: 65, max: 200 },
  { key: 'UNKNOWN', label: 'Unknown', min: -1, max: -1 },
] as const;

export type AnalyticsAgeBandKey = (typeof ANALYTICS_AGE_BANDS)[number]['key'];

export function ageBandForDob(dob: Date | null | undefined, now = new Date()): AnalyticsAgeBandKey {
  if (!dob) return 'UNKNOWN';
  const age = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const band = ANALYTICS_AGE_BANDS.find((b) => b.key !== 'UNKNOWN' && age >= b.min && age <= b.max);
  return band?.key ?? 'UNKNOWN';
}

/** DOB must fall in [dobMin, dobMax) for the band (UNKNOWN uses null DOB). */
export function dobRangeForAgeBand(
  band: AnalyticsAgeBandKey,
  now = new Date(),
): { dobMin?: Date; dobMax?: Date; unknownOnly?: boolean } {
  if (band === 'UNKNOWN') return { unknownOnly: true };
  const def = ANALYTICS_AGE_BANDS.find((b) => b.key === band);
  if (!def || def.min < 0) return { unknownOnly: true };
  const dobMax = new Date(
    Date.UTC(now.getUTCFullYear() - def.min, now.getUTCMonth(), now.getUTCDate() + 1),
  );
  const dobMin = new Date(
    Date.UTC(now.getUTCFullYear() - def.max - 1, now.getUTCMonth(), now.getUTCDate()),
  );
  return { dobMin, dobMax };
}

export const SUNDAY_DEPARTMENT_CODES = [
  'USHERING',
  'PROTOCOL',
  'YOUTH',
  'TEENS',
  'CHILDREN',
] as const;
