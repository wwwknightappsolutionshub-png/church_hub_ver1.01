/** Mirrors API `GET /auth/test-accounts` — used as login-page fallback. */
export const TEST_PASSWORD = 'ChurchHub123!';

export interface TestAccountDetail {
  key: string;
  label: string;
  email: string;
  userRole: string;
  memberRoles: string[];
  serviceUnits: string[];
  description: string;
  testFocus: string[];
}

export const FALLBACK_TEST_ACCOUNTS: TestAccountDetail[] = [
  {
    key: 'platform',
    label: 'SaaS Platform Admin',
    email: 'platform@churchhub.com',
    userRole: 'PLATFORM_ADMIN',
    memberRoles: [],
    serviceUnits: [],
    description: 'Platform operator — all churches and staff rosters.',
    testFocus: ['Platform console', 'All churches'],
  },
  {
    key: 'admin',
    label: 'Church Admin',
    email: 'admin@demo.church',
    userRole: 'ADMIN',
    memberRoles: ['ADMIN', 'LEADER'],
    serviceUnits: ['All units (seed leader on every unit)'],
    description: 'Full church access — all modules, membership CRUD, follow-up, and service units (Pastoral Care is pastor-only).',
    testFocus: ['Full dashboard', 'Admin Reports center', 'Membership CRUD', 'Follow-Up'],
  },
  {
    key: 'pastor',
    label: 'Pastor',
    email: 'pastor@demo.church',
    userRole: 'PASTOR',
    memberRoles: ['ADULT', 'LEADER'],
    serviceUnits: ['Follow-up'],
    description: 'Pastoral staff — follow-up, Prayer/Testimony approval, join notifications.',
    testFocus: ['Follow-Up', 'Pastor Reports inbox', 'Prayer/Testimony approve'],
  },
  {
    key: 'leader',
    label: 'Ministry Leader',
    email: 'leader@demo.church',
    userRole: 'LEADER',
    memberRoles: ['ADULT', 'LEADER'],
    serviceUnits: ['Follow-up'],
    description: 'Ministry leader — follow-up write, membership read.',
    testFocus: ['Follow-Up', 'Service units (member)'],
  },
  {
    key: 'member',
    label: 'Church Member',
    email: 'member@demo.church',
    userRole: 'MEMBER',
    memberRoles: ['ADULT'],
    serviceUnits: ['Follow-up'],
    description: 'Standard member — hubs, profile, join units via request.',
    testFocus: ['Prayer/Testimony Hub', 'Profile', 'Unit join form'],
  },
  {
    key: 'unitadmin',
    label: 'Service Unit Admin',
    email: 'unitadmin@demo.church',
    userRole: 'LEADER',
    memberRoles: ['ADULT', 'ADMIN'],
    serviceUnits: ['Follow-up (UNIT ADMIN)'],
    description: 'Follow-up unit admin — join approvals, welcome email template.',
    testFocus: ['Unit admin tab', 'Join approvals', 'Email template'],
  },
  {
    key: 'choiradmin',
    label: 'Choir Unit Leader',
    email: 'choiradmin@demo.church',
    userRole: 'LEADER',
    memberRoles: ['ADULT', 'LEADER'],
    serviceUnits: ['Choir (UNIT ADMIN)'],
    description: 'Choir unit leader & admin — department workspace, members, reports.',
    testFocus: ['Choir Department tab', 'Members', 'Reports & Feedbacks'],
  },
  {
    key: 'evangelist',
    label: 'Evangelist',
    email: 'evangelist@demo.church',
    userRole: 'LEADER',
    memberRoles: ['ADULT', 'EVANGELIST'],
    serviceUnits: ['Harvesters Squad'],
    description: 'Evangelist — Harvesters + Follow-Up access.',
    testFocus: ['Follow-Up', 'Outreach', 'Harvesters Squad'],
  },
  {
    key: 'driver',
    label: 'Bus Driver',
    email: 'driver@demo.church',
    userRole: 'DRIVER',
    memberRoles: ['ADULT', 'DRIVER'],
    serviceUnits: [],
    description: 'Bus ministry only.',
    testFocus: ['Bus Ministry'],
  },
];
