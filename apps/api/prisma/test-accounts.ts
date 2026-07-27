/** Demo password for every seeded test account. */
export const TEST_PASSWORD = 'ChurchHub123!';

export interface TestAccountDetail {
  key: string;
  label: string;
  email: string;
  /** System UserRole (JWT / API guards). */
  userRole: string;
  /** Member profile roles (MemberRoleType), if linked. */
  memberRoles: string[];
  /** Service units seeded for this account. */
  serviceUnits: string[];
  description: string;
  /** Suggested areas to verify after magic login. */
  testFocus: string[];
}

export const TEST_ACCOUNTS: TestAccountDetail[] = [
  {
    key: 'platform',
    label: 'SaaS Platform Admin',
    email: 'www.knightappsolutionshub@gmail.com',
    userRole: 'PLATFORM_ADMIN',
    memberRoles: [],
    serviceUnits: [],
    description:
      'Church_Hub SaaS operator — view all churches, pastors, and church admins across the platform.',
    testFocus: [
      'Platform console → all churches',
      'Per-church pastors & admins roster',
      'Not tied to a single congregation',
    ],
  },
  {
    key: 'admin',
    label: 'Church Admin',
    email: 'admin@demo.church',
    userRole: 'ADMIN',
    memberRoles: ['ADMIN', 'LEADER'],
    serviceUnits: ['All units (seed leader on every unit)'],
    description: 'Full church access — all modules, membership CRUD, follow-up, service units, pastor tools.',
    testFocus: [
      'Full dashboard & all nav items',
      'Membership create/edit/delete',
      'Follow-Up pipeline',
      'Service Unit Hub → any unit',
      'Approve Prayer/Testimony Hub posts',
    ],
  },
  {
    key: 'pastor',
    label: 'Pastor',
    email: 'pastor@demo.church',
    userRole: 'PASTOR',
    memberRoles: ['ADULT', 'LEADER'],
    serviceUnits: ['Follow-up (member)'],
    description: 'Pastoral staff — follow-up write, membership read, Prayer/Testimony approval, join request notifications.',
    testFocus: [
      'Follow-Up & Discipleship',
      'Prayer Hub / Testimony Hub → Approve pending',
      'Service unit join notifications',
      'View membership (read-only)',
    ],
  },
  {
    key: 'leader',
    label: 'Ministry Leader',
    email: 'leader@demo.church',
    userRole: 'LEADER',
    memberRoles: ['ADULT', 'LEADER'],
    serviceUnits: ['Follow-up (member)'],
    description: 'Ministry leader — same API access as pastor for follow-up; membership read; service unit member on Follow-up.',
    testFocus: [
      'Follow-Up pipeline',
      'Service Unit Hub (member of Follow-up)',
      'Outreach / youth where permitted',
    ],
  },
  {
    key: 'member',
    label: 'Church Member',
    email: 'member@demo.church',
    userRole: 'MEMBER',
    memberRoles: ['ADULT'],
    serviceUnits: ['Follow-up (member)'],
    description: 'Standard member — Prayer/Testimony Hub, profile, service unit join form; no admin tools.',
    testFocus: [
      'Prayer Hub & Testimony Hub (submit requests)',
      'My Profile → messages to pastor',
      'Service Unit Hub → request to join (not direct access)',
      'Follow-Up hidden unless in discipleship unit',
    ],
  },
  {
    key: 'unitadmin',
    label: 'Service Unit Admin',
    email: 'unitadmin@demo.church',
    userRole: 'LEADER',
    memberRoles: ['ADULT', 'ADMIN'],
    serviceUnits: ['Follow-up (UNIT ADMIN)'],
    description: 'Unit admin on Follow-up — approve join requests, edit welcome email, add leaders, meeting summaries CRUD.',
    testFocus: [
      'Service Unit Hub → Follow-up → Unit admin tab',
      'Approve/reject join requests + welcome email',
      'Meeting summary tab',
      'Membership CRUD (member ADMIN role)',
    ],
  },
  {
    key: 'choiradmin',
    label: 'Choir Unit Leader',
    email: 'choiradmin@demo.church',
    userRole: 'LEADER',
    memberRoles: ['ADULT', 'LEADER'],
    serviceUnits: ['Choir (UNIT ADMIN)'],
    description: 'Unit leader and unit admin on Choir — department workspace, members, reports, and feedbacks.',
    testFocus: [
      'Service Unit Hub → Choir → Department tab',
      'Members tab — roster management',
      'Reports & Feedbacks (unit admin)',
      'Unit admin — join requests & welcome email',
    ],
  },
  {
    key: 'evangelist',
    label: 'Evangelist',
    email: 'evangelist@demo.church',
    userRole: 'LEADER',
    memberRoles: ['ADULT', 'EVANGELIST'],
    serviceUnits: ['Harvesters Squad (member)'],
    description: 'Evangelism focus — Harvesters Squad member; Follow-Up access via evangelist member role.',
    testFocus: [
      'Follow-Up & Discipleship (auto access)',
      'Outreach capture',
      'Harvesters Squad unit access',
    ],
  },
  {
    key: 'driver',
    label: 'Bus Driver',
    email: 'driver@demo.church',
    userRole: 'DRIVER',
    memberRoles: ['ADULT', 'DRIVER'],
    serviceUnits: [],
    description: 'Transport ministry only — bus module write; limited dashboard modules.',
    testFocus: [
      'Bus Ministry module',
      'No Follow-Up / unit admin tools',
    ],
  },
];

/** @deprecated Use userRole on TestAccountDetail */
export type TestAccount = TestAccountDetail;
