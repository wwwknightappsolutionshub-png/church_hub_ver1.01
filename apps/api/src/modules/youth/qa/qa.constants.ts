import { YouthQuestionCategory, YouthQuestionStatus } from '@prisma/client';

export const QA_CATEGORY_LABELS: Record<YouthQuestionCategory, string> = {
  FAITH: 'Faith & Bible',
  LIFE: 'Life & purpose',
  RELATIONSHIPS: 'Relationships',
  SCHOOL: 'School & stress',
  OTHER: 'Other',
};

export const QA_STATUS_LABELS: Record<YouthQuestionStatus, string> = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  ANSWERED: 'Answered',
  PUBLIC: 'Published',
  HIDDEN: 'Hidden',
};

/** Statuses visible on the public answers board */
export const QA_PUBLIC_BOARD_STATUSES: YouthQuestionStatus[] = ['PUBLIC'];

/** Leader queue excludes hidden unless filtering */
export const QA_QUEUE_STATUSES: YouthQuestionStatus[] = [
  'OPEN',
  'ASSIGNED',
  'ANSWERED',
  'PUBLIC',
];
