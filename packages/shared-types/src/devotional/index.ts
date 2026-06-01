export type DevotionalAudience = 'ALL' | 'YOUTH' | 'ADULT' | 'FAMILY' | 'LEADERS';

export type DevotionalPlanStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type DevotionalPlanSourceType =
  | 'TOPICAL_BOOK'
  | 'BIBLE_BOOK'
  | 'CUSTOM_TOPIC'
  | 'PDF_IMPORT';

export type DevotionalPlanTone = 'YOUTH' | 'ADULT' | 'FAMILY' | 'NEW_BELIEVER';

export interface DevotionalPlanDayDto {
  id: string;
  dayNumber: number;
  title: string;
  scriptureRef?: string | null;
  scriptureText?: string | null;
  reflection?: string | null;
  prayerPrompt?: string | null;
  actionPoint?: string | null;
}

export interface DevotionalPlanOutlineVersionDto {
  id: string;
  planId: string;
  version: number;
  tone?: DevotionalPlanTone | null;
  sourceLabel?: string | null;
  createdAt: string;
}

export interface DevotionalPlanDto {
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  audience: DevotionalAudience;
  isActive: boolean;
  status?: DevotionalPlanStatus;
  sourceType?: DevotionalPlanSourceType | null;
  sourceLabel?: string | null;
  topicalBook?: string | null;
  bibleBook?: string | null;
  customTopic?: string | null;
  tone?: DevotionalPlanTone | null;
  durationDays?: number | null;
  durationWeeks?: number | null;
  coverImageUrl?: string | null;
  outlineVersion?: number;
  dayCount?: number;
  days?: DevotionalPlanDayDto[];
  outlineVersions?: DevotionalPlanOutlineVersionDto[];
}

export interface DevotionalTodayDto {
  planId: string;
  planTitle: string;
  dayNumber: number;
  day: DevotionalPlanDayDto;
}

export interface UpsertDevotionalPlanDraftInput {
  planId?: string;
  title: string;
  description?: string;
  startDate?: string;
  sourceType?: DevotionalPlanSourceType;
  sourceLabel?: string;
  topicalBook?: string;
  bibleBook?: string;
  customTopic?: string;
  tone?: DevotionalPlanTone;
  audience?: DevotionalAudience;
  coverImageUrl?: string;
  durationDays?: number;
  durationWeeks?: number;
  pdfImportId?: string;
  generateOutline?: boolean;
  days?: Omit<DevotionalPlanDayDto, 'id'>[];
}

export type DevotionalReminderChannel = 'IN_APP' | 'EMAIL' | 'PUSH' | 'ALARM';
export type DevotionalReminderFrequency = 'HOURLY' | 'DAILY';
export type DevotionalReminderDeliveryStatus =
  | 'PENDING'
  | 'SNOOZED'
  | 'DELIVERED'
  | 'DONE'
  | 'DISMISSED';

export interface DevotionalReminderPreferenceDto {
  id: string;
  timezone: string;
  quietStartHour: number;
  quietEndHour: number;
  syncVersion: number;
}

export interface DevotionalReminderDto {
  id: string;
  planId: string | null;
  channel: DevotionalReminderChannel;
  frequency: DevotionalReminderFrequency;
  hourLocal: number;
  minuteLocal: number;
  timezone: string;
  isEnabled: boolean;
  snoozedUntil?: string | null;
  plan?: { id: string; title: string } | null;
}

export interface DevotionalReminderDeliveryDto {
  id: string;
  reminderId: string;
  planId: string | null;
  planTitle: string | null;
  dayNumber: number | null;
  channel: DevotionalReminderChannel;
  frequency: DevotionalReminderFrequency;
  status: DevotionalReminderDeliveryStatus;
  title: string;
  body: string;
  snoozedUntil: string | null;
  firedAt: string;
}

export interface DevotionalReminderSyncDto {
  serverTime: string;
  syncVersion: number;
  preferences: DevotionalReminderPreferenceDto;
  reminders: DevotionalReminderDto[];
  pendingDeliveries: DevotionalReminderDeliveryDto[];
  snoozePresets: number[];
}

