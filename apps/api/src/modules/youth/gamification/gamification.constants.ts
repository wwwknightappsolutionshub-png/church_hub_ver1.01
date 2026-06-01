import { YouthPointSource } from '@prisma/client';

/** Default point deltas per scoring event (dev hooks + scoreEvent API). */
export const SCORE_DELTAS: Record<string, number> = {
  [YouthPointSource.ATTENDANCE]: 25,
  [YouthPointSource.RSVP]: 10,
  [YouthPointSource.POST]: 5,
  [YouthPointSource.COMMENT]: 3,
  [YouthPointSource.REACTION]: 1,
  [YouthPointSource.CHALLENGE]: 25,
  [YouthPointSource.DEVOTIONAL]: 5,
  [YouthPointSource.INVITE]: 15,
  [YouthPointSource.SERVE]: 20,
  [YouthPointSource.MANUAL]: 0,
  [YouthPointSource.REDEMPTION]: 0,
};

export const DEFAULT_YOUTH_ACHIEVEMENTS = [
  {
    key: 'first_rsvp',
    name: 'First RSVP',
    description: 'RSVP to your first youth event',
    pointsAward: 10,
    criteria: { source: 'RSVP', count: 1 },
  },
  {
    key: 'streak_3',
    name: '3-Week Streak',
    description: 'Attend events three weeks in a row',
    pointsAward: 25,
    criteria: { attendanceStreak: 3 },
  },
  {
    key: 'community_voice',
    name: 'Community Voice',
    description: 'Post or comment 10 times in the feed',
    pointsAward: 15,
    criteria: { feedActions: 10 },
  },
  {
    key: 'challenge_starter',
    name: 'Challenge Starter',
    description: 'Complete your first youth challenge',
    pointsAward: 20,
    criteria: { challengesCompleted: 1 },
  },
] as const;

export const DEFAULT_YOUTH_CHALLENGES = [
  {
    title: 'Attend 2 events this month',
    description: 'Show up and check in at two youth events',
    points: 50,
    challengeType: 'ATTENDANCE',
    targetCount: 2,
  },
  {
    title: 'RSVP streak',
    description: 'RSVP going to 3 upcoming events',
    points: 30,
    challengeType: 'RSVP',
    targetCount: 3,
  },
  {
    title: 'Encourage the feed',
    description: 'Leave 5 comments on youth posts',
    points: 20,
    challengeType: 'COMMENT',
    targetCount: 5,
  },
] as const;

export function tierTitleForLevel(level: number): string {
  if (level >= 20) return 'Legend';
  if (level >= 15) return 'Champion';
  if (level >= 10) return 'Firebrand';
  if (level >= 7) return 'Trailblazer';
  if (level >= 4) return 'Rising Star';
  return 'Spark';
}
