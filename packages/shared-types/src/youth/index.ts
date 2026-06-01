/**
 * Youth Community shared contracts (Phase 1 stubs).
 * Phase 2: align with Prisma models and API DTOs.
 */

export const YOUTH_MODULE_VERSION = 1 as const;

/** Seven feature keys for routing and telemetry */
export type YouthFeatureKey =
  | 'feed'
  | 'chat'
  | 'events'
  | 'clips'
  | 'gamification'
  | 'qa'
  | 'prayer'
  | 'devotional';

export const YOUTH_FEATURE_KEYS: readonly YouthFeatureKey[] = [
  'feed',
  'chat',
  'events',
  'clips',
  'gamification',
  'qa',
  'prayer',
  'devotional',
] as const;

export * from './feed';
export * from './chat';
export * from './events';
export * from './gamification';
export * from './qa';
export * from './prayer';
export * from './context';
