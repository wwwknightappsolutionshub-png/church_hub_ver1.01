'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { memberInitials } from '@/lib/member-initials';
import { userDisplayName, type DisplayNameSource } from '@/lib/user-display';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  user: DisplayNameSource & { avatarUrl?: string | null };
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatar({ user, className, fallbackClassName }: UserAvatarProps) {
  const label = userDisplayName(user);
  const initials = memberInitials(label);

  return (
    <Avatar className={cn('h-10 w-10', className)}>
      {user.avatarUrl ? (
        <AvatarImage src={user.avatarUrl} alt="" />
      ) : null}
      <AvatarFallback className={cn('bg-primary text-primary-foreground', fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
