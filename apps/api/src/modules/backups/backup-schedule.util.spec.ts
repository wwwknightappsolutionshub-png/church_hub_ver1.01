import { computeNextRunAt } from './backup-schedule.util';

describe('computeNextRunAt', () => {
  it('schedules daily for the next UTC day when time already passed', () => {
    const from = new Date(Date.UTC(2026, 8, 27, 10, 0, 0));
    const next = computeNextRunAt({
      frequency: 'DAILY',
      hourUtc: 2,
      minuteUtc: 0,
      from,
    });
    expect(next.toISOString()).toBe('2026-09-28T02:00:00.000Z');
  });

  it('keeps today when daily time is still ahead', () => {
    const from = new Date(Date.UTC(2026, 8, 27, 1, 0, 0));
    const next = computeNextRunAt({
      frequency: 'DAILY',
      hourUtc: 2,
      minuteUtc: 30,
      from,
    });
    expect(next.toISOString()).toBe('2026-09-27T02:30:00.000Z');
  });

  it('schedules weekly on the requested weekday', () => {
    // 2026-09-27 is Sunday
    const from = new Date(Date.UTC(2026, 8, 27, 12, 0, 0));
    const next = computeNextRunAt({
      frequency: 'WEEKLY',
      hourUtc: 3,
      minuteUtc: 0,
      dayOfPeriod: 1, // Monday
      from,
    });
    expect(next.getUTCDay()).toBe(1);
    expect(next.toISOString()).toBe('2026-09-28T03:00:00.000Z');
  });

  it('schedules monthly on day of month', () => {
    const from = new Date(Date.UTC(2026, 8, 27, 12, 0, 0));
    const next = computeNextRunAt({
      frequency: 'MONTHLY',
      hourUtc: 4,
      minuteUtc: 15,
      dayOfPeriod: 1,
      from,
    });
    expect(next.toISOString()).toBe('2026-10-01T04:15:00.000Z');
  });
});
