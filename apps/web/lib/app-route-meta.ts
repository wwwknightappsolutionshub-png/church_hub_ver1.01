import { getMobileAppBarTitle, hasModulePageChrome } from './dashboard-module-meta';

export { hasModulePageChrome, getMobileAppBarTitle };

/** @deprecated Use getMobileAppBarTitle — returns null when the page has its own module hero. */
export function getAppRouteTitle(pathname: string): string {
  const mobile = getMobileAppBarTitle(pathname);
  if (mobile) return mobile;
  if (hasModulePageChrome(pathname)) return '';
  return 'Church Hub';
}