export type DevotionalGroupVisibility = 'PRIVATE' | 'FRIENDS_ONLY' | 'INVITE_LINK';
export type DevotionalGroupMemberRole = 'ADMIN' | 'CO_ADMIN' | 'MEMBER';
export type DevotionalGroupMemberStatus = 'PENDING' | 'ACTIVE' | 'DECLINED';

export interface DevotionalGroupSummaryDto {
  id: string;
  name: string;
  description?: string | null;
  profileImageUrl?: string | null;
  visibility: DevotionalGroupVisibility;
  inviteToken?: string | null;
  inviteExpiresAt?: string | null;
  plan?: { id: string; title: string } | null;
  _count?: { members: number };
  myMembership?: { role: DevotionalGroupMemberRole; status: DevotionalGroupMemberStatus };
}

export interface DevotionalGroupListDto {
  myGroups: DevotionalGroupSummaryDto[];
  discoverable: DevotionalGroupSummaryDto[];
  pendingInvites: Array<{
    id: string;
    group: { id: string; name: string; profileImageUrl?: string | null };
    expiresAt?: string | null;
  }>;
}

export interface DevotionalGroupTimelineItemDto {
  id: string;
  type: 'discussion' | 'journal' | 'meetup' | 'prayer' | string;
  title: string;
  body?: string;
  at: string;
  meta?: Record<string, unknown>;
}

export interface DevotionalHubContext {
  userId: string;
  churchId: string;
  memberId: string | null;
  isLeader: boolean;
  canCreatePlans: boolean;
  integrations: {
    plans: boolean;
    groups: boolean;
    journals: boolean;
    prayerLists: boolean;
    reminders: boolean;
    ai: boolean;
    pdf: boolean;
    meetups: boolean;
    discussions: boolean;
  };
}

export type DevotionalScriptureDepth = 'SIMPLE' | 'YOUTH' | 'ADULT_THEOLOGICAL';
export type DevotionalPrayerPointSource = 'SCRIPTURE' | 'TOPIC' | 'PDF' | 'DAILY_SECTION';
export type DevotionalPdfReadingLevel =
  | 'KIDS_8_12'
  | 'TEENS'
  | 'YOUTH'
  | 'ADULTS'
  | 'NEW_BELIEVER';

export interface DevotionalStudyOutlineDto {
  sourceLabel: string;
  summary: string;
  breakdown: Array<{
    dayNumber: number;
    title: string;
    scriptureRef?: string | null;
    focus: string;
  }>;
  studyQuestions: string[];
  applicationPoints: string[];
  days: DevotionalPlanDayDto[];
  artifactId: string;
}

export interface DevotionalPrayerPointsDto {
  source: DevotionalPrayerPointSource;
  title: string;
  points: Array<{ category: string; text: string }>;
  closing: string;
  context?: string;
  artifactId: string;
}

export interface DevotionalScriptureAnswerDto {
  question: string;
  passage: string | null;
  depth: DevotionalScriptureDepth;
  answer: string;
  insights: string[];
  reflectionPrompt: string;
  references: string[];
  artifactId: string;
}

export interface DevotionalPdfSimplifiedDto {
  readingLevel: DevotionalPdfReadingLevel;
  simplified: string;
  originalLength: number;
  artifactId: string;
}

export type DevotionalAiArtifactType =
  | 'STUDY_OUTLINE'
  | 'PRAYER_POINTS'
  | 'SCRIPTURE_ASK'
  | 'SIMPLIFIED_YOUTH'
  | 'SIMPLIFIED_CHILD'
  | 'SIMPLIFIED_TEEN'
  | 'SIMPLIFIED_ADULT'
  | 'SIMPLIFIED_NEW_BELIEVER'
  | 'DISCUSSION_SUMMARY';

export interface DevotionalAiArtifactDto {
  id: string;
  type: DevotionalAiArtifactType;
  prompt: string | null;
  content: unknown;
  planId: string | null;
  dayId: string | null;
  pdfImportId: string | null;
  createdAt: string;
}

export type DevotionalJournalVisibility = 'PRIVATE' | 'GROUP';

