import { tierTitleForLevel } from './gamification.constants';
import { YOUTH_GAMIFICATION_INTEGRATIONS } from './gamification.integrations';

describe('gamification.constants', () => {
  it('maps tier titles by level', () => {
    expect(tierTitleForLevel(1)).toBe('Spark');
    expect(tierTitleForLevel(10)).toBe('Firebrand');
    expect(tierTitleForLevel(20)).toBe('Legend');
  });
});

describe('YOUTH_GAMIFICATION_INTEGRATIONS', () => {
  it('defines scoring for all youth modules', () => {
    expect(YOUTH_GAMIFICATION_INTEGRATIONS.events.rsvp.source).toBe('RSVP');
    expect(YOUTH_GAMIFICATION_INTEGRATIONS.feed.post.source).toBe('POST');
    expect(YOUTH_GAMIFICATION_INTEGRATIONS.chat.message.source).toBe('COMMENT');
    expect(YOUTH_GAMIFICATION_INTEGRATIONS.qa.ask.source).toBe('COMMENT');
    expect(YOUTH_GAMIFICATION_INTEGRATIONS.prayer.tapPray.source).toBe('DEVOTIONAL');
  });
});
