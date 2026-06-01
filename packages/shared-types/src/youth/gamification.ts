/** Youth Gamification — API contracts (Phase 6) */

export type YouthPointSource =
  | 'ATTENDANCE'
  | 'RSVP'
  | 'POST'
  | 'COMMENT'
  | 'REACTION'
  | 'CHALLENGE'
  | 'DEVOTIONAL'
  | 'INVITE'
  | 'SERVE'
  | 'MANUAL'
  | 'REDEMPTION';

export interface YouthGamificationProfile {
  memberId: string;
  points: number;
  xp: number;
  level: number;
  tierTitle: string;
  xpToNextLevel: number;
  attendanceStreak: number;
  rank: number | null;
  badges: Array<{ badge: { id: string; name: string; description?: string | null } }>;
  achievements: Array<{ id: string; name: string; description?: string | null; pointsAward: number }>;
  challenges: Array<{
    id: string;
    title: string;
    description?: string | null;
    points: number;
    targetCount: number;
    progress: number;
    completedAt?: string | null;
  }>;
  recentLedger: Array<{
    id: string;
    delta: number;
    reason: string;
    source: YouthPointSource;
    createdAt: string;
  }>;
}

export interface YouthLeaderboardRow {
  rank: number;
  memberId: string;
  points: number;
  xp: number;
  level: number;
  tierTitle: string;
  attendanceStreak: number;
  member: { id: string; firstName: string; lastName: string; roles: string[] };
  badges: Array<{ badge: { id: string; name: string } }>;
}
