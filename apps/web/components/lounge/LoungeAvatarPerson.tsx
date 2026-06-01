'use client';

import { cn } from '@/lib/utils';
import { loungeMemberAccent } from '@/components/lounge/lounge-member-accent';
import { LoungePresenceBeacon } from '@/components/lounge/LoungePresenceBeacon';
import type { LoungeMotionMode } from '@/components/lounge/lounge-motion';
import type { LoungeMember } from './LoungeCanvas';

interface LoungeAvatarPersonProps {
  member: LoungeMember;
  selected?: boolean;
  className?: string;
  motion?: LoungeMotionMode;
  highlightRing?: boolean;
}

/** Corporate figure — static for others with head beacon; self uses pointer-driven motion. */
export function LoungeAvatarPerson({
  member,
  selected,
  className,
  motion = 'static',
  highlightRing = false,
}: LoungeAvatarPersonProps) {
  const online = member.isOnline;
  const accent = loungeMemberAccent(member.id, member.isSelf);

  return (
    <div
      className={cn(
        'flex flex-col items-center',
        !member.isSelf && !online && 'opacity-90',
        motion === 'handshake' && 'lounge-figure-handshake',
        highlightRing && selected && !member.isSelf && 'rounded-full ring-2 ring-amber-400/90 ring-offset-2 ring-offset-transparent',
        className,
      )}
      aria-hidden
    >
      <div className="relative">
        {!member.isSelf && <LoungePresenceBeacon available={online} />}
        <svg
          width="44"
          height="56"
          viewBox="0 0 44 56"
          className="drop-shadow-md"
          role="img"
          aria-label="Member"
        >
          <ellipse cx="22" cy="54" rx="10" ry="2.5" fill="rgba(15,23,42,0.12)" />
          <path
            d="M17 38 L14 52"
            stroke={accent.limb}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M27 38 L30 52"
            stroke={accent.limb}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M15 24 Q22 20 29 24 L27 38 Q22 40 17 38 Z"
            fill={accent.shirt}
            stroke={accent.stroke}
            strokeWidth="1.2"
          />
          <g className="lounge-arm-left">
            <path
              d="M12 26 L8 34"
              stroke={accent.body}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
          <g className="lounge-arm-right">
            <path
              d="M32 26 L36 34"
              stroke={accent.body}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
          <circle cx="22" cy="12" r="9" fill={accent.head} stroke={accent.stroke} strokeWidth="1.5" />
          <path
            d="M18 10 Q22 7 26 10"
            fill="none"
            stroke={accent.stroke}
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      </div>
      {member.isSelf && (
        <span className="mt-0.5 rounded bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
          You
        </span>
      )}
    </div>
  );
}
