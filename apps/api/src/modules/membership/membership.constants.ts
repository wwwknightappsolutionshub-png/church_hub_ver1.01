import { MemberStatus } from '@prisma/client';

export const MEMBER_STATUS_ORDER: MemberStatus[] = [
  'VISITOR',
  'NEW_MEMBER',
  'ACTIVE_MEMBER',
  'DISCIPLED',
];

export const ONBOARDING_STEPS = [
  { step: 1, key: 'personal', title: 'Personal details' },
  { step: 2, key: 'roles', title: 'Member roles' },
  { step: 3, key: 'ministries', title: 'Ministry interests' },
  { step: 4, key: 'family', title: 'Family linking' },
  { step: 5, key: 'review', title: 'Review & complete' },
] as const;

export const ONBOARDING_COMPLETE_STEP = 6;

export const MINISTRY_INTEREST_OPTIONS = [
  'Ushering',
  'Choir & Worship',
  "Children's Church",
  "Teens' Church",
  'Media & Production',
  'Prayer & Intercession',
  'Hospitality',
  'Evangelism & Outreach',
  'Follow-up & Discipleship',
  'Transportation',
  'Technical & IT',
  'Security',
  'Protocol',
  'Medical',
  'Winning Foundation School',
] as const;

export const MEMBER_ROLE_OPTIONS = ['YOUTH', 'ADULT', 'LEADER', 'DRIVER', 'EVANGELIST'] as const;
