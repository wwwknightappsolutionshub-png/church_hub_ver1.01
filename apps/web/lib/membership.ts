export const MEMBER_STATUSES = ['VISITOR', 'NEW_MEMBER', 'ACTIVE_MEMBER', 'DISCIPLED'] as const;

export const STATUS_LABELS: Record<string, string> = {
  VISITOR: 'Visitor',
  NEW_MEMBER: 'New Member',
  ACTIVE_MEMBER: 'Active Member',
  DISCIPLED: 'Discipled',
};

export const STATUS_VARIANT: Record<string, 'secondary' | 'gold' | 'success' | 'default'> = {
  VISITOR: 'secondary',
  NEW_MEMBER: 'gold',
  ACTIVE_MEMBER: 'success',
  DISCIPLED: 'default',
};

export const ROLE_LABELS: Record<string, string> = {
  YOUTH: 'Youth',
  ADULT: 'Adult',
  LEADER: 'Leader',
  DRIVER: 'Driver',
  EVANGELIST: 'Evangelist',
  ADMIN: 'Admin',
  PASTOR: 'Pastor',
};

export const ONBOARDING_STEP_LABELS = [
  'Personal details',
  'Member roles',
  'Ministry interests',
  'Family linking',
  'Review & complete',
];

export const SELECTABLE_ROLES = ['YOUTH', 'ADULT', 'LEADER', 'DRIVER', 'EVANGELIST'] as const;

export function formatMemberName(m: { firstName: string; lastName: string }) {
  return `${m.firstName} ${m.lastName}`;
}

export function onboardingProgress(step: number) {
  if (step >= 6) return 100;
  if (step <= 0) return 0;
  return Math.round((step / 5) * 100);
}
