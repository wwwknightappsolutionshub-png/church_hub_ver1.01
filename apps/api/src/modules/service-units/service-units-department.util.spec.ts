import { isoWeekKey, weekStartUtc } from './service-units-department.util';

describe('service-units-department.util', () => {
  it('weekStartUtc returns Monday for mid-week date', () => {
    const ws = weekStartUtc(new Date('2026-05-27T12:00:00.000Z'));
    expect(ws.getUTCDay()).toBe(1);
    expect(ws.toISOString().slice(0, 10)).toBe('2026-05-25');
  });

  it('isoWeekKey formats year-week', () => {
    expect(isoWeekKey(new Date('2026-05-27T12:00:00.000Z'))).toMatch(/^2026-W\d{2}$/);
  });
});
