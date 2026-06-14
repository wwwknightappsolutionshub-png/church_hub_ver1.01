import {
  parseServiceDateInput,
  simplifyLessonForChildren,
  weekStartUtc,
  isoWeekKey,
  parseWeekStartInput,
  serviceDateIso,
} from './children.constants';

describe('children.constants', () => {
  it('computes Monday week start in UTC', () => {
    const wed = new Date('2026-05-27T12:00:00Z');
    const start = weekStartUtc(wed);
    expect(isoWeekKey(start)).toBe('2026-05-25');
  });

  it('parses date input as stable week start', () => {
    expect(isoWeekKey(parseWeekStartInput('2026-05-27'))).toBe('2026-05-25');
  });

  it('parses service date as exact UTC calendar day', () => {
    const day = parseServiceDateInput('2026-06-09');
    expect(serviceDateIso(day)).toBe('2026-06-09');
    expect(isoWeekKey(day)).toBe('2026-06-09');
  });

  it('simplifies lesson text with age prefix', () => {
    const out = simplifyLessonForChildren('Therefore we ought to pray nevertheless.', 'AGES_3_5');
    expect(out).toContain('[Simple — ages 3–5]');
    expect(out.toLowerCase()).not.toContain('therefore');
  });
});
