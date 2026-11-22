/**
 * Church calendar create/update input contracts — sanitize + bounds.
 */
import {
  CreateChurchCalendarEventSchema,
  UpdateChurchCalendarEventSchema,
} from '@church-hub/shared-types';

describe('Church calendar event validation', () => {
  it('accepts a sanitized create payload', () => {
    const parsed = CreateChurchCalendarEventSchema.safeParse({
      title: '  Sunday Service  ',
      description: 'Worship\u0000 night',
      startsAt: '2026-11-22T12:00:00.000Z',
      highlightColor: '#1e3a5f',
      allDay: true,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.title).toBe('Sunday Service');
    expect(parsed.data.description).toBe('Worship night');
    expect(parsed.data.highlightColor).toBe('#1e3a5f');
  });

  it('rejects empty title and invalid color/date', () => {
    expect(CreateChurchCalendarEventSchema.safeParse({ title: '   ', startsAt: '2026-11-22' }).success).toBe(
      false,
    );
    expect(
      CreateChurchCalendarEventSchema.safeParse({
        title: 'Meet',
        startsAt: 'not-a-date',
      }).success,
    ).toBe(false);
    expect(
      CreateChurchCalendarEventSchema.safeParse({
        title: 'Meet',
        startsAt: '2026-11-22T12:00:00.000Z',
        highlightColor: 'red',
      }).success,
    ).toBe(false);
  });

  it('bounds title length', () => {
    const parsed = CreateChurchCalendarEventSchema.safeParse({
      title: 'A'.repeat(200),
      startsAt: '2026-11-22T12:00:00.000Z',
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.title.length).toBe(120);
  });

  it('allows pin-only update patches', () => {
    const parsed = UpdateChurchCalendarEventSchema.safeParse({ isPinned: true });
    expect(parsed.success).toBe(true);
  });
});
