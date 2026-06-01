'use client';

import { cn } from '@/lib/utils';

/** Flashing availability beacon above a member's head (others only). */
export function LoungePresenceBeacon({ available }: { available: boolean }) {
  return (
    <span
      className={cn(
        'absolute left-1/2 top-[2px] z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-full rounded-full border border-white/90 shadow-sm',
        available ? 'lounge-presence-green' : 'lounge-presence-orange',
      )}
      aria-hidden
    />
  );
}