export interface DevotionalJournalScriptureRef {
  reference: string;
  text?: string;
}

export interface DevotionalJournalAttachment {
  url: string;
  caption?: string;
}

export interface DevotionalJournalRecapPrompt {
  id: string;
  text: string;
}

export interface DevotionalJournalCommentDto {
  id: string;
  memberId: string;
  authorName: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  replies: DevotionalJournalCommentDto[];
}

export interface DevotionalJournalReactionSummary {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface DevotionalJournalSummaryDto {
  id: string;
  title?: string | null;
  preview: string;
  moods: string[];
  visibility?: DevotionalJournalVisibility;
  authorName?: string;
  isPinned?: boolean;
  createdAt: string;
  reactionCount: number;
}

export interface DevotionalJournalEntryDto {
  id: string;
  memberId: string;
  authorName: string;
  planId?: string | null;
  dayId?: string | null;
  groupId?: string | null;
  visibility: DevotionalJournalVisibility;
  title?: string | null;
  body: string;
  contentFormat: string;
  moods: string[];
  scriptureRefs: DevotionalJournalScriptureRef[];
  attachments: DevotionalJournalAttachment[];
  voiceNoteUrl?: string | null;
  voiceTranscript?: string | null;
  recapPromptId?: string | null;
  recapPrompt?: string | null;
  isPinned: boolean;
  pinnedAt?: string | null;
  pinnedByName?: string | null;
  lastEditedByName?: string | null;
  shareToken?: string | null;
  group?: { id: string; name: string } | null;
  plan?: { id: string; title: string } | null;
  day?: { id: string; dayNumber: number; title: string } | null;
  reactions: DevotionalJournalReactionSummary[];
  comments: DevotionalJournalCommentDto[];
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
}

export type DevotionalMeetupRsvpStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';
export type DevotionalMeetupStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
export type DevotionalMeetupRecurrence = 'NONE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export interface DevotionalMeetupRsvpMemberDto {
  memberId: string;
  name: string;
}

export interface DevotionalMeetupDto {
  id: string;
  groupId: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  onlineLink?: string | null;
  locationType?: string | null;
  startsAt: string;
  endsAt?: string | null;
  recurrence: DevotionalMeetupRecurrence;
  status: DevotionalMeetupStatus;
  reminderOffsetsMinutes: number[];
  myRsvpStatus: DevotionalMeetupRsvpStatus | null;
  rsvp: {
    attending: DevotionalMeetupRsvpMemberDto[];
    pending: DevotionalMeetupRsvpMemberDto[];
    declined: DevotionalMeetupRsvpMemberDto[];
  };
  needsFollowUp?: boolean;
  postEventSummary?: string | null;
  postEventPrayerPoints?: string | null;
  postEventActionSteps?: string | null;
  postEventProgressNote?: string | null;
  host?: { id: string; name: string } | null;
  group?: { id: string; name: string } | null;
}

export type DevotionalActionPointStatus = 'PENDING' | 'COMPLETED' | 'SKIPPED';
export type DevotionalChallengeScope = 'INDIVIDUAL' | 'GROUP' | 'CHURCH';

