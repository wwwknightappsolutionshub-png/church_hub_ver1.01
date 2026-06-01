'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { YouthEventSummary } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { YOUTH_ROUTES } from '@/lib/youth/routes';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { YouthEventCard } from './YouthEventCard';

interface YouthGroup {
  id: string;
  name: string;
}

export function YouthEventsPanel() {
  const queryClient = useQueryClient();
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rsvpLoadingId, setRsvpLoadingId] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    startsAt: '',
    youthGroupId: '',
    maxAttendees: '',
    coverImageUrl: '',
  });

  const events = useApiQuery<YouthEventSummary[]>(
    ['youth-events-v5', String(upcomingOnly)],
    `/youth/events?upcoming=${upcomingOnly}`,
  );
  const groups = useApiQuery<YouthGroup[]>(['youth-groups-events'], '/youth/groups');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['youth-events-v5'] });
    queryClient.invalidateQueries({ queryKey: ['youth-event-detail'] });
    queryClient.invalidateQueries({ queryKey: ['youth-stats'] });
    queryClient.invalidateQueries({ queryKey: ['youth-leaderboard'] });
  };

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startsAt) return;
    setSaving(true);
    try {
      await api.post('/youth/events', {
        title: form.title.trim(),
        description: form.description || undefined,
        location: form.location || undefined,
        coverImageUrl: form.coverImageUrl || undefined,
        startsAt: new Date(form.startsAt).toISOString(),
        youthGroupId: form.youthGroupId || undefined,
        maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees, 10) : undefined,
      });
      toast.success('Event created');
      setShowForm(false);
      setForm({
        title: '',
        description: '',
        location: '',
        startsAt: '',
        youthGroupId: '',
        maxAttendees: '',
        coverImageUrl: '',
      });
      invalidate();
    } catch {
      toast.error('Could not create event');
    } finally {
      setSaving(false);
    }
  };

  const handleRsvp = async (eventId: string, status: 'GOING' | 'INTERESTED' | 'NOT_GOING') => {
    setRsvpLoadingId(eventId);
    try {
      await api.post(`/youth/events/${eventId}/rsvp`, { status, visibility: 'PUBLIC' });
      toast.success(status === 'GOING' ? "You're going! (+10 pts)" : 'RSVP updated');
      invalidate();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      toast.error(msg ?? 'RSVP failed');
    } finally {
      setRsvpLoadingId('');
    }
  };

  return (
    <>
      <PageHeader
        title="Youth Events"
        description="Discover events, RSVP, and see which friends from your groups are going."
        badge={
          <Link href={YOUTH_ROUTES.hub} className="text-sm text-muted-foreground hover:text-foreground">
            ← Youth hub
          </Link>
        }
      />
      <div className="space-y-6 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={upcomingOnly ? 'default' : 'outline'}
              onClick={() => setUpcomingOnly(true)}
            >
              Upcoming
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!upcomingOnly ? 'default' : 'outline'}
              onClick={() => setUpcomingOnly(false)}
            >
              All
            </Button>
          </div>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New event
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
              <form onSubmit={createEvent} className="contents">
                <Input
                  placeholder="Event title *"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  required
                />
                <Input
                  placeholder="Location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
                <Input
                  placeholder="Max attendees"
                  type="number"
                  value={form.maxAttendees}
                  onChange={(e) => setForm({ ...form, maxAttendees: e.target.value })}
                />
                <Input
                  placeholder="Cover image URL"
                  value={form.coverImageUrl}
                  onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
                  className="sm:col-span-2"
                />
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.youthGroupId}
                  onChange={(e) => setForm({ ...form, youthGroupId: e.target.value })}
                >
                  <option value="">All youth (no group)</option>
                  {(groups.data ?? []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <Button type="submit" disabled={saving} className="sm:col-span-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create event'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {events.isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {(events.data ?? []).map((ev) => (
            <YouthEventCard
              key={ev.id}
              event={ev}
              onRsvp={handleRsvp}
              rsvpLoading={rsvpLoadingId === ev.id}
            />
          ))}
        </div>

        {!events.isLoading && !events.data?.length && (
          <p className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <Calendar className="h-10 w-10 opacity-40" />
            No {upcomingOnly ? 'upcoming ' : ''}events yet.
          </p>
        )}
      </div>
    </>
  );
}
