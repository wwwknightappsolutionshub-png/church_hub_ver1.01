/** Canonical Next.js App Router paths for the Youth Community Module. */
export const YOUTH_ROUTES = {
  hub: '/dashboard/youth',
  feed: '/dashboard/youth/feed',
  chat: '/dashboard/youth/chat',
  events: '/dashboard/youth/events',
  clips: '/dashboard/youth/clips',
  gamification: '/dashboard/youth/gamification',
  qa: '/dashboard/youth/qa',
  prayer: '/dashboard/youth/prayer',
} as const;

export type YouthRouteKey = keyof typeof YOUTH_ROUTES;
