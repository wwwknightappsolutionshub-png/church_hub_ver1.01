import {
  ageBandForDob,
  attendanceRate,
  buildMonthBuckets,
  buildMonthBucketsForRange,
  buildWeekBuckets,
  deltaValue,
  dobRangeForAgeBand,
  priorEqualRange,
  retentionRate,
} from './membership-analytics.util';

describe('membership-analytics.util', () => {
  it('buildMonthBuckets returns correct keys', () => {
    const now = new Date(Date.UTC(2026, 7, 15));
    const buckets = buildMonthBuckets(3, now);
    expect(buckets).toHaveLength(3);
    expect(buckets.map((b) => b.key)).toEqual(['2026-06', '2026-07', '2026-08']);
  });

  it('buildMonthBucketsForRange covers inclusive months', () => {
    const from = new Date(Date.UTC(2026, 0, 10));
    const to = new Date(Date.UTC(2026, 2, 20));
    const buckets = buildMonthBucketsForRange(from, to);
    expect(buckets.map((b) => b.key)).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('buildWeekBuckets returns requested count', () => {
    expect(buildWeekBuckets(8)).toHaveLength(8);
  });

  it('rates return 0 for empty denominators', () => {
    expect(retentionRate(0, 0)).toBe(0);
    expect(attendanceRate(0, 0)).toBe(0);
  });

  it('priorEqualRange mirrors duration', () => {
    const start = new Date('2026-04-01T00:00:00.000Z');
    const end = new Date('2026-07-01T00:00:00.000Z');
    const prior = priorEqualRange(start, end);
    expect(prior.end.toISOString()).toBe(start.toISOString());
    expect(prior.end.getTime() - prior.start.getTime()).toBe(end.getTime() - start.getTime());
  });

  it('ageBandForDob and dobRangeForAgeBand round-trip', () => {
    const now = new Date(Date.UTC(2026, 0, 1));
    expect(ageBandForDob(null, now)).toBe('UNKNOWN');
    expect(dobRangeForAgeBand('UNKNOWN').unknownOnly).toBe(true);
    const range = dobRangeForAgeBand('18-29', now);
    expect(range.dobMin).toBeDefined();
    expect(range.dobMax).toBeDefined();
    expect(deltaValue(0.5, 0.2)).toBe(0.3);
  });
});
