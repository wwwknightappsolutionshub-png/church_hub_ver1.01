/** Youth Phase 10 — access context & integrations */

export interface YouthAccessContext {
  userId: string;
  churchId: string;
  roleNames: string[];
  isLeader: boolean;
  isYouth: boolean;
  memberId: string | null;
  memberName: string | null;
  safeMode: {
    enabled: boolean;
    strict: boolean;
    description: string;
  };
  permissions: {
    moderateContent: boolean;
    manageEvents: boolean;
    manageGroups: boolean;
    manageResources: boolean;
    managePrayerWall: boolean;
    awardPoints: boolean;
    qaLeaderQueue: boolean;
    viewParentLinks: boolean;
    assignYouthAdmins: boolean;
    manageYouthHub: boolean;
  };
  gamification: {
    points: number;
    level: number;
    tierTitle: string;
  } | null;
  integrations: {
    events: boolean;
    feed: boolean;
    chat: boolean;
    qa: boolean;
    prayer: boolean;
  };
}
