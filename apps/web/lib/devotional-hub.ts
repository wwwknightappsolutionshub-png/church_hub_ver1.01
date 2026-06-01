/** Devotional Hub — routes, query keys, tabs */

export const DEVOTIONAL_HUB_ROUTES = {
  hub: '/dashboard/devotional-hub',
  plans: '/dashboard/devotional-hub/plans',
  planNew: '/dashboard/devotional-hub/plans/new',
  planEdit: (planId: string) => `/dashboard/devotional-hub/plans/${planId}/edit`,
  groups: '/dashboard/devotional-hub/groups',
  groupDetail: (groupId: string) => `/dashboard/devotional-hub/groups/${groupId}`,
  journal: '/dashboard/devotional-hub/journal',
  journalShare: (token: string) => `/dashboard/devotional-hub/journal/share/${token}`,
} as const;

export const DEVOTIONAL_QUERY_KEYS = {
  context: () => ['devotional-context'] as string[],
  plans: () => ['devotional-plans'] as string[],
  today: (planId: string) => ['devotional-today', planId] as string[],
  progress: (planId: string) => ['devotional-progress', planId] as string[],
  journals: () => ['devotional-journals'] as string[],
  groups: () => ['devotional-groups'] as string[],
  prayerLists: () => ['devotional-prayer-lists'] as string[],
  challenges: () => ['devotional-challenges'] as string[],
  challengeWeekly: () => ['devotional-challenge-weekly'] as string[],
  challengeBadges: () => ['devotional-challenge-badges'] as string[],
  aiArtifacts: (planId?: string) =>
    ['devotional-ai-artifacts', planId ?? 'all'] as string[],
};

/** React Query tuning — longer cache for stable hub reads */
export const DEVOTIONAL_QUERY_STALE = {
  context: 5 * 60_000,
  plans: 2 * 60_000,
  today: 60_000,
  list: 30_000,
  aiArtifacts: 10 * 60_000,
} as const;

export type DevotionalHubTabId =
  | 'today'
  | 'plans'
  | 'groups'
  | 'journal'
  | 'prayer'
  | 'challenges'
  | 'reminders'
  | 'study'
  | 'actions'
  | 'review';

export const DEVOTIONAL_QUERY_KEYS_REMINDERS = () => ['devotional-reminder-sync'] as string[];

export const DEVOTIONAL_HUB_TABS: Array<{ id: DevotionalHubTabId; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'plans', label: 'Plans' },
  { id: 'study', label: 'Study & AI' },
  { id: 'actions', label: 'Action points' },
  { id: 'review', label: 'Weekly review' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'groups', label: 'Groups' },
  { id: 'journal', label: 'Journal' },
  { id: 'prayer', label: 'Prayer list' },
];
