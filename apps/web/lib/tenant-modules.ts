import {
  CHURCH_TENANT_MODULE_IDS,
  CHURCH_TENANT_MODULE_LABELS,
  type ChurchTenantModuleId,
  type ChurchTenantModulesMap,
  defaultTenantModules,
} from '@church-hub/shared-types';
import type { DashboardNavItem } from '@/lib/member-nav';

export {
  CHURCH_TENANT_MODULE_IDS,
  CHURCH_TENANT_MODULE_LABELS,
  defaultTenantModules,
  type ChurchTenantModuleId,
  type ChurchTenantModulesMap,
};

/** Maps dashboard routes to tenant module flags. */
export const ROUTE_TENANT_MODULE: Record<string, ChurchTenantModuleId> = {
  '/dashboard/lounge': 'lounge',
  '/dashboard/prayer-hub': 'prayerHub',
  '/dashboard/testimony-hub': 'testimonyHub',
  '/dashboard/devotional-hub': 'devotionalHub',
  '/dashboard/wisdom365': 'wisdom365Plus',
  '/dashboard/outreach': 'outreach',
  '/dashboard/youth': 'youthHub',
  '/dashboard/business': 'kingdomKonnect',
  '/dashboard/spirify': 'spirify',
  '/dashboard/follow-up': 'followUp',
  '/dashboard/pastoral-care': 'followUp',
  '/dashboard/service-units': 'serviceUnitHub',
  '/dashboard/departments': 'serviceUnitHub',
  '/dashboard/profile': 'myProfile',
  '/dashboard/settings': 'settings',
  '/dashboard': 'staffOverview',
  '/dashboard/church-landing': 'churchLanding',
  '/dashboard/community-support': 'communitySupport',
  '/dashboard/mentors': 'mentors',
  '/dashboard/membership': 'membership',
  '/dashboard/analytics': 'membership',
  '/dashboard/automation': 'membership',
  '/dashboard/staff': 'churchStaff',
  '/dashboard/bus': 'busMinistry',
  '/dashboard/communications': 'communicationsHub',
  '/dashboard/pastor-reports': 'communicationsHub',
  '/dashboard/admin-reports': 'communicationsHub',
  '/dashboard/sermon-notes': 'sermonNote',
  '/dashboard/ministry-cells': 'ministryCells',
};

export function isTenantModuleEnabled(
  modules: ChurchTenantModulesMap | undefined,
  moduleId: ChurchTenantModuleId | undefined,
): boolean {
  if (!moduleId) return true;
  if (!modules) return true;
  return modules[moduleId] !== false;
}

export function isNavItemEnabled(
  item: DashboardNavItem,
  modules: ChurchTenantModulesMap | undefined,
): boolean {
  const moduleId = ROUTE_TENANT_MODULE[item.href];
  return isTenantModuleEnabled(modules, moduleId);
}

export function filterNavByTenantModules(
  items: DashboardNavItem[],
  modules: ChurchTenantModulesMap | undefined,
): DashboardNavItem[] {
  return items.filter((item) => isNavItemEnabled(item, modules));
}
