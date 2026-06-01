'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Check,
  Copy,
  Loader2,
  MessageCircle,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  DevotionalGroupMemberRole,
  DevotionalGroupTimelineItemDto,
} from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { DEVOTIONAL_HUB_ROUTES } from '@/lib/devotional-hub';
import { DevotionalGroupMeetups } from './DevotionalGroupMeetups';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GroupDetail {
  id: string;
  name: string;
  description?: string | null;
  profileImageUrl?: string | null;
  visibility: string;
  inviteToken?: string | null;
  inviteExpiresAt?: string | null;
  inviteLinkValid?: boolean;
  isAdmin?: boolean;
  myMembership?: { role: string; status: string } | null;
  timeline: DevotionalGroupTimelineItemDto[];
  pendingMembers: Array<{
    memberId: string;
    member: { id: string; firstName: string; lastName: string };
  }>;
  members: Array<{
    memberId: string;
    role: string;
    status: string;
    member: { id: string; firstName: string; lastName: string };
  }>;
}

export function DevotionalGroupDetail({ groupId }: { groupId: string }) {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUserEmail, setInviteUserEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<'overview' | 'meetups'>('overview');

  const group = useApiQuery<GroupDetail>(['devotional-group', groupId], `/devotional-hub/groups/${groupId}`);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['devotional-group', groupId] });
    queryClient.invalidateQueries({ queryKey: ['devotional-groups'] });
  };

  const inviteLink =
    typeof window !== 'undefined' && group.data?.inviteToken
      ? `${window.location.origin}/dashboard/devotional-hub/groups/join/${group.data.inviteToken}`
      : '';

  const copyLink = () => {
    if (!inviteLink) return;
    void navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied');
  };

  const regenerateLink = async () => {
    setBusy(true);
    try {
      await api.post(`/devotional-hub/groups/${groupId}/invite-link`, { expiresInDays: 30 });
      toast.success('New invite link generated (30 days)');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not refresh link'));
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail && !inviteUserEmail && !invitePhone) {
      toast.error('Enter email, username (login email), or phone');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/devotional-hub/groups/${groupId}/invites`, {
        inviteeEmail: inviteEmail.trim() || undefined,
        inviteeUserEmail: inviteUserEmail.trim() || undefined,
        inviteePhone: invitePhone.trim() || undefined,
        expiresInDays: 14,
      });
      toast.success('Invite sent');
      setInviteEmail('');
      setInviteUserEmail('');
      setInvitePhone('');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Invite failed'));
    } finally {
      setBusy(false);
    }
  };

  const approve = async (memberId: string) => {
    try {
      await api.post(`/devotional-hub/groups/${groupId}/members/${memberId}/approve`);
      toast.success('Member approved');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not approve'));
    }
  };

  const decline = async (memberId: string) => {
    try {
      await api.post(`/devotional-hub/groups/${groupId}/members/${memberId}/decline`);
      toast.success('Request declined');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not decline'));
    }
  };

  const setRole = async (memberId: string, role: DevotionalGroupMemberRole) => {
    try {
      await api.patch(`/devotional-hub/groups/${groupId}/members/${memberId}/role`, { role });
      toast.success('Role updated');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update role'));
    }
  };

  const requestJoin = async () => {
    try {
      await api.post(`/devotional-hub/groups/${groupId}/join`);
      toast.success('Join request sent');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not request join'));
    }
  };

  const joinByLink = async () => {
    if (!group.data?.inviteToken) return;
    try {
      await api.post(`/devotional-hub/groups/join/${group.data.inviteToken}`);
      toast.success('Joined group');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not join'));
    }
  };

  if (group.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const g = group.data;
  if (!g) {
    return (
      <p className="p-8 text-center text-muted-foreground">
        Group not found.{' '}
        <Link href={DEVOTIONAL_HUB_ROUTES.hub} className="text-primary underline">
          Back
        </Link>
      </p>
    );
  }

  const isMember = g.myMembership?.status === 'ACTIVE';
  const isPending = g.myMembership?.status === 'PENDING';

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 pb-24 md:p-8">
      <Link
        href={DEVOTIONAL_HUB_ROUTES.hub}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Devotional Hub
      </Link>

      {g.profileImageUrl && (
        <img src={g.profileImageUrl} alt="" className="h-40 w-full rounded-lg object-cover" />
      )}

      <div>
        <h1 className="text-2xl font-semibold">{g.name}</h1>
        {g.description && <p className="mt-2 text-muted-foreground">{g.description}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="outline">{g.visibility.replace('_', ' ')}</Badge>
          {g.myMembership && (
            <Badge variant="secondary">
              {g.myMembership.role} · {g.myMembership.status}
            </Badge>
          )}
        </div>
      </div>

      {!isMember && !isPending && g.visibility === 'INVITE_LINK' && g.inviteLinkValid && (
        <Button onClick={joinByLink}>Join with invite link</Button>
      )}
      {!isMember && !isPending && g.visibility === 'FRIENDS_ONLY' && (
        <Button onClick={requestJoin}>Request to join</Button>
      )}
      {isPending && (
        <Card className="border-amber-200/60 bg-amber-50/30">
          <CardContent className="py-3 text-sm">Awaiting admin approval to join.</CardContent>
        </Card>
      )}

      {g.isAdmin && (g.pendingMembers?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approve membership</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {g.pendingMembers.map((m) => (
              <div
                key={m.memberId}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="text-sm">
                  {m.member.firstName} {m.member.lastName}
                </span>
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => approve(m.memberId)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decline(m.memberId)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {g.isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" />
              Invite members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={sendInvite} className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Username (login email)</Label>
                <Input
                  value={inviteUserEmail}
                  onChange={(e) => setInviteUserEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy} className="sm:col-span-3">
                Send invite
              </Button>
            </form>
            {g.visibility === 'INVITE_LINK' && (
              <div className="flex flex-wrap gap-2 border-t pt-3">
                <Button variant="outline" size="sm" onClick={copyLink} disabled={!inviteLink}>
                  <Copy className="mr-1 h-4 w-4" />
                  Copy invite link
                </Button>
                <Button variant="ghost" size="sm" onClick={regenerateLink} disabled={busy}>
                  Regenerate link (30d)
                </Button>
                {g.inviteExpiresAt && (
                  <span className="self-center text-xs text-muted-foreground">
                    Expires {new Date(g.inviteExpiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 border-b pb-2">
        <Button
          type="button"
          size="sm"
          variant={section === 'overview' ? 'default' : 'ghost'}
          onClick={() => setSection('overview')}
        >
          Overview
        </Button>
        <Button
          type="button"
          size="sm"
          variant={section === 'meetups' ? 'default' : 'ghost'}
          onClick={() => setSection('meetups')}
        >
          <Calendar className="mr-1.5 h-3.5 w-3.5" />
          Meetups
        </Button>
      </div>

      {section === 'meetups' && (
        <DevotionalGroupMeetups groupId={groupId} isAdmin={!!g.isAdmin} />
      )}

      {section === 'overview' && g.isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members & roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {g.members
              .filter((m) => m.status === 'ACTIVE')
              .map((m) => (
                <div
                  key={m.memberId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span>
                    {m.member.firstName} {m.member.lastName}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {m.role}
                    </Badge>
                  </span>
                  {g.isAdmin && m.role !== 'ADMIN' && (
                    <div className="flex gap-1">
                      {m.role !== 'CO_ADMIN' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRole(m.memberId, 'CO_ADMIN')}
                        >
                          Make co-admin
                        </Button>
                      )}
                      {m.role === 'CO_ADMIN' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRole(m.memberId, 'MEMBER')}
                        >
                          Remove co-admin
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {section === 'overview' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Group timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(g.timeline ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                Activity from discussions, journals, meetups, and prayer lists will appear here.
              </p>
            )}
            {g.timeline?.map((item) => (
              <div key={`${item.type}-${item.id}`} className="flex gap-3 border-b pb-3 last:border-0">
                <TimelineIcon type={item.type} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{item.title}</p>
                  {item.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.at).toLocaleString()}
                    {item.meta?.author ? ` · ${String(item.meta.author)}` : ''}
                    {item.type === 'meetup' && item.meta?.status ? ` · ${String(item.meta.status)}` : ''}
                  </p>
                  {item.type === 'meetup' && Boolean(item.meta?.needsFollowUp) && g.isAdmin && (
                    <Button
                      type="button"
                      size="sm"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => setSection('meetups')}
                    >
                      Add post-event notes →
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TimelineIcon({ type }: { type: string }) {
  if (type === 'meetup') return <Calendar className="mt-0.5 h-4 w-4 text-blue-600" />;
  if (type === 'discussion') return <MessageCircle className="mt-0.5 h-4 w-4 text-violet-600" />;
  return <MessageCircle className="mt-0.5 h-4 w-4 text-emerald-600" />;
}
