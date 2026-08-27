/** Canonical App Router paths for the Congregants module (URL stays /dashboard/membership). */
export const CONGREGANTS_ROUTES = {
  /** Hub URL redirects to the members list */
  hub: '/dashboard/membership',
  members: '/dashboard/membership/members',
  executiveAnalytics: '/dashboard/analytics',
  /** Legacy path — redirects to families with add modal */
  addFamily: '/dashboard/membership/families?add=1',
  families: '/dashboard/membership/families',
  familyMap: '/dashboard/membership/family-map',
  communications: '/dashboard/membership/communications',
  reports: '/dashboard/membership/reports',
  import: '/dashboard/membership/import',
  settings: '/dashboard/membership/settings',
  classes: '/dashboard/membership/classes',
  attendance: '/dashboard/membership/attendance',
} as const;

export const CONGREGANTS_PRIMARY_NAV = [
  { href: CONGREGANTS_ROUTES.members, label: 'Members', testId: 'congregants-nav-members' },
  { href: CONGREGANTS_ROUTES.families, label: 'Families List', testId: 'congregants-nav-families' },
  { href: CONGREGANTS_ROUTES.familyMap, label: 'Family Map', testId: 'congregants-nav-family-map' },
  { href: CONGREGANTS_ROUTES.communications, label: 'Communications', testId: 'congregants-nav-communications' },
  { href: CONGREGANTS_ROUTES.reports, label: 'Reports', testId: 'congregants-nav-reports' },
] as const;
