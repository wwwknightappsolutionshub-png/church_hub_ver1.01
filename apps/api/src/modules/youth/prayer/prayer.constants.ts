import { YouthPrayerCategory } from '@prisma/client';

export const PRAYER_CATEGORY_LABELS: Record<YouthPrayerCategory, string> = {
  HEALTH: 'Health',
  FAMILY: 'Family',
  SCHOOL: 'School',
  GUIDANCE: 'Guidance',
  THANKSGIVING: 'Thanksgiving',
  OTHER: 'Other',
};

export const PRAYER_NOTIFICATION_TYPE = 'YOUTH_PRAYER' as const;
