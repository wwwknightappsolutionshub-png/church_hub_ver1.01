import {
  attendanceRate,
  buildMonthBuckets,
  buildWeekBuckets,
  retentionRate,
} from './membership-analytics.util';

describe('membership-analytics.util', () => {
  it('buildMonthBuckets returns ordered keys', () => {
    const buckets = buildMonthBuckets(3, new Date('2026-05-15T12:00:00Z'));
    expect(buckets).toHaveLength(3);
    expect(buckets[0].key).toBe('2026-03');
    expect(buckets[2].key).toBe('2026-05');
  });

  it('buildWeekBuckets returns N weeks', () => {
    expect(buildWeekBuckets(4, new Date('2026-05-15T12:00:00Z'))).toHaveLength(4);
  });

  it('retentionRate handles zero denominator', () => {
    expect(retentionRate(0, 0)).toBe(0);
    expect(retentionRate(3, 10)).toBe(0.3);
  });

  it('attendanceRate handles zero denominator', () => {
    expect(attendanceRate(0, 0)).toBe(0);
    expect(attendanceRate(8, 2)).toBe(0.8);
  });
});
