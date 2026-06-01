'use client';

import type { LoungeMotionMode } from '@/components/lounge/lounge-motion';
import type { LoungeMember } from './LoungeCanvas';
import { LoungeAvatarInitials } from './LoungeAvatarInitials';
import { LoungeAvatarPerson } from './LoungeAvatarPerson';

export type LoungeAvatarVariant = 'person' | 'initials';

interface LoungeMemberFigureProps {
  member: LoungeMember;
  selected?: boolean;
  className?: string;
  variant?: LoungeAvatarVariant;
  motion?: LoungeMotionMode;
  /** Subtle ring when nearby — no scale (avoids edge flicker). */
  highlightRing?: boolean;
}

export function LoungeMemberFigure({
  member,
  selected,
  className,
  variant = 'person',
  motion = 'static',
  highlightRing = false,
}: LoungeMemberFigureProps) {
  if (variant === 'initials') {
    return (
      <LoungeAvatarInitials
        member={member}
        selected={selected}
        className={className}
        motion={motion}
        highlightRing={highlightRing}
      />
    );
  }
  return (
    <LoungeAvatarPerson
      member={member}
      selected={selected}
      className={className}
      motion={motion}
      highlightRing={highlightRing}
    />
  );
}
