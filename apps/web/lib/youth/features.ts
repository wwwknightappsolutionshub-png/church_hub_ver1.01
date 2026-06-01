import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Calendar,
  HandHeart,
  LayoutGrid,
  MessageCircle,
  MessageCircleQuestion,
  Trophy,
} from 'lucide-react';
import { YOUTH_ROUTES } from './routes';

export interface YouthFeatureLink {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  leaderOnly?: boolean;
  color: string;
}

export const YOUTH_FEATURES: YouthFeatureLink[] = [
  {
    key: 'feed',
    label: 'Feed',
    description: 'Posts, reactions, moderation',
    href: YOUTH_ROUTES.feed,
    icon: LayoutGrid,
    color: 'border-violet-200/50 bg-violet-50/20 dark:bg-violet-950/20',
  },
  {
    key: 'chat',
    label: 'Chat',
    description: 'Safe channels & DMs',
    href: YOUTH_ROUTES.chat,
    icon: MessageCircle,
    color: 'border-sky-200/50 bg-sky-50/20 dark:bg-sky-950/20',
  },
  {
    key: 'events',
    label: 'Events',
    description: 'RSVP & friends attending',
    href: YOUTH_ROUTES.events,
    icon: Calendar,
    color: 'border-amber-200/50 bg-amber-50/20 dark:bg-amber-950/20',
  },
  {
    key: 'qa',
    label: 'Q&A',
    description: 'Anonymous questions',
    href: YOUTH_ROUTES.qa,
    icon: MessageCircleQuestion,
    color: 'border-indigo-200/50 bg-indigo-50/20 dark:bg-indigo-950/20',
  },
  {
    key: 'prayer',
    label: 'Prayer',
    description: 'Tap-to-pray wall',
    href: YOUTH_ROUTES.prayer,
    icon: HandHeart,
    color: 'border-rose-200/50 bg-rose-50/20 dark:bg-rose-950/20',
  },
  {
    key: 'devotional',
    label: 'Devotional',
    description: 'Daily scripture & study',
    href: '/dashboard/devotional-hub',
    icon: BookOpen,
    color: 'border-emerald-200/50 bg-emerald-50/20 dark:bg-emerald-950/20',
  },
  {
    key: 'gamification',
    label: 'Points',
    description: 'XP, badges, challenges',
    href: YOUTH_ROUTES.gamification,
    icon: Trophy,
    color: 'border-violet-200/50 bg-violet-50/20 dark:bg-violet-950/20',
  },
];
