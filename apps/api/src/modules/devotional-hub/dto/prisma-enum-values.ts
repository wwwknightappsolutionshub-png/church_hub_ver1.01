/** String literals for class-validator @IsEnum — avoids undefined Prisma enums in production bundles. */
export const DEVOTIONAL_AUDIENCE = ['ALL', 'YOUTH', 'ADULT', 'FAMILY', 'LEADERS'] as const;
export const DEVOTIONAL_PLAN_SOURCE_TYPE = [
  'TOPICAL_BOOK',
  'BIBLE_BOOK',
  'CUSTOM_TOPIC',
  'PDF_IMPORT',
] as const;
export const DEVOTIONAL_PLAN_TONE = ['YOUTH', 'ADULT', 'FAMILY', 'NEW_BELIEVER'] as const;
export const DEVOTIONAL_REMINDER_CHANNEL = ['IN_APP', 'EMAIL', 'PUSH', 'ALARM'] as const;
export const DEVOTIONAL_REMINDER_FREQUENCY = ['HOURLY', 'DAILY'] as const;
export const DEVOTIONAL_JOURNAL_VISIBILITY = ['PRIVATE', 'GROUP'] as const;
export const DEVOTIONAL_PRAYER_LIST_SCOPE = ['PERSONAL', 'GROUP', 'PLAN_DAY'] as const;
export const DEVOTIONAL_GROUP_VISIBILITY = ['PRIVATE', 'FRIENDS_ONLY', 'INVITE_LINK'] as const;
export const DEVOTIONAL_MEETUP_RECURRENCE = ['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const;
