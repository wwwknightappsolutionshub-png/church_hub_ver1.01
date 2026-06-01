'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { DevotionalHubTabId } from '@/lib/devotional-hub';
import { Skeleton } from '@/components/ui/skeleton';

function panelSkeleton() {
  return (
    <div className="space-y-4 p-2" aria-hidden>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export const DevotionalRemindersPanel = dynamic(
  () =>
    import('@/components/devotional-hub/DevotionalRemindersPanel').then((m) => m.DevotionalRemindersPanel),
  { loading: panelSkeleton },
);

export const DevotionalGroupsPanel = dynamic(
  () => import('@/components/devotional-hub/DevotionalGroupsPanel').then((m) => m.DevotionalGroupsPanel),
  { loading: panelSkeleton },
);

export const DevotionalAiToolsPanel = dynamic(
  () => import('@/components/devotional-hub/DevotionalAiToolsPanel').then((m) => m.DevotionalAiToolsPanel),
  { loading: panelSkeleton },
);

export const DevotionalJournalsPanel = dynamic(
  () => import('@/components/devotional-hub/DevotionalJournalsPanel').then((m) => m.DevotionalJournalsPanel),
  { loading: panelSkeleton },
);

export const DevotionalActionPointsPanel = dynamic(
  () =>
    import('@/components/devotional-hub/DevotionalActionPointsPanel').then((m) => m.DevotionalActionPointsPanel),
  { loading: panelSkeleton },
);

export const DevotionalWeeklyReviewPanel = dynamic(
  () =>
    import('@/components/devotional-hub/DevotionalWeeklyReviewPanel').then((m) => m.DevotionalWeeklyReviewPanel),
  { loading: panelSkeleton },
);

export const DevotionalPrayerPanel = dynamic(
  () => import('@/components/devotional-hub/DevotionalPrayerPanel').then((m) => m.DevotionalPrayerPanel),
  { loading: panelSkeleton },
);

export const DevotionalChallengesPanel = dynamic(
  () => import('@/components/devotional-hub/DevotionalChallengesPanel').then((m) => m.DevotionalChallengesPanel),
  { loading: panelSkeleton },
);

/** Tabs loaded on first visit — keeps switches instant after mount */
export const LAZY_DEVOTIONAL_TAB_PANELS: DevotionalHubTabId[] = [
  'reminders',
  'groups',
  'study',
  'actions',
  'review',
  'journal',
  'prayer',
  'challenges',
];
