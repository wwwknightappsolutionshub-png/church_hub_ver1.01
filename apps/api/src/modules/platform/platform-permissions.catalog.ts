/** Platform permission catalog — resource.action keys stored in Permission rows. */

export type PlatformPermissionKey =
  | 'platform.overview:read'
  | 'platform.tenants:read'
  | 'platform.tenants:write'
  | 'platform.tenants:delete'
  | 'platform.tenants:purge'
  | 'platform.tenants.staff:write'
  | 'platform.messaging:read'
  | 'platform.messaging:write'
  | 'platform.analytics:read'
  | 'platform.marketing:read'
  | 'platform.marketing:write'
  | 'platform.wisdom365:read'
  | 'platform.wisdom365:write'
  | 'platform.team:read'
  | 'platform.team:write';

export type PlatformPermissionDef = {
  key: PlatformPermissionKey;
  resource: string;
  action: string;
  label: string;
  group: string;
  description: string;
};

export const PLATFORM_PERMISSION_CATALOG: PlatformPermissionDef[] = [
  {
    key: 'platform.overview:read',
    resource: 'platform.overview',
    action: 'read',
    label: 'View overview',
    group: 'Console',
    description: 'See platform home KPIs and navigation.',
  },
  {
    key: 'platform.tenants:read',
    resource: 'platform.tenants',
    action: 'read',
    label: 'View tenants',
    group: 'Tenants',
    description: 'List and open church tenants.',
  },
  {
    key: 'platform.tenants:write',
    resource: 'platform.tenants',
    action: 'write',
    label: 'Create & edit tenants',
    group: 'Tenants',
    description: 'Provision churches, modules, and settings.',
  },
  {
    key: 'platform.tenants:delete',
    resource: 'platform.tenants',
    action: 'delete',
    label: 'Deactivate tenants',
    group: 'Tenants',
    description: 'Soft-deactivate a church tenant.',
  },
  {
    key: 'platform.tenants:purge',
    resource: 'platform.tenants',
    action: 'purge',
    label: 'Permanently delete tenants',
    group: 'Tenants',
    description: 'Irreversible hard-delete of a tenant and all data.',
  },
  {
    key: 'platform.tenants.staff:write',
    resource: 'platform.tenants.staff',
    action: 'write',
    label: 'Manage tenant staff',
    group: 'Tenants',
    description: 'Change tenant staff emails and reset passwords.',
  },
  {
    key: 'platform.messaging:read',
    resource: 'platform.messaging',
    action: 'read',
    label: 'View messaging',
    group: 'Messaging',
    description: 'Open support inbox and broadcasts list.',
  },
  {
    key: 'platform.messaging:write',
    resource: 'platform.messaging',
    action: 'write',
    label: 'Send messaging',
    group: 'Messaging',
    description: 'Reply to support threads and send broadcasts.',
  },
  {
    key: 'platform.analytics:read',
    resource: 'platform.analytics',
    action: 'read',
    label: 'View analytics',
    group: 'Analytics',
    description: 'Access SaaS business analytics.',
  },
  {
    key: 'platform.marketing:read',
    resource: 'platform.marketing',
    action: 'read',
    label: 'View marketing',
    group: 'Marketing',
    description: 'View marketing templates and drips.',
  },
  {
    key: 'platform.marketing:write',
    resource: 'platform.marketing',
    action: 'write',
    label: 'Edit marketing',
    group: 'Marketing',
    description: 'Edit templates and marketing campaigns.',
  },
  {
    key: 'platform.wisdom365:read',
    resource: 'platform.wisdom365',
    action: 'read',
    label: 'View Wisdom365+',
    group: 'Wisdom365+',
    description: 'View Wisdom365+ content and subscriptions.',
  },
  {
    key: 'platform.wisdom365:write',
    resource: 'platform.wisdom365',
    action: 'write',
    label: 'Edit Wisdom365+',
    group: 'Wisdom365+',
    description: 'Manage Wisdom365+ content and variants.',
  },
  {
    key: 'platform.team:read',
    resource: 'platform.team',
    action: 'read',
    label: 'View platform team',
    group: 'Team',
    description: 'See platform staff and custom roles.',
  },
  {
    key: 'platform.team:write',
    resource: 'platform.team',
    action: 'write',
    label: 'Manage platform team',
    group: 'Team',
    description: 'Invite staff and create custom roles with permissions.',
  },
];

export const ALL_PLATFORM_PERMISSION_KEYS: PlatformPermissionKey[] =
  PLATFORM_PERMISSION_CATALOG.map((p) => p.key);

export function parsePermissionKey(key: string): { resource: string; action: string } | null {
  const idx = key.lastIndexOf(':');
  if (idx <= 0) return null;
  return { resource: key.slice(0, idx), action: key.slice(idx + 1) };
}

export function toPermissionKey(resource: string, action: string): string {
  return `${resource}:${action}`;
}
