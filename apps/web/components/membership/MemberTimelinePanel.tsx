'use client';

import { Loader2 } from 'lucide-react';
import { useMemberTimeline } from '@/lib/hooks/use-membership-hub';
import { cn } from '@/lib/utils';

export function MemberTimelinePanel({ memberId }: { memberId: string }) {
  const { data: events, isLoading } = useMemberTimeline(memberId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!events?.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No service history yet. Activity, classes, and attendance will appear here.
      </p>
    );
  }

  return (
    <ul className="relative space-y-0 border-l border-border pl-4">
      {events.map((ev) => (
        <li key={ev.id} className="relative pb-4 last:pb-0">
          <span
            className={cn(
              'absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background',
              ev.type === 'ATTENDANCE' && 'bg-primary',
              ev.type === 'CLASS' && 'bg-amber-500',
              ev.type === 'ACTIVITY' && 'bg-muted-foreground',
              ev.type === 'FOLLOW_UP' && 'bg-emerald-500',
              ev.type === 'OUTREACH' && 'bg-violet-500',
              !['ATTENDANCE', 'CLASS', 'ACTIVITY', 'FOLLOW_UP', 'OUTREACH'].includes(ev.type) &&
                'bg-border',
            )}
          />
          <p className="text-xs text-muted-foreground">
            {new Date(ev.at).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
          <p className="text-sm font-medium">{ev.title}</p>
          <p className="text-sm text-muted-foreground">{ev.summary}</p>
        </li>
      ))}
    </ul>
  );
}
