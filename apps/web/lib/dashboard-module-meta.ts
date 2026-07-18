/**
 * Routes that render an in-page module hero (EnterpriseHero / YouthHubHero / etc.).
 * Suppresses a duplicate mobile app-bar page title; the sticky bar shows the church
 * name until the hero scrolls away, then the module title.
 */
const MODULE_PAGE_CHROME_PREFIXES = [
  '/dashboard',
  '/dashboard/admin',
  '/dashboard/analytics',
  '/dashboard/automation',
  '/dashboard/membership',
  '/dashboard/pastoral-care',
  '/dashboard/community-support',
  '/dashboard/mentors',
  '/dashboard/church-landing',
  '/dashboard/staff',
  '/dashboard/communications',
  '/dashboard/pastor-reports',
  '/dashboard/admin-reports',
  '/dashboard/business',
  '/dashboard/follow-up',
  '/dashboard/outreach',
  '/dashboard/service-units',
  '/dashboard/departments',
  '/dashboard/profile',
  '/dashboard/settings',
  '/dashboard/youth',
  '/dashboard/lounge',
  '/dashboard/bus',
  '/dashboard/platform',
  '/dashboard/prayer-hub',
  '/dashboard/testimony-hub',
  '/dashboard/devotional-hub',
  '/dashboard/wisdom365',
  '/dashboard/spirify',
  '/dashboard/sermon-notes',
  '/dashboard/ministry-cells',
  '/dashboard/platform/marketing',
];

export function hasModulePageChrome(pathname: string): boolean {
  if (pathname === '/dashboard/platform') return true;
  return MODULE_PAGE_CHROME_PREFIXES.some(
    (prefix) => pathname === prefix || (prefix !== '/dashboard' && pathname.startsWith(`${prefix}/`)),
  );
}

/** Mobile top-bar title when the page does not render its own hero. */
export const MOBILE_ROUTE_TITLES: Record<string, string> = {
  '/dashboard/lounge': 'Lounge',
  '/dashboard/prayer-hub': 'Prayer Hub',
  '/dashboard/devotional-hub': 'Devotional Hub',
  '/dashboard/testimony-hub': 'Testimony Hub',
  '/dashboard/outreach/field': 'Field capture',
  '/dashboard/change-password': 'Change password',
};

export function getMobileAppBarTitle(pathname: string): string | null {
  if (hasModulePageChrome(pathname)) return null;
  if (MOBILE_ROUTE_TITLES[pathname]) return MOBILE_ROUTE_TITLES[pathname];
  return null;
}
