/** Tenant feature flags stored on `Church.settings.tenantModules`. */
export const CHURCH_TENANT_MODULE_IDS = [
  'lounge',
  'prayerHub',
  'testimonyHub',
  'devotionalHub',
  'wisdom365Plus',
  'outreach',
  'youthHub',
  'kingdomKonnect',
  'spirify',
  'followUp',
  'serviceUnitHub',
  'myProfile',
  'settings',
  'staffOverview',
  'churchLanding',
  'communitySupport',
  'mentors',
  'membership',
  'churchStaff',
  'busMinistry',
  'communicationsHub',
  'sermonNote',
  'ministryCells',
] as const;

export type ChurchTenantModuleId = (typeof CHURCH_TENANT_MODULE_IDS)[number];

export type ChurchTenantModulesMap = Record<ChurchTenantModuleId, boolean>;

export const CHURCH_TENANT_MODULE_LABELS: Record<ChurchTenantModuleId, string> = {
  lounge: 'Lounge',
  prayerHub: 'Prayer Hub',
  testimonyHub: 'Testimony Hub',
  devotionalHub: 'Devotional Hub',
  wisdom365Plus: 'Wisdom365+',
  outreach: 'Outreach',
  youthHub: 'Youth Hub',
  kingdomKonnect: 'Kingdom Konnect',
  spirify: 'Spirify',
  followUp: 'Follow-Up & Discipleship',
  serviceUnitHub: 'Service Unit Hub',
  myProfile: 'My Profile',
  settings: 'Settings',
  staffOverview: 'Staff overview dashboard',
  churchLanding: 'Church landing editor',
  communitySupport: 'Community job requests',
  mentors: 'Mentors admin',
  membership: 'Membership',
  churchStaff: 'Church staff',
  busMinistry: 'Bus ministry',
  communicationsHub: 'Communication Hub',
  sermonNote: 'Sermon Note',
  ministryCells: 'Ministry/Cells',
};

export function defaultTenantModules(): ChurchTenantModulesMap {
  return Object.fromEntries(
    CHURCH_TENANT_MODULE_IDS.map((id) => [id, true]),
  ) as ChurchTenantModulesMap;
}

export function parseTenantModulesFromSettings(
  settings: unknown,
): ChurchTenantModulesMap {
  const base = defaultTenantModules();
  if (!settings || typeof settings !== 'object') return base;
  const raw = (settings as { tenantModules?: Record<string, boolean> }).tenantModules;
  if (!raw || typeof raw !== 'object') return base;
  for (const id of CHURCH_TENANT_MODULE_IDS) {
    if (typeof raw[id] === 'boolean') base[id] = raw[id];
  }
  return base;
}

export function mergeTenantModulesIntoSettings(
  settings: Record<string, unknown>,
  modules: Partial<ChurchTenantModulesMap>,
): Record<string, unknown> {
  const current = parseTenantModulesFromSettings(settings);
  const next = { ...current, ...modules };
  return { ...settings, tenantModules: next };
}
