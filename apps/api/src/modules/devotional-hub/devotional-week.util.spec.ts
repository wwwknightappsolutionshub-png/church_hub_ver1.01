import { buildWeeklySuggestions, isoWeekKey, weekRangeFromKey } from './devotional-week.util';

describe('devotional-week.util', () => {
  it('isoWeekKey formats ISO week', () => {
    const key = isoWeekKey(new Date('2026-05-26T12:00:00Z'));
    expect(key).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('weekRangeFromKey parses valid keys', () => {
    const { start, end } = weekRangeFromKey('2026-W22');
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });

  it('buildWeeklySuggestions handles empty week', () => {
    const s = buildWeeklySuggestions({
      completed: 0,
      skipped: 0,
      pending: 0,
      planDaysCompleted: 0,
      streakDays: 0,
    });
    expect(s.length).toBeGreaterThan(0);
  });

  it('buildWeeklySuggestions flags high skip rate', () => {
    const s = buildWeeklySuggestions({
      completed: 1,
      skipped: 3,
      pending: 0,
      planDaysCompleted: 1,
      streakDays: 0,
    });
    expect(s.some((x) => x.includes('fewer'))).toBe(true);
  });
});
