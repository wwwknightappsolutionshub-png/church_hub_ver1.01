/** Youth Community Feed — API contracts (Phase 3) */

export type YouthPostStatus = 'PUBLISHED' | 'HIDDEN' | 'FLAGGED' | 'REMOVED';
export type YouthReactionType = 'LIKE' | 'LOVE' | 'AMEN' | 'FIRE' | 'SAVE';
export type YouthMediaKind = 'IMAGE' | 'VIDEO' | 'GIF';
export type FeedSortMode = 'recent' | 'top';
export type ContentReportStatus = 'OPEN' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED';

export interface YouthFeedAuthor {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

export interface YouthFeedMediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  mimeType?: string | null;
  kind: YouthMediaKind;
  sortOrder: number;
  width?: number | null;
  height?: number | null;
}

export interface YouthFeedPost {
  id: string;
  content: string;
  hashtags: string[];
  status: YouthPostStatus;
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  engagementScore: number;
  isYouthOnly: boolean;
  youthGroupId?: string | null;
  createdAt: string;
  updatedAt: string;
  author: YouthFeedAuthor;
  youthGroup?: { id: string; name: string } | null;
  media: YouthFeedMediaItem[];
  reactionSummary: Partial<Record<YouthReactionType, number>>;
  myReactions: YouthReactionType[];
}

export interface YouthFeedPage {
  items: YouthFeedPost[];
  nextCursor: string | null;
}

export interface YouthFeedComment {
  id: string;
  postId: string;
  parentId?: string | null;
  content: string;
  reactionCount: number;
  createdAt: string;
  author: YouthFeedAuthor;
  reactionSummary: Partial<Record<YouthReactionType, number>>;
  myReactions: YouthReactionType[];
  replies?: YouthFeedComment[];
}

export interface CreateYouthPostInput {
  content: string;
  youthGroupId?: string;
  isYouthOnly?: boolean;
  media?: Array<{
    url: string;
    thumbnailUrl?: string;
    mimeType?: string;
    kind?: YouthMediaKind;
    sortOrder?: number;
    width?: number;
    height?: number;
  }>;
}

export interface RegisterYouthMediaInput {
  url: string;
  thumbnailUrl?: string;
  mimeType?: string;
  kind?: YouthMediaKind;
  width?: number;
  height?: number;
}

export interface YouthContentReportItem {
  id: string;
  reason: string;
  status: ContentReportStatus;
  createdAt: string;
  reporter: YouthFeedAuthor;
  post?: { id: string; content: string; status: YouthPostStatus } | null;
}
