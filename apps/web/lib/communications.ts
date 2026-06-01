import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookOpen,
  Inbox,
  LayoutDashboard,
  ListOrdered,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Mic,
  Radio,
} from 'lucide-react';

export interface CommTabDef {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
}

export interface CommTabGroup {
  id: string;
  label: string;
  tabs: CommTabDef[];
}

export const COMM_TAB_GROUPS: CommTabGroup[] = [
  {
    id: 'monitor',
    label: 'Monitor',
    tabs: [
      {
        id: 'overview',
        label: 'Overview',
        shortLabel: 'Overview',
        description: 'Stats and activity snapshot',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 'deliver',
    label: 'Deliver',
    tabs: [
      {
        id: 'queue',
        label: 'Notification Queue',
        shortLabel: 'Queue',
        description: 'Scheduled and pending sends',
        icon: ListOrdered,
      },
      {
        id: 'push',
        label: 'Push & Broadcasts',
        shortLabel: 'Push',
        description: 'Alerts and automations',
        icon: Radio,
      },
      {
        id: 'inbox',
        label: 'In-App Messages',
        shortLabel: 'In-app',
        description: 'Member notification inbox',
        icon: Inbox,
      },
    ],
  },
  {
    id: 'engage',
    label: 'Engage',
    tabs: [
      {
        id: 'conversations',
        label: 'Conversations',
        shortLabel: 'Chats',
        description: 'Direct and threaded messages',
        icon: MessagesSquare,
      },
      {
        id: 'channels',
        label: 'Group Chat',
        shortLabel: 'Groups',
        description: 'Moderated church channels',
        icon: MessageCircle,
      },
    ],
  },
  {
    id: 'publish',
    label: 'Publish',
    tabs: [
      {
        id: 'announcements',
        label: 'Announcements',
        shortLabel: 'News',
        description: 'Church-wide announcements',
        icon: Megaphone,
      },
      {
        id: 'sermons',
        label: 'Sermon Archive',
        shortLabel: 'Sermons',
        description: 'Audio and video library',
        icon: Mic,
      },
      {
        id: 'devotionals',
        label: 'Devotional Plans',
        shortLabel: 'Plans',
        description: 'Reading plans and devotionals',
        icon: BookOpen,
      },
    ],
  },
];

export const COMM_TABS = COMM_TAB_GROUPS.flatMap((g) =>
  g.tabs.map((t) => ({ id: t.id, label: t.label })),
);

export type CommTabId = (typeof COMM_TABS)[number]['id'];

export function findCommTabGroup(tabId: string) {
  return COMM_TAB_GROUPS.find((g) => g.tabs.some((t) => t.id === tabId)) ?? COMM_TAB_GROUPS[0];
}

export function findCommTab(tabId: string) {
  for (const group of COMM_TAB_GROUPS) {
    const tab = group.tabs.find((t) => t.id === tabId);
    if (tab) return tab;
  }
  return COMM_TAB_GROUPS[0].tabs[0];
}

export const ANNOUNCEMENT_CATEGORIES = [
  'General',
  'Events',
  'Ministry',
  'Giving',
  'Prayer',
  'Urgent',
] as const;

/** Tab ids that may show an unread badge */
export const COMM_TAB_BADGE_KEYS: Partial<Record<CommTabId, 'unreadInApp' | 'queuePending'>> = {
  inbox: 'unreadInApp',
  queue: 'queuePending',
};

export { Bell };
