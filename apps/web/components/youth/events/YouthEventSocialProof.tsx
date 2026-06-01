'use client';

import { Users } from 'lucide-react';
import type { YouthEventAttendee } from '@church-hub/shared-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Props {
  goingCount: number;
  friendsAttending: YouthEventAttendee[];
  friendsAttendingCount: number;
  compact?: boolean;
}

export function YouthEventSocialProof({
  goingCount,
  friendsAttending,
  friendsAttendingCount,
  compact,
}: Props) {
  const preview = friendsAttending.slice(0, 5);

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span className="font-medium text-foreground">{goingCount}</span> going
        {friendsAttendingCount > 0 && (
          <>
            {' '}
            · <span className="text-primary">{friendsAttendingCount} friends</span>
          </>
        )}
      </p>
      {friendsAttendingCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {preview.map((f) => (
              <Avatar key={f.memberId} className="h-7 w-7 border-2 border-background">
                {f.avatarUrl && (
                  <AvatarImage src={f.avatarUrl} alt={`${f.firstName} ${f.lastName}`} />
                )}
                <AvatarFallback className="text-[10px]">
                  {f.firstName[0]}
                  {f.lastName[0]}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {preview.map((f) => f.firstName).join(', ')}
            {friendsAttendingCount > preview.length
              ? ` +${friendsAttendingCount - preview.length} more`
              : ''}{' '}
            {friendsAttendingCount === 1 ? 'is' : 'are'} going
          </p>
        </div>
      )}
    </div>
  );
}
