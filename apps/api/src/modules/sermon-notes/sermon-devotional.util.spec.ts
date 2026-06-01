import { buildSermonDevotionalDays, buildSermonSummary } from './sermon-devotional.util';

describe('buildSermonDevotionalDays', () => {
  it('creates 7 days with scripture and comprehensive reflection', () => {
    const days = buildSermonDevotionalDays({
      sermonTitle: 'Faith and Works',
      transcript: 'James teaches that faith without works is dead. We must live what we believe.',
      pastorContext: 'Emphasize small groups discussing application on Wednesday.',
      summary: 'A week on living faith.',
      durationDays: 7,
    });

    expect(days).toHaveLength(7);
    expect(days[0].scriptureRef).toBeTruthy();
    expect(days[0].scriptureText).toContain('Read');
    expect(days[0].reflection).toContain('Faith and Works');
    expect(days[0].reflection).toContain('Pastor');
    expect(days[6].actionPoint).toContain('read');
  });
});

describe('buildSermonSummary', () => {
  it('includes pastor context in summary', () => {
    const summary = buildSermonSummary({
      title: 'Hope',
      transcript: 'Christ is our hope.',
      pastorContext: 'Focus on grief counseling.',
    });
    expect(summary).toContain('seven-day');
    expect(summary).toContain('Pastor context');
  });
});
