export type HubKind = 'prayer' | 'praise';

export const HUB_THEMES: Record<
  HubKind,
  {
    gradient: string;
    accent: string;
    accentText: string;
    ring: string;
    iconBg: string;
    cta: string;
  }
> = {
  prayer: {
    gradient:
      'from-rose-500/15 via-fuchsia-500/10 to-violet-500/15 dark:from-rose-600/25 dark:via-fuchsia-600/15 dark:to-violet-600/20',
    accent: 'bg-rose-500',
    accentText: 'text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-500/30',
    iconBg: 'bg-rose-500/15 text-rose-600',
    cta: 'shadow-rose-500/25',
  },
  praise: {
    gradient:
      'from-amber-400/20 via-orange-400/10 to-yellow-500/15 dark:from-amber-500/25 dark:via-orange-500/15 dark:to-yellow-500/20',
    accent: 'bg-amber-500',
    accentText: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500/30',
    iconBg: 'bg-amber-500/15 text-amber-600',
    cta: 'shadow-amber-500/25',
  },
};
