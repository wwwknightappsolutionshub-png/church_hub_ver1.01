'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Loader2, MapPin, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { YouthEventDetail } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { YOUTH_ROUTES } from '@/lib/youth/routes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { YouthEventSocialProof } from './YouthEventSocialProof';

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
}

export function YouthEventDetailPanel({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [checkInMember, setCheckInMember] = useState('');

  const event = useApiQuery<YouthEventDetail>(
    ['youth-event-detail', eventId],
    `/youth/events/${eventId}`,
  );
  const friends = useApiQuery<{
    friends: YouthEventDetail['friendsAttending'];
    count: number;
  }>(['youth-event-friends', eventId], `/youth/events/${eventId}/friends-attending`);
  const members = useApiQuery<MemberOption[]>(['youth-member-list'], '/youth/members');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['youth-event-detail', eventId] });
    queryClient.invalidateQueries({ queryKey: ['youth-event-friends', eventId] });
    queryClient.invalidateQueries({ queryKey: ['youth-events-v5'] });
  };

  const handleRsvp = async (status: 'GOING' | 'INTERESTED' | 'NOT_GOING') => {
    setRsvpLoading(true);
    try {
      await api.post(`/youth/events/${eventId}/rsvp`, { status, visibility: 'PUBLIC' });
      toast.success('RSVP updated');
      invalidate();
    } catch {
      toast.error('RSVP failed');
    } finally {
      setRsvpLoading(false);
    }
  };

  const checkIn = async () => {
    if (!checkInMember) return;
    try {
      await api.post(`/youth/events/${eventId}/check-in`, { memberId: checkInMember });
      toast.success('Checked in');
      invalidate();
    } catch {
      toast.error('Check-in failed');
    }
  };

  if (event.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const ev = event.data;
  if (!ev) {
    return <p className="p-8 text-muted-foreground">Event not found.</p>;
  }

  const friendsList = friends.data?.friends ?? ev.friendsAttending;

  return (
    <div className="space-y-6 p-6 md:p-8">
      <Button type="button" variant="ghost" size="sm" asChild>
        <Link href={YOUTH_ROUTES.events}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          All events
        </Link>
      </Button>

      {ev.coverImageUrl && (
        <img src={ev.coverImageUrl} alt="" className="max-h-64 w-full rounded-xl object-cover" />
      )}

      <div>
        <h1 className="text-2xl font-bold">{ev.title}</h1>
        <p className="mt-1 flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {new Date(ev.startsAt).toLocaleString()}
        </p>
        {ev.location && (
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {ev.location}
          </p>
        )}
        {ev.youthGroup && (
          <Badge variant="outline" className="mt-2">
            {ev.youthGroup.name}
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Social proof</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <YouthEventSocialProof
            goingCount={ev.goingCount}
            friendsAttending={friendsList}
            friendsAttendingCount={friends.data?.count ?? ev.friendsAttendingCount}
          />
          <p className="text-sm text-muted-foreground">
            {ev.interestedCount} interested · {ev.checkedInCount} checked in
            {ev.spotsLeft != null ? ` · ${ev.spotsLeft} spots left` : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={rsvpLoading || ev.spotsLeft === 0}
              onClick={() => handleRsvp('GOING')}
            >
              {ev.myRsvp?.status === 'GOING' ? "You're going" : 'RSVP Going'}
            </Button>
            <Button type="button" variant="outline" disabled={rsvpLoading} onClick={() => handleRsvp('INTERESTED')}>
              Interested
            </Button>
            {ev.myRsvp && (
              <Button type="button" variant="ghost" disabled={rsvpLoading} onClick={() => handleRsvp('NOT_GOING')}>
                Can&apos;t attend
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {ev.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="whitespace-pre-wrap text-sm">{ev.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Who&apos;s going</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(ev.rsvps ?? [])
              .filter((r) => r.status === 'GOING')
              .map((r) => (
                <li key={r.memberId} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    {r.firstName} {r.lastName}
                  </span>
                  {r.isFriend && (
                    <Badge variant="secondary" className="text-[10px]">
                      Friend
                    </Badge>
                  )}
                </li>
              ))}
            {!ev.rsvps?.filter((r) => r.status === 'GOING').length && (
              <p className="text-sm text-muted-foreground">No public RSVPs yet.</p>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-4 w-4" />
            Leader check-in
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <select
            className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            value={checkInMember}
            onChange={(e) => setCheckInMember(e.target.value)}
          >
            <option value="">Select youth…</option>
            {(members.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </select>
          <Button type="button" onClick={checkIn}>
            Check in (+25 pts)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
