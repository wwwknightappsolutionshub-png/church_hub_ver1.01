/** Units that grant Establishment module entry (any mode). */
export const FOLLOW_UP_ACCESS_UNIT_NAMES = [
  'Follow-up',
  'Harvesters Squad',
  'Prayer Squad',
  'Winning Foundation School',
] as const;

/** Follow-up unit — Unit Leader is an Establishment manager. */
export const FOLLOW_UP_UNIT_NAME = 'Follow-up';

/** Evangelism outreach maps to Harvesters Squad in the service unit catalog. */
export const EVANGELISM_UNIT_NAME = 'Harvesters Squad';

/** Winning Foundation School (WFS) — worker unit (assigned-only edit). */
export const WFS_UNIT_NAME = 'Winning Foundation School';

/** Prayer Squad — Establishment view-only. */
export const PRAYER_UNIT_NAME = 'Prayer Squad';

/** Units whose members may edit assigned Establishment contacts. */
export const ESTABLISHMENT_WORKER_UNIT_NAMES = [
  FOLLOW_UP_UNIT_NAME,
  EVANGELISM_UNIT_NAME,
  WFS_UNIT_NAME,
] as const;

/** Units that grant Establishment managers when the member is Unit Admin / primary leader. */
export const ESTABLISHMENT_MANAGER_UNIT_NAMES = [
  FOLLOW_UP_UNIT_NAME,
  EVANGELISM_UNIT_NAME,
] as const;

/** Units that grant read-only Establishment (non-WSF). */
export const ESTABLISHMENT_VIEW_ONLY_UNIT_NAMES = [PRAYER_UNIT_NAME] as const;

export const CHURCH_STAFF_USER_ROLES = ['ADMIN', 'PASTOR'] as const;

/** Member profile roles that open Establishment; ADMIN/PASTOR act as managers, EVANGELIST as worker. */
export const FOLLOW_UP_MEMBER_ROLES = ['ADMIN', 'PASTOR', 'EVANGELIST'] as const;

export const ESTABLISHMENT_MANAGER_MEMBER_ROLES = ['ADMIN', 'PASTOR'] as const;

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
