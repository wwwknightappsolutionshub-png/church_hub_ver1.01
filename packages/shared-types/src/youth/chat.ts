/** Youth Chat — API contracts (Phase 4) */

export type ChatMessageType = 'TEXT' | 'IMAGE' | 'GIF' | 'SYSTEM';
export type YouthChatReactionType = 'LIKE' | 'LOVE' | 'AMEN' | 'FIRE' | 'SAVE';

export interface YouthChatSender {
  id: string;
  firstName: string;
  lastName: string;
}

export interface YouthChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  messageType: ChatMessageType;
  attachmentUrl?: string | null;
  replyToId?: string | null;
  isPinned: boolean;
  isHidden: boolean;
  isFlagged: boolean;
  flagReason?: string | null;
  createdAt: string;
  sender: YouthChatSender;
  replyTo?: {
    id: string;
    content: string;
    sender: { firstName: string; lastName: string };
  } | null;
  reactionSummary: Partial<Record<YouthChatReactionType, number>>;
  myReactions: YouthChatReactionType[];
  readCount?: number;
}

export interface YouthChatChannel {
  id: string;
  name: string;
  description?: string | null;
  isModerated: boolean;
  youthGroup?: { id: string; name: string } | null;
  _count?: { messages: number; members: number };
}

export interface YouthDmThread {
  threadKey: string;
  peerMemberId: string;
  peer: { id: string; firstName: string; lastName: string; userId?: string | null };
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderMemberId: string;
    readAt?: string | null;
  };
  unread: boolean;
}

export interface YouthDirectMessage {
  id: string;
  content: string;
  createdAt: string;
  readAt?: string | null;
  sender: { id: string; firstName: string; lastName: string };
  recipient: { id: string; firstName: string; lastName: string };
  attachmentUrl?: string;
}
