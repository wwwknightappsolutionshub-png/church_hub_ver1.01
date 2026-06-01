/** Youth Events — API contracts (Phase 5) */

export type YouthRsvpStatus = 'GOING' | 'INTERESTED' | 'NOT_GOING';
export type YouthRsvpVisibility = 'PUBLIC' | 'PRIVATE';

export interface YouthEventAttendee {
  memberId: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  status: YouthRsvpStatus;
  isFriend?: boolean;
}

export interface YouthEventSummary {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  coverImageUrl?: string | null;
  startsAt: string;
  endsAt?: string | null;
  maxAttendees?: number | null;
  youthGroup?: { id: string; name: string } | null;
  goingCount: number;
  interestedCount: number;
  checkedInCount: number;
  spotsLeft: number | null;
  myRsvp: { status: YouthRsvpStatus; visibility: YouthRsvpVisibility } | null;
  friendsAttending: YouthEventAttendee[];
  friendsAttendingCount: number;
}

export interface YouthEventDetail extends YouthEventSummary {
  rsvps: YouthEventAttendee[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateYouthEventInput {
  title: string;
  description?: string;
  location?: string;
  coverImageUrl?: string;
  startsAt: string;
  endsAt?: string;
  youthGroupId?: string;
  maxAttendees?: number;
}
