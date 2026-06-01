/** Youth Prayer Wall — API contracts (Phase 9) */

export type YouthPrayerCategory =
  | 'HEALTH'
  | 'FAMILY'
  | 'SCHOOL'
  | 'GUIDANCE'
  | 'THANKSGIVING'
  | 'OTHER';

export interface YouthPrayerEncouragement {
  id: string;
  body: string;
  createdAt: string;
  author: { firstName: string; lastName: string };
}

export interface YouthPrayerRequestDto {
  id: string;
  category: YouthPrayerCategory;
  content: string;
  isAnonymous: boolean;
  displayName: string;
  prayCount: number;
  encouragementCount: number;
  allowComments: boolean;
  status: string;
  isOwner?: boolean;
  hasPrayed: boolean;
  createdAt: string;
  updatedAt: string;
  encouragements?: YouthPrayerEncouragement[];
}

export interface YouthPrayerNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  sentAt: string;
  data?: { prayerId?: string; kind?: string };
}
