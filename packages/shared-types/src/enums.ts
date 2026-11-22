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

/** Pipeline stage key — validated against the church's resolved pipeline at the API layer. */
export const FollowUpStageSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z][A-Za-z0-9_]*$/, 'Invalid pipeline stage key');
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
