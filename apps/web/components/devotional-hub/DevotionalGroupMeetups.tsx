'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  CalendarDays,
  Check,
  Clock,
  Copy,
  Loader2,
  MapPin,
  Plus,
  Video,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  DevotionalMeetupCalendarDto,
  DevotionalMeetupDto,
  DevotionalMeetupRecurrence,
} from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const RECURRENCE_OPTIONS: Array<{ value: DevotionalMeetupRecurrence; label: string }> = [
  { value: 'NONE', label: 'One-time' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const DEFAULT_OFFSETS = [1440, 60, 10];

interface DevotionalGroupMeetupsProps {
  groupId: string;
  isAdmin: boolean;
}

type ViewMode = 'upcoming' | 'calendar' | 'past';

export function DevotionalGroupMeetups({ groupId, isAdmin }: DevotionalGroupMeetupsProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>('upcoming');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [postEventOpen, setPostEventOpen] = useState(false);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [location, setLocation] = useState('');
  const [onlineLink, setOnlineLink] = useState('');
  const [locationType, setLocationType] = useState<'PHYSICAL' | 'ONLINE' | 'HYBRID'>('PHYSICAL');
  const [recurrence, setRecurrence] = useState<DevotionalMeetupRecurrence>('NONE');
  const [reminderOffsets, setReminderOffsets] = useState(DEFAULT_OFFSETS.join(','));

  const [postSummary, setPostSummary] = useState('');
  const [postPrayer, setPostPrayer] = useState('');
  const [postActions, setPostActions] = useState('');
  const [postProgress, setPostProgress] = useState('');

  const listUrl =
    view === 'calendar'
      ? `/devotional-hub/meetups/calendar?groupId=${groupId}&year=${calYear}&month=${calMonth}`
      : `/devotional-hub/meetups?groupId=${groupId}&view=${view === 'past' ? 'past' : 'upcoming'}`;

  const listKey = ['devotional-meetups', groupId, view, String(calYear), String(calMonth)];

  const list = useApiQuery<DevotionalMeetupDto[] | DevotionalMeetupCalendarDto>(
    listKey,
    listUrl,
  );

  const meetups: DevotionalMeetupDto[] = useMemo(() => {
    if (!list.data) return [];
    if (view === 'calendar' && 'days' in list.data) {
      return list.data.days.map((d) => d.meetup);
    }
    return list.data as DevotionalMeetupDto[];
  }, [list.data, view]);

  const selected =
    meetups.find((m) => m.id === selectedId) ??
    (meetups[0] && !selectedId ? meetups[0] : null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['devotional-meetups', groupId] });
    queryClient.invalidateQueries({ queryKey: ['devotional-group', groupId] });
  };

  const createMeetup = async () => {
    if (!title.trim() || !startsAt) {
      toast.error('Title and date/time are required');
      return;
    }
    setBusy(true);
    try {
      const offsets = reminderOffsets
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n) && n > 0);
      await api.post('/devotional-hub/meetups', {
        groupId,
        title,
        description: description || undefined,
        startsAt: new Date(startsAt).toISOString(),
        location: location || undefined,
        onlineLink: onlineLink || undefined,
        locationType,
        recurrence,
        reminderOffsetsMinutes: offsets.length ? offsets : DEFAULT_OFFSETS,
      });
      toast.success('Meetup created — members invited to RSVP');
      setCreating(false);
      resetForm();
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create meetup'));
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartsAt('');
    setLocation('');
    setOnlineLink('');
    setRecurrence('NONE');
    setReminderOffsets(DEFAULT_OFFSETS.join(','));
  };

  const rsvp = async (meetupId: string, status: 'ACCEPTED' | 'DECLINED') => {
    setBusy(true);
    try {
      await api.post(`/devotional-hub/meetups/${meetupId}/rsvp`, { status });
      toast.success(status === 'ACCEPTED' ? 'You\'re attending' : 'Response recorded');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'RSVP failed'));
    } finally {
      setBusy(false);
    }
  };

  const cancelMeetup = async (meetupId: string) => {
    if (!confirm('Cancel this meetup?')) return;
    try {
      await api.post(`/devotional-hub/meetups/${meetupId}/cancel`);
      toast.success('Meetup cancelled');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Cancel failed'));
    }
  };

  const duplicateMeetup = async (meetupId: string) => {
    try {
      const { data } = await api.post<DevotionalMeetupDto>(
        `/devotional-hub/meetups/${meetupId}/duplicate`,
      );
      toast.success('Meetup duplicated');
      setSelectedId(data.id);
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Duplicate failed'));
    }
  };

  const saveReminders = async (meetupId: string) => {
    const offsets = reminderOffsets
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n > 0);
    try {
      await api.patch(`/devotional-hub/meetups/${meetupId}/reminders`, { offsets });
      toast.success('Reminder schedule updated');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update reminders'));
    }
  };

  const savePostEvent = async (meetupId: string) => {
    try {
      await api.post(`/devotional-hub/meetups/${meetupId}/post-event`, {
        summary: postSummary || undefined,
        prayerPoints: postPrayer || undefined,
        actionSteps: postActions || undefined,
        progressNote: postProgress || undefined,
      });
      toast.success('Post-event notes saved');
      setPostEventOpen(false);
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save follow-up'));
    }
  };

  const copyLink = (link: string) => {
    void navigator.clipboard.writeText(link);
    toast.success('Link copied');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'upcoming' as const, label: 'Upcoming', icon: Clock },
              { id: 'calendar' as const, label: 'Calendar', icon: CalendarDays },
              { id: 'past' as const, label: 'Past', icon: Calendar },
            ] as const
          ).map((v) => (
            <Button
              key={v.id}
              type="button"
              size="sm"
              variant={view === v.id ? 'default' : 'outline'}
              onClick={() => setView(v.id)}
            >
              <v.icon className="mr-1.5 h-3.5 w-3.5" />
              {v.label}
            </Button>
          ))}
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Schedule meetup
          </Button>
        )}
      </div>

      {view === 'calendar' && (
        <div className="flex items-center gap-2 text-sm">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              if (calMonth === 1) {
                setCalMonth(12);
                setCalYear((y) => y - 1);
              } else setCalMonth((m) => m - 1);
            }}
          >
            Prev
          </Button>
          <span className="font-medium">
            {calYear} — {new Date(calYear, calMonth - 1).toLocaleString('default', { month: 'long' })}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              if (calMonth === 12) {
                setCalMonth(1);
                setCalYear((y) => y + 1);
              } else setCalMonth((m) => m + 1);
            }}
          >
            Next
          </Button>
        </div>
      )}

      {creating && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New meetup</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Description (optional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label>Date & time</Label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div>
              <Label>Recurrence</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as DevotionalMeetupRecurrence)}
              >
                {RECURRENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Location type</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={locationType}
                onChange={(e) =>
                  setLocationType(e.target.value as 'PHYSICAL' | 'ONLINE' | 'HYBRID')
                }
              >
                <option value="PHYSICAL">Physical</option>
                <option value="ONLINE">Online</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
            <div>
              <Label>Physical location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Online link</Label>
              <Input value={onlineLink} onChange={(e) => setOnlineLink(e.target.value)} placeholder="https://…" />
            </div>
            <div className="sm:col-span-2">
              <Label>Reminder offsets (minutes before, comma-separated)</Label>
              <Input
                value={reminderOffsets}
                onChange={(e) => setReminderOffsets(e.target.value)}
                placeholder="1440, 60, 10"
              />
              <p className="mt-1 text-xs text-muted-foreground">Default: 24h, 1h, 10min — in-app, email, push</p>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button onClick={createMeetup} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {list.isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_1fr]">
        <div className="space-y-2">
          {meetups.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedId(m.id)}
              className={cn(
                'w-full rounded-lg border p-3 text-left text-sm transition',
                selected?.id === m.id && 'border-primary bg-primary/5',
              )}
            >
              <p className="font-medium">{m.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(m.startsAt).toLocaleString()}
              </p>
              <Badge variant="outline" className="mt-1 text-[10px]">
                {m.status}
              </Badge>
            </button>
          ))}
          {!list.isLoading && meetups.length === 0 && (
            <p className="text-sm text-muted-foreground">No meetups in this view.</p>
          )}
        </div>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{selected.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {new Date(selected.startsAt).toLocaleString()}
                {selected.recurrence !== 'NONE' && ` · ${selected.recurrence}`}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {selected.description && <p>{selected.description}</p>}
              {selected.location && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {selected.location}
                </p>
              )}
              {selected.onlineLink && (
                <p className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  <a href={selected.onlineLink} className="text-primary underline" target="_blank" rel="noreferrer">
                    Join online
                  </a>
                  <Button type="button" size="icon" variant="ghost" onClick={() => copyLink(selected.onlineLink!)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </p>
              )}

              {selected.status === 'SCHEDULED' && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={selected.myRsvpStatus === 'ACCEPTED' ? 'default' : 'outline'}
                    onClick={() => rsvp(selected.id, 'ACCEPTED')}
                    disabled={busy}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant={selected.myRsvpStatus === 'DECLINED' ? 'destructive' : 'outline'}
                    onClick={() => rsvp(selected.id, 'DECLINED')}
                    disabled={busy}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Decline
                  </Button>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <h4 className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Attending ({selected.rsvp.attending.length})
                  </h4>
                  <ul className="mt-1 text-muted-foreground">
                    {selected.rsvp.attending.map((a) => (
                      <li key={a.memberId}>{a.name}</li>
                    ))}
                    {selected.rsvp.attending.length === 0 && <li>—</li>}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-amber-700 dark:text-amber-400">
                    Waiting ({selected.rsvp.pending.length})
                  </h4>
                  <ul className="mt-1 text-muted-foreground">
                    {selected.rsvp.pending.map((a) => (
                      <li key={a.memberId}>{a.name}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {isAdmin && selected.status === 'SCHEDULED' && (
                <div className="space-y-2 border-t pt-3">
                  <Label>Reminder intervals (minutes)</Label>
                  <Input
                    value={reminderOffsets}
                    onChange={(e) => setReminderOffsets(e.target.value)}
                    placeholder={selected.reminderOffsetsMinutes.join(', ')}
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={() => saveReminders(selected.id)}>
                    Save reminder schedule
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => duplicateMeetup(selected.id)}>
                      Duplicate
                    </Button>
                    <Button type="button" size="sm" variant="destructive" onClick={() => cancelMeetup(selected.id)}>
                      Cancel meetup
                    </Button>
                  </div>
                </div>
              )}

              {(selected.needsFollowUp || postEventOpen) && isAdmin && (
                <Card className="border-violet-200/60 bg-violet-50/20 dark:bg-violet-950/20">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Post-event follow-up</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {!postEventOpen && (
                      <Button type="button" size="sm" onClick={() => setPostEventOpen(true)}>
                        Add group summary, prayer points, action steps…
                      </Button>
                    )}
                    {postEventOpen && (
                      <>
                        <Input
                          placeholder="Group summary"
                          value={postSummary}
                          onChange={(e) => setPostSummary(e.target.value)}
                        />
                        <Input
                          placeholder="Prayer points"
                          value={postPrayer}
                          onChange={(e) => setPostPrayer(e.target.value)}
                        />
                        <Input
                          placeholder="Action steps"
                          value={postActions}
                          onChange={(e) => setPostActions(e.target.value)}
                        />
                        <Input
                          placeholder="Devotional progress notes"
                          value={postProgress}
                          onChange={(e) => setPostProgress(e.target.value)}
                        />
                        <Button type="button" size="sm" onClick={() => savePostEvent(selected.id)}>
                          Save follow-up
                        </Button>
                      </>
                    )}
                    {selected.postEventSummary && (
                      <p className="text-xs text-muted-foreground">
                        Summary: {selected.postEventSummary}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
