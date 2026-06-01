/** Youth Anonymous Q&A — API contracts (Phase 8) */

export type YouthQuestionCategory =
  | 'FAITH'
  | 'LIFE'
  | 'RELATIONSHIPS'
  | 'SCHOOL'
  | 'OTHER';

export type YouthQuestionStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'ANSWERED'
  | 'PUBLIC'
  | 'HIDDEN';

export interface YouthQaAnswer {
  id: string;
  body: string;
  isPublic: boolean;
  createdAt: string;
  author: { id?: string; firstName: string; lastName: string };
}

export interface YouthQuestionDto {
  id: string;
  category: YouthQuestionCategory;
  question: string;
  status: YouthQuestionStatus;
  isAnonymous: boolean;
  alias: string;
  isPublicAnswer: boolean;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
  isOwner?: boolean;
  canReply?: boolean;
  answers: YouthQaAnswer[];
  publicAnswer: { body: string; createdAt: string } | null;
  privateReplyCount?: number;
  moderationFlag?: string;
  moderationWarning?: string;
}
