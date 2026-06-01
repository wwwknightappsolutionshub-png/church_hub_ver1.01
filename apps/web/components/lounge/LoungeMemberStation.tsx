'use client';

import { cn } from '@/lib/utils';
import { LoungeMemberFigure } from '@/components/lounge/LoungeMemberFigure';
import type { LoungeMember } from './LoungeCanvas';

interface LoungeMemberStationProps {
  member: LoungeMember;
  selected?: boolean;
  onSelect: () => void;
}

/** Static floor station — avatar on a fixed plaza spot. */
export function LoungeMemberStation({ member, selected, onSelect }: LoungeMemberStationProps) {
  return (
    <button
      type="button"
      className={cn(
        'group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        selected && 'z-20',
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      aria-label={`Member station, ${member.isOnline ? 'available' : 'unavailable'}`}
    >
      <div className={cn('flex flex-col items-center', selected && 'lounge-near-shake')}>
        <span
          className={cn(
            'mb-0.5 block h-9 w-9 rounded-full border border-slate-300/80 bg-white/50 shadow-sm transition-colors',
            selected && 'border-amber-400/80 bg-amber-50/80',
            member.isOnline ? 'group-hover:border-emerald-400/60' : 'group-hover:border-orange-400/60',
          )}
          aria-hidden
        />
        <LoungeMemberFigure member={member} motion="static" highlightRing={selected} />
      </div>
    </button>
  );
}
