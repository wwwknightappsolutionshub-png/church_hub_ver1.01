import {
  isLondonMondayDigestWindow,
  isLondonSaturdayCellDigestWindow,
  londonDateParts,
} from './report-digest.util';

describe('report-digest.util', () => {
  it('parses Europe/London parts', () => {
    // 2026-07-27 21:30 UTC = Mon 22:30 BST (UTC+1)
    const p = londonDateParts(new Date('2026-07-27T21:30:00.000Z'));
    expect(p.weekday).toBe('Mon');
    expect(p.hour).toBe(22);
    expect(p.dateKey).toBe('2026-07-27');
  });

  it('detects Monday 10:00 London window', () => {
    // 2026-07-27 09:15 UTC = Mon 10:15 BST
    const due = isLondonMondayDigestWindow(new Date('2026-07-27T09:15:00.000Z'));
    expect(due.due).toBe(true);
    expect(due.dateKey).toBe('2026-07-27');

    const notDue = isLondonMondayDigestWindow(new Date('2026-07-27T08:15:00.000Z'));
    expect(notDue.due).toBe(false);
  });

  it('detects Saturday 21:00 London window', () => {
    // 2026-08-01 20:10 UTC = Sat 21:10 BST
    const due = isLondonSaturdayCellDigestWindow(new Date('2026-08-01T20:10:00.000Z'));
    expect(due.due).toBe(true);
    expect(due.dateKey).toBe('2026-08-01');
  });
});
