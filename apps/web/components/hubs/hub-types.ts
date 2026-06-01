import type { HubKind } from './hub-themes';

export type { HubKind };

export interface HubCardItem {
  id: string;
  title: string;
  description: string;
  excerpt: string;
  displayName: string | null;
  status: string;
  isOwn: boolean;
  createdAt: string;
  approvedAt?: string | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface HubListResponse {
  items: HubCardItem[];
  nextCursor: string | null;
}
