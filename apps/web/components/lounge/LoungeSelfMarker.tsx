'use client';

import { cn } from '@/lib/utils';
import { LoungeMemberFigure } from '@/components/lounge/LoungeMemberFigure';
import type { LoungeMember } from './LoungeCanvas';
import type { LoungeMotionMode } from '@/components/lounge/lounge-motion';

interface LoungeSelfMarkerProps {
  member: LoungeMember;
  motion?: LoungeMotionMode;
  connecting?: boolean;
  /** Gentle bump when close to another member on the floor. */
  near?: boolean;
}

/** Viewer-controlled marker on the floor. Position set imperatively for smooth glide. */
export function LoungeSelfMarker({ member, motion = 'static', connecting, near }: LoungeSelfMarkerProps) {
  return (
    <div
      className={cn(
        'pointer-events-none z-30 flex flex-col items-center',
        near && !connecting && 'lounge-near-shake',
      )}
    >
      <span
        className={cn(
          'lounge-self-pulse mb-1 block h-10 w-10 rounded-full border-2 border-amber-400/90 bg-amber-400/20',
          connecting && 'border-amber-300 bg-amber-300/30',
        )}
        aria-hidden
      />
      <LoungeMemberFigure member={member} motion={motion} />
      <span className="mt-1 rounded-full bg-slate-900/75 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-amber-100">
        You
      </span>
    </div>
  );
}
