import { YouthPointSource } from '@prisma/client';

/**
 * Cross-module gamification scoring map (Phase 10).
 * Each youth feature calls YouthGamificationService.scoreEvent with these sources.
 */
export const YOUTH_GAMIFICATION_INTEGRATIONS = {
  events: {
    rsvp: { source: YouthPointSource.RSVP, reason: 'Event RSVP' },
    attendance: { source: YouthPointSource.ATTENDANCE, reason: 'Event check-in' },
  },
  feed: {
    post: { source: YouthPointSource.POST, reason: 'Feed post' },
    comment: { source: YouthPointSource.COMMENT, reason: 'Feed comment' },
    reaction: { source: YouthPointSource.REACTION, reason: 'Feed reaction' },
  },
  chat: {
    message: { source: YouthPointSource.COMMENT, reason: 'Chat message' },
  },
  qa: {
    ask: { source: YouthPointSource.COMMENT, reason: 'Q&A question submitted' },
    answered: { source: YouthPointSource.SERVE, reason: 'Q&A answer received' },
  },
  prayer: {
    request: { source: YouthPointSource.DEVOTIONAL, reason: 'Prayer request shared' },
    tapPray: { source: YouthPointSource.DEVOTIONAL, reason: 'Tap to pray' },
    encourage: { source: YouthPointSource.REACTION, reason: 'Prayer encouragement' },
  },
  help: {
    resolved: { source: YouthPointSource.SERVE, reason: 'Help request resolved' },
  },
} as const;
