'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface KonnectEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  maxAttendees?: number | null;
  host?: { firstName: string; lastName: string } | null;
  business?: { businessName: string } | null;
  _count?: { rsvps: number };
  rsvps?: Array<{ member: { firstName: string; lastName: string } }>;
}

interface KonnectMember {
  id: string;
  firstName: string;
  lastName: string;
}

interface BusinessProfile {
  id: string;
  businessName: string;
}

export function KonnectEventsPanel() {
  const queryClient = useQueryClient();
  const { memberId, isChurchStaff } = useModuleAccess();
  const events = useApiQuery<KonnectEvent[]>(['konnect-events'], '/business/events?upcoming=true');
  const members = useApiQuery<KonnectMember[]>(['konnect-members'], '/business/members');
  const profiles = useApiQuery<BusinessProfile[]>(['konnect-verified-biz'], '/business/profiles?verified=true');
  const [showForm, setShowForm] = useState(false);
  const [rsvpEventId, setRsvpEventId] = useState('');
  const [rsvpMemberId, setRsvpMemberId] = useState('');
  const [form, setForm] = useState({ title: '', description: '', location: '', startsAt: '', maxAttendees: '', businessId: '', hostMemberId: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (memberId && !form.hostMemberId) {
      setForm((f) => ({ ...f, hostMemberId: memberId }));
    }
  }, [memberId, form.hostMemberId]);

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startsAt) return;
    setSaving(true);
    try {
      await api.post('/business/events', {
        title: form.title.trim(),
        description: form.description || undefined,
        location: form.location || undefined,
        startsAt: new Date(form.startsAt).toISOString(),
        maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees, 10) : undefined,
        businessId: form.businessId || undefined,
        hostMemberId: form.hostMemberId || undefined,
      });
      toast.success('Networking event created');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['konnect-events'] });
      queryClient.invalidateQueries({ queryKey: ['konnect-stats'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create event'));
    } finally {
      setSaving(false);
    }
  };

  const rsvp = async () => {
    if (!rsvpEventId || !rsvpMemberId) return;
    try {
      await api.post(`/business/events/${rsvpEventId}/rsvp`, { memberId: rsvpMemberId });
      toast.success('RSVP recorded');
      queryClient.invalidateQueries({ queryKey: ['konnect-events'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'RSVP failed — event may be full'));
    }
  };

  const removeEvent = async (id: string) => {
    if (!confirm('Cancel this event?')) return;
    try {
      await api.delete(`/business/events/${id}`);
      toast.success('Event removed');
      queryClient.invalidateQueries({ queryKey: ['konnect-events'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not remove event'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setRsvpEventId('pick')}>
          Record RSVP
        </Button>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New event
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
            <form onSubmit={createEvent} className="contents">
              <Input placeholder="Event title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} required />
              <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <Input placeholder="Max attendees" type="number" value={form.maxAttendees} onChange={(e) => setForm({ ...form, maxAttendees: e.target.value })} />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.businessId}
                onChange={(e) => setForm({ ...form, businessId: e.target.value })}
              >
                <option value="">Host business (optional)</option>
                {(profiles.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.businessName}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.hostMemberId}
                onChange={(e) => setForm({ ...form, hostMemberId: e.target.value })}
              >
                <option value="">Host member (optional)</option>
                {(members.data ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
              <textarea
                className="min-h-[80px] rounded-md border border-input px-3 py-2 text-sm sm:col-span-2"
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

      {rsvpEventId && (
        <Card className="border-primary/30">
          <CardContent className="flex flex-wrap gap-2 pt-6">
            <select
              className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              value={rsvpEventId === 'pick' ? '' : rsvpEventId}
              onChange={(e) => setRsvpEventId(e.target.value)}
            >
              <option value="">Select event…</option>
              {(events.data ?? []).map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
            <select
              className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              value={rsvpMemberId}
              onChange={(e) => setRsvpMemberId(e.target.value)}
            >
              <option value="">Select member…</option>
              {(members.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={rsvp}>
              RSVP
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRsvpEventId('')}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {events.isLoading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
      ) : (
        <div className="space-y-4">
          {(events.data ?? []).map((ev) => (
            <Card key={ev.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4 text-sky-600" />
                  {ev.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(ev.startsAt).toLocaleString()}
                  {ev.location ? ` · ${ev.location}` : ''}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {ev.description && <p className="text-muted-foreground">{ev.description}</p>}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {ev._count?.rsvps ?? 0} RSVPs
                    {ev.maxAttendees ? ` / ${ev.maxAttendees}` : ''}
                  </Badge>
                  {ev.business && <Badge variant="outline">{ev.business.businessName}</Badge>}
                  {ev.host && (
                    <span className="text-xs text-muted-foreground">
                      Host: {ev.host.firstName} {ev.host.lastName}
                    </span>
                  )}
                </div>
                {isChurchStaff && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-xs text-destructive"
                    onClick={() => removeEvent(ev.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove event
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
