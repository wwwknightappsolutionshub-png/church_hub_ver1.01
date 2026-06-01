export type YouthTabId =
  | 'overview'
  | 'groups'
  | 'events'
  | 'chat'
  | 'resources'
  | 'help'
  | 'gamification'
  | 'parents'
  | 'admin';

export const YOUTH_TABS: Array<{
  id: YouthTabId;
  label: string;
  leaderOnly?: boolean;
  assignerOnly?: boolean;
}> = [
  { id: 'overview', label: 'Overview' },
  { id: 'groups', label: 'Groups' },
  { id: 'events', label: 'Events & RSVP' },
  { id: 'chat', label: 'Safe Chat' },
  { id: 'resources', label: 'Resources Hub' },
  { id: 'help', label: 'Help Zone' },
  { id: 'gamification', label: 'Gamification' },
  { id: 'parents', label: 'Parents', leaderOnly: true },
  { id: 'admin', label: 'Youth admins', leaderOnly: true, assignerOnly: true },
];

export const RESOURCE_CATEGORIES = [
  { value: 'DEVOTIONAL', label: 'Devotional' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'GUIDE', label: 'Guide' },
  { value: 'WORSHIP', label: 'Worship' },
  { value: 'EVENT_RECAP', label: 'Event recap' },
  { value: 'SAFETY', label: 'Safety' },
] as const;

export const HELP_CATEGORIES = [
  { value: 'COUNSELING', label: 'Counseling' },
  { value: 'BULLYING', label: 'Bullying' },
  { value: 'FAITH', label: 'Faith questions' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'MENTAL_HEALTH', label: 'Mental health' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const HELP_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const QA_CATEGORIES = [
  { value: 'FAITH', label: 'Faith & Bible' },
  { value: 'LIFE', label: 'Life & purpose' },
  { value: 'RELATIONSHIPS', label: 'Relationships' },
  { value: 'SCHOOL', label: 'School & stress' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const QA_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  ANSWERED: 'Answered',
  PUBLIC: 'Published',
  HIDDEN: 'Hidden',
};

export const PRAYER_CATEGORIES = [
  { value: 'HEALTH', label: 'Health' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'SCHOOL', label: 'School' },
  { value: 'GUIDANCE', label: 'Guidance' },
  { value: 'THANKSGIVING', label: 'Thanksgiving' },
  { value: 'OTHER', label: 'Other' },
] as const;
