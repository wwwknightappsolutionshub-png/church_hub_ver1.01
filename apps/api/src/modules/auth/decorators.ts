import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/** Platform operator permission (resource:action). PLATFORM_ADMIN bypasses. */
export const PLATFORM_PERMISSION_KEY = 'platformPermission';
export const RequirePlatformPermission = (
  ...permissions: import('../platform/platform-permissions.catalog').PlatformPermissionKey[]
) => SetMetadata(PLATFORM_PERMISSION_KEY, permissions.length === 1 ? permissions[0] : permissions);

/** Requires church staff (ADMIN/PASTOR UserRole) or Member profile with ADMIN role. */
export const MEMBER_ADMIN_KEY = 'memberAdmin';
export const MemberAdmin = () => SetMetadata(MEMBER_ADMIN_KEY, true);

/** Requires follow-up module access (staff, unit membership, or discipleship roles). */
export const FOLLOW_UP_ACCESS_KEY = 'followUpAccess';
export const FollowUpAccess = () => SetMetadata(FOLLOW_UP_ACCESS_KEY, true);

export type ModuleGateType =
  | 'followUp'
  | 'serviceUnitHub'
  | 'profile'
  | 'busMinistry'
  | 'youth'
  | 'communications'
  | 'communityHub';

export const BUS_DRIVER_KEY = 'busDriver';
/** Restrict route to users with an active DriverProfile (or church staff). */
export const BusDriver = () => SetMetadata(BUS_DRIVER_KEY, true);

export const MODULE_GATE_KEY = 'moduleGate';
/** Gate module by membership type (see ModuleAccessService). */
export const ModuleGate = (gate: ModuleGateType) => SetMetadata(MODULE_GATE_KEY, gate);
