'use client';

import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import type { YouthEventSummary } from '@church-hub/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { YouthEventSocialProof } from './YouthEventSocialProof';

interface Props {
  event: YouthEventSummary;
  onRsvp?: (eventId: string, status: 'GOING' | 'INTERESTED' | 'NOT_GOING') => void;
  rsvpLoading?: boolean;
}

export function YouthEventCard({ event, onRsvp, rsvpLoading }: Props) {
  const isPast = new Date(event.startsAt) < new Date();
  const myStatus = event.myRsvp?.status;

  return (
    <Card className={isPast ? 'opacity-75' : ''}>
      {event.coverImageUrl && (
        <img
          src={event.coverImageUrl}
          alt=""
          className="h-36 w-full rounded-t-lg object-cover"
        />
      )}
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 shrink-0 text-sky-600" />
            {event.title}
          </CardTitle>
          {event.youthGroup && <Badge variant="outline">{event.youthGroup.name}</Badge>}
          {myStatus === 'GOING' && <Badge variant="success">You&apos;re going</Badge>}
          {myStatus === 'INTERESTED' && <Badge variant="secondary">Interested</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date(event.startsAt).toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
        {event.location && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {event.location}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {event.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
        )}
        <YouthEventSocialProof
          goingCount={event.goingCount}
          friendsAttending={event.friendsAttending}
          friendsAttendingCount={event.friendsAttendingCount}
          compact
        />
        {event.spotsLeft != null && event.spotsLeft <= 5 && event.spotsLeft > 0 && (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Only {event.spotsLeft} spots left
          </p>
        )}
        {event.spotsLeft === 0 && (
          <p className="text-xs font-medium text-destructive">Event full</p>
        )}
      </CardContent>
      {!isPast && onRsvp && (
        <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
          <Button
            type="button"
            size="sm"
            variant={myStatus === 'GOING' ? 'default' : 'outline'}
            disabled={rsvpLoading || event.spotsLeft === 0}
            onClick={() => onRsvp(event.id, 'GOING')}
          >
            Going
          </Button>
          <Button
            type="button"
            size="sm"
            variant={myStatus === 'INTERESTED' ? 'default' : 'outline'}
            disabled={rsvpLoading}
            onClick={() => onRsvp(event.id, 'INTERESTED')}
          >
            Interested
          </Button>
          {myStatus && myStatus !== 'NOT_GOING' && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={rsvpLoading}
              onClick={() => onRsvp(event.id, 'NOT_GOING')}
            >
              Can&apos;t go
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" asChild className="ml-auto">
            <Link href={`/dashboard/youth/events/${event.id}`}>Details</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
