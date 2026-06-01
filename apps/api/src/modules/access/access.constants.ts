/** Units that grant automatic access to Follow-Up & Discipleship. */
export const FOLLOW_UP_ACCESS_UNIT_NAMES = [
  'Follow-up',
  'Harvesters Squad',
  'Prayer Squad',
  'Winning Foundation School',
] as const;

/** Evangelism outreach maps to Harvesters Squad in the service unit catalog. */
export const EVANGELISM_UNIT_NAME = 'Harvesters Squad';

export const CHURCH_STAFF_USER_ROLES = ['ADMIN', 'PASTOR'] as const;

export const FOLLOW_UP_MEMBER_ROLES = ['ADMIN', 'PASTOR', 'EVANGELIST'] as const;

/** Member lifecycle statuses that unlock My Profile */
export const PROFILE_ACCESS_STATUSES = ['NEW_MEMBER', 'ACTIVE_MEMBER', 'DISCIPLED'] as const;

/** Member roles that unlock My Profile even when status is still NEW_MEMBER */
export const PROFILE_ACCESS_ROLES = ['LEADER', 'ADMIN', 'PASTOR', 'EVANGELIST', 'DRIVER'] as const;

/** Statuses allowed to open the Service Unit Hub (browse & request to join) */
export const SERVICE_UNIT_HUB_STATUSES = ['NEW_MEMBER', 'ACTIVE_MEMBER', 'DISCIPLED'] as const;

/** Member roles that may operate bus driver endpoints */
export const BUS_DRIVER_MEMBER_ROLES = ['DRIVER', 'LEADER', 'ADMIN'] as const;

/** Member roles that unlock Youth Hub reads */
export const YOUTH_MEMBER_ROLES = ['YOUTH'] as const;

/** Statuses that unlock community hub & communications member reads */
export const COMMUNITY_MEMBER_STATUSES = ['NEW_MEMBER', 'ACTIVE_MEMBER', 'DISCIPLED'] as const;