export interface DevotionalActionPointDto {
  id: string;
  title: string;
  notes?: string | null;
  planId?: string | null;
  dayId?: string | null;
  groupId?: string | null;
  challengeId?: string | null;
  dueAt?: string | null;
  weekKey?: string | null;
  status: DevotionalActionPointStatus;
  completedAt?: string | null;
  skippedAt?: string | null;
  remindersEnabled: boolean;
  reminderFrequency?: 'HOURLY' | 'DAILY' | null;
  reminderChannels: string[];
  reminderHourLocal: number;
  reminderMinuteLocal: number;
  reminderTimezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface DevotionalWeeklyReviewDto {
  weekKey: string;
  range?: { start: string; end: string };
  completed: Array<{ id: string; title: string; completedAt?: string }>;
  skipped: Array<{ id: string; title: string; skippedAt?: string }>;
  pending: Array<{ id: string; title: string; dueAt?: string | null }>;
  planProgress: Array<{
    planId: string;
    planTitle: string;
    lastDay: number;
    streakDays: number;
    lastReadAt: string;
  }>;
  suggestedAdjustments: string[];
  stats: {
    completedCount: number;
    skippedCount: number;
    pendingCount: number;
    planDaysCompleted?: number;
    maxStreak?: number;
  };
}

export type DevotionalPrayerListScope = 'PERSONAL' | 'GROUP' | 'PLAN_DAY';

export interface DevotionalPrayerListItemDto {
  id: string;
  body: string;
  dayId?: string | null;
  isAnswered: boolean;
  answeredAt?: string | null;
  aiBooster?: DevotionalPrayerPointsDto | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DevotionalPrayerListDto {
  id: string;
  title: string;
  scope: DevotionalPrayerListScope;
  groupId?: string | null;
  planId?: string | null;
  group?: { id: string; name: string } | null;
  authorName?: string | null;
  isOwner: boolean;
  openCount: number;
  itemCount: number;
  items: DevotionalPrayerListItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface DevotionalPrayerStreakDto {
  streakDays: number;
  longestStreak: number;
  lastPrayedOn: string | null;
  prayedToday: boolean;
}

export interface DevotionalPrayerWeeklyDigestDto {
  weekKey: string;
  range: { start: string; end: string };
  streak: DevotionalPrayerStreakDto;
  prayedDaysThisWeek: number;
  answered: Array<{ id: string; body: string; listTitle: string; answeredAt?: string }>;
  added: Array<{ id: string; body: string; listTitle: string; createdAt: string }>;
  openCount: number;
  summary: string;
}

export interface DevotionalChallengeDto {
  id: string;
  title: string;
  description?: string | null;
  scope: DevotionalChallengeScope;
  group?: { id: string; name: string } | null;
  startsAt: string;
  endsAt: string;
  targetCount?: number | null;
  participantCount: number;
  joined: boolean;
  progressCount?: number;
  percentComplete?: number | null;
}

export interface DevotionalChallengeMilestoneDto {
  id: string;
  threshold: number;
  badgeKey: string;
  title: string;
  description?: string | null;
  earned: boolean;
  earnedAt?: string | null;
}

export interface DevotionalChallengeDetailDto extends DevotionalChallengeDto {
  milestones: DevotionalChallengeMilestoneDto[];
  badges: Array<{ milestoneId: string; badgeKey: string; title: string; earnedAt: string }>;
}

export interface DevotionalChallengeWeeklyProgressDto {
  weekKey: string;
  range: { start: string; end: string };
  badgesEarnedThisWeek: number;
  challenges: Array<{
    challengeId: string;
    title: string;
    scope: DevotionalChallengeScope;
    progressThisWeek: number;
    totalProgress: number;
    targetCount: number | null;
    percentComplete: number | null;
  }>;
}

export interface DevotionalChallengeBadgeDto {
  challengeId: string;
  challengeTitle: string;
  scope: DevotionalChallengeScope;
  badgeKey: string;
  title: string;
  earnedAt: string;
}

export interface DevotionalChallengeLeaderboardDto {
  challengeId: string;
  title: string;
  scope: DevotionalChallengeScope;
  optional?: boolean;
  entries: Array<{
    rank?: number;
    memberId: string;
    name: string;
    progressCount: number;
  }>;
}

export interface DevotionalMeetupCalendarDto {
  year: number;
  month: number;
  days: Array<{ date: string; meetup: DevotionalMeetupDto }>;
}

export interface DevotionalJournalShareDto {
  shareToken: string;
  shareExpiresAt: string;
  path: string;
}

export interface DevotionalPdfImportDto {
  id: string;
  fileName: string;
  fileUrl: string;
  status: string;
  pageCount?: number | null;
  chunkCount?: number | null;
  metadata?: {
    pages?: Array<{ pageNumber: number; text: string }>;
    devotionalDays?: DevotionalPlanDayDto[];
    simplifications?: Record<string, DevotionalPdfSimplifiedDto>;
  };
  plan?: { id: string; title: string } | null;
}
