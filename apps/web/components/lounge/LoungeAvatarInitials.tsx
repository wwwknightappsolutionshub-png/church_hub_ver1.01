'use client';

import { cn } from '@/lib/utils';
import { memberInitials } from '@/lib/member-initials';
import { LoungePresenceBeacon } from '@/components/lounge/LoungePresenceBeacon';
import type { LoungeMotionMode } from '@/components/lounge/lounge-motion';
import type { LoungeMember } from './LoungeCanvas';

interface LoungeAvatarInitialsProps {
  member: LoungeMember;
  selected?: boolean;
  className?: string;
  motion?: LoungeMotionMode;
  highlightRing?: boolean;
}

export function LoungeAvatarInitials({
  member,
  selected,
  className,
  motion = 'static',
  highlightRing = false,
}: LoungeAvatarInitialsProps) {
  const online = member.isOnline;
  const initials = memberInitials(member.displayName);

  return (
    <div
      className={cn(
        'flex flex-col items-center',
        !member.isSelf && !online && 'opacity-80',
        motion === 'handshake' && 'scale-[1.02]',
        highlightRing && selected && !member.isSelf && 'rounded-full ring-2 ring-amber-400/90 ring-offset-2 ring-offset-transparent',
        className,
      )}
      aria-hidden
    >
      <div className="relative">
        {!member.isSelf && <LoungePresenceBeacon available={online} />}
        <div
          className={cn(
            'relative flex h-11 w-11 items-center justify-center rounded-full border-2 text-xs font-semibold shadow-lg',
            member.isSelf
              ? 'border-amber-400/90 bg-amber-50 text-amber-950'
              : 'border-white bg-slate-100 text-slate-800',
          )}
        >
          {initials}
        </div>
      </div>
      <div
        className={cn(
          'mt-0.5 h-3 w-7 rounded-b-md',
          member.isSelf ? 'bg-amber-700/70' : 'bg-slate-600/75',
        )}
      />
      <div className="flex items-end justify-center gap-1 pt-0.5">
        <span
          className={cn(
            'block h-5 w-1.5 rounded-full',
            member.isSelf ? 'bg-amber-800/65' : 'bg-slate-600/70',
          )}
        />
        <span
          className={cn(
            'block h-5 w-1.5 rounded-full',
            member.isSelf ? 'bg-amber-800/65' : 'bg-slate-600/70',
          )}
        />
      </div>
      {member.isSelf && (
        <span className="mt-1 rounded bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
          You
        </span>
      )}
    </div>
  );
}
