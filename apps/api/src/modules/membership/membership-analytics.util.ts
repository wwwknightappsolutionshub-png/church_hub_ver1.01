/** Date bucket helpers for membership analytics (testable, no I/O). */

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

export function retentionRate(retained: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((retained / total) * 1000) / 1000;
}

export function attendanceRate(present: number, absent: number): number {
  const total = present + absent;
  if (total <= 0) return 0;
  return Math.round((present / total) * 1000) / 1000;
}
