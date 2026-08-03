import { z } from 'zod';

export const MemberStatusSchema = z.enum([
  'VISITOR',
  'NEW_MEMBER',
  'ACTIVE_MEMBER',
  'DISCIPLED',
]);
export type MemberStatus = z.infer<typeof MemberStatusSchema>;

export const MemberRoleSchema = z.enum([
  'YOUTH',
  'ADULT',
  'LEADER',
  'DRIVER',
  'EVANGELIST',
  'ADMIN',
  'PASTOR',
]);
export type MemberRole = z.infer<typeof MemberRoleSchema>;

export const FollowUpStageSchema = z.enum([
  'NEW_LEAD',
  'CONTACTED',
  'VISITED',
  'ATTENDED',
  'JOINED_GROUP',
  'ENLISTED_FOR_BAPTISM',
]);
export type FollowUpStage = z.infer<typeof FollowUpStageSchema>;

export const RideStatusSchema = z.enum([
  'REQUESTED',
  'SCHEDULED',
  'IN_TRANSIT',
  'PICKED_UP',
  'DROPPED_OFF',
  'NO_SHOW',
  'CANCELLED',
]);
export type RideStatus = z.infer<typeof RideStatusSchema>;

export const SyncStatusSchema = z.enum([
  'PENDING',
  'SYNCING',
  'SYNCED',
  'CONFLICT',
  'FAILED',
]);
export type SyncStatus = z.infer<typeof SyncStatusSchema>;
