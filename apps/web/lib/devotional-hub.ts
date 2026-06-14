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

export const DEVOTIONAL_HUB_TABS: Array<{
  id: DevotionalHubTabId;
  label: string;
  description: string;
  shortLabel?: string;
}> = [
  {
    id: 'today',
    label: 'Today',
    shortLabel: 'Today',
    description: 'Today’s scripture reading, reflection, and mark-complete for your active plan.',
  },
  {
    id: 'plans',
    label: 'Plans',
    shortLabel: 'Plans',
    description: 'Browse reading plans; church leaders can create and publish new plans.',
  },
  {
    id: 'study',
    label: 'Study & AI',
    shortLabel: 'Study',
    description: 'Generate study notes and AI artifacts linked to your current reading plan.',
  },
  {
    id: 'actions',
    label: 'Action points',
    shortLabel: 'Actions',
    description: 'Capture daily action steps and reminders from your devotional reading.',
  },
  {
    id: 'review',
    label: 'Weekly review',
    shortLabel: 'Review',
    description: 'Summarize your week — reading progress, prayer, and journal highlights.',
  },
  {
    id: 'challenges',
    label: 'Challenges',
    shortLabel: 'Challenge',
    description: 'Join streak challenges, earn badges, and track weekly devotional goals.',
  },
  {
    id: 'reminders',
    label: 'Reminders',
    shortLabel: 'Remind',
    description: 'Set push and email reminders for your preferred devotional times.',
  },
  {
    id: 'groups',
    label: 'Groups',
    shortLabel: 'Groups',
    description: 'Create or join small groups reading the same plan together.',
  },
  {
    id: 'journal',
    label: 'Journal',
    shortLabel: 'Journal',
    description: 'Private or team journal entries with rich text and optional sharing.',
  },
  {
    id: 'prayer',
    label: 'Prayer list',
    shortLabel: 'Prayer',
    description: 'Personal prayer lists with answered markers and streak tracking.',
  },
];
