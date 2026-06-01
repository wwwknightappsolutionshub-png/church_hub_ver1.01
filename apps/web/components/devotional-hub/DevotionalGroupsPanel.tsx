'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { DevotionalGroupListDto, DevotionalGroupVisibility } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { DEVOTIONAL_HUB_ROUTES } from '@/lib/devotional-hub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const VISIBILITY_OPTIONS: Array<{ value: DevotionalGroupVisibility; label: string }> = [
  { value: 'PRIVATE', label: 'Private' },
  { value: 'FRIENDS_ONLY', label: 'Friends only' },
  { value: 'INVITE_LINK', label: 'Invite link' },
];

export function DevotionalGroupsPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    profileImageUrl: '',
    visibility: 'INVITE_LINK' as DevotionalGroupVisibility,
  });

  const groups = useApiQuery<DevotionalGroupListDto>(
    ['devotional-groups'],
    '/devotional-hub/groups',
  );

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post<{ id: string }>('/devotional-hub/groups', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        profileImageUrl: form.profileImageUrl.trim() || undefined,
        visibility: form.visibility,
      });
      toast.success('Group created');
      queryClient.invalidateQueries({ queryKey: ['devotional-groups'] });
      setShowCreate(false);
      router.push(DEVOTIONAL_HUB_ROUTES.groupDetail(data.id));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create group'));
    } finally {
      setCreating(false);
    }
  };

  const acceptInvite = async (inviteId: string) => {
    try {
      await api.post(`/devotional-hub/groups/invites/${inviteId}/accept`);
      toast.success('Joined group');
      queryClient.invalidateQueries({ queryKey: ['devotional-groups'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not accept invite'));
    }
  };

  if (groups.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const data = groups.data;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Create group
        </Button>
      </div>

      {(data?.pendingInvites?.length ?? 0) > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pending invites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="text-sm font-medium">{inv.group.name}</span>
                <Button size="sm" onClick={() => acceptInvite(inv.id)}>
                  Accept
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {showCreate && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={createGroup} className="space-y-4">
              <div className="space-y-2">
                <Label>Group name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Youth Romans Study"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Profile image URL</Label>
                <Input
                  value={form.profileImageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, profileImageUrl: e.target.value }))}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <div className="flex flex-wrap gap-2">
                  {VISIBILITY_OPTIONS.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, visibility: v.value }))}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-sm',
                        form.visibility === v.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border',
                      )}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create group
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          My groups
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(data?.myGroups ?? []).map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
          {(data?.myGroups?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">Create a group to study together.</p>
          )}
        </div>
      </section>

      {(data?.discoverable?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Discover
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {data?.discoverable.map((g) => (
              <GroupCard key={g.id} group={g} discoverable />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function GroupCard({
  group,
  discoverable,
}: {
  group: DevotionalGroupListDto['myGroups'][0];
  discoverable?: boolean;
}) {
  return (
    <Card className="overflow-hidden transition hover:shadow-md">
      {group.profileImageUrl && (
        <img src={group.profileImageUrl} alt="" className="h-24 w-full object-cover" />
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">
            <Link href={DEVOTIONAL_HUB_ROUTES.groupDetail(group.id)} className="hover:underline">
              {group.name}
            </Link>
          </CardTitle>
          <Badge variant="outline" className="shrink-0 text-xs">
            {group.visibility.replace('_', ' ')}
          </Badge>
        </div>
        {group.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{group.description}</p>
        )}
      </CardHeader>
      <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {group._count?.members ?? 0} members
        </span>
        {group.myMembership?.status === 'PENDING' && (
          <Badge variant="secondary">Pending approval</Badge>
        )}
        {discoverable && (
          <Button size="sm" variant="outline" asChild>
            <Link href={DEVOTIONAL_HUB_ROUTES.groupDetail(group.id)}>View</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
