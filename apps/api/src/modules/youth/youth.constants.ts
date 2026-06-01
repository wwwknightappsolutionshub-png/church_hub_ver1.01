/** Base keyword filter — always on for youth-generated content */
export const MODERATION_KEYWORDS = [
  'spam',
  'hate',
  'abuse',
  'violence',
  'bully',
  'kill',
  'drug',
  'suicide',
  'weapon',
];

/** Youth-safe mode: block sharing contact info and external links */
export const YOUTH_SAFE_STRICT_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'phone number', regex: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/ },
  { label: 'email address', regex: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
  { label: 'external link', regex: /https?:\/\/|www\./i },
];

/** Church user roles with full Youth Hub management access */
export const YOUTH_HUB_LEADER_ROLES = [
  'ADMIN',
  'PASTOR',
  'LEADER',
  'YOUTH_ADMIN',
] as const;

/** @deprecated Use YOUTH_HUB_LEADER_ROLES */
export const LEADER_ROLE_NAMES = YOUTH_HUB_LEADER_ROLES;

/** Who may grant or revoke the YOUTH_ADMIN role */
export const YOUTH_ADMIN_ASSIGNER_ROLES = ['ADMIN', 'PASTOR'] as const;

export const DEFAULT_YOUTH_BADGES = [
  { name: 'First Event', description: 'Attended first youth event', pointsRequired: 25 },
  { name: 'Faithful Attender', description: '3-week attendance streak', pointsRequired: 75 },
  { name: 'Community Builder', description: 'Active in group chat', pointsRequired: 50 },
  { name: 'Help Hero', description: 'Supported a peer through Help Zone', pointsRequired: 100 },
];

export const POINTS = {
  RSVP: 10,
  ATTENDANCE: 25,
  CHAT_MESSAGE: 2,
  RESOURCE_VIEW: 5,
  HELP_RESOLVED: 15,
};
