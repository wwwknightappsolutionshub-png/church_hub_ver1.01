'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useYouthContext } from '@/components/youth/YouthProvider';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface YouthGroup {
  id: string;
  name: string;
  description?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  _count?: { members: number; events: number; channels: number };
  members?: Array<{ member: { id: string; firstName: string; lastName: string } }>;
}

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
}

export function YouthGroupsPanel() {
  const ctx = useYouthContext();
  const canManage = ctx?.permissions.manageGroups ?? false;
  const queryClient = useQueryClient();
  const groups = useApiQuery<YouthGroup[]>(['youth-groups'], '/youth/groups');
  const youthMembers = useApiQuery<MemberOption[]>(['youth-member-list'], '/youth/members');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', minAge: '', maxAge: '' });
  const [addMemberGroupId, setAddMemberGroupId] = useState('');
  const [addMemberId, setAddMemberId] = useState('');

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post('/youth/groups', {
        name: form.name.trim(),
        description: form.description || undefined,
        minAge: form.minAge ? parseInt(form.minAge, 10) : undefined,
        maxAge: form.maxAge ? parseInt(form.maxAge, 10) : undefined,
      });
      toast.success('Youth group created');
      setForm({ name: '', description: '', minAge: '', maxAge: '' });
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['youth-groups'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create group'));
    } finally {
      setSaving(false);
    }
  };

  const addMember = async () => {
    if (!addMemberGroupId || !addMemberId) return;
    try {
      await api.post(`/youth/groups/${addMemberGroupId}/members`, { memberId: addMemberId });
      toast.success('Member added');
      setAddMemberId('');
      queryClient.invalidateQueries({ queryKey: ['youth-groups'] });
    } catch {
      toast.error('Could not add member');
    }
  };

  const deleteGroup = async (groupId: string, name: string) => {
    if (!confirm(`Deactivate youth group "${name}"?`)) return;
    try {
      await api.delete(`/youth/groups/${groupId}`);
      toast.success('Group deactivated');
      queryClient.invalidateQueries({ queryKey: ['youth-groups'] });
      queryClient.invalidateQueries({ queryKey: ['youth-stats'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not deactivate group'));
    }
  };

  const openChat = async (groupId: string) => {
    try {
      await api.post(`/youth/groups/${groupId}/channel`);
      toast.success('Moderated chat channel ready');
      queryClient.invalidateQueries({ queryKey: ['youth-channels'] });
    } catch {
      toast.error('Could not create channel');
    }
  };

  if (groups.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New group
          </Button>
        </div>
      )}

      {canManage && showForm && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={createGroup} className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Group name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input placeholder="Min age" type="number" value={form.minAge} onChange={(e) => setForm({ ...form, minAge: e.target.value })} />
              <Input placeholder="Max age" type="number" value={form.maxAge} onChange={(e) => setForm({ ...form, maxAge: e.target.value })} />
              <Input className="sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Button type="submit" disabled={saving} className="sm:col-span-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create group'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(groups.data ?? []).map((g) => (
          <Card key={g.id} className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-violet-600" />
                {g.name}
              </CardTitle>
              {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
              {(g.minAge || g.maxAge) && (
                <Badge variant="outline" className="w-fit">
                  Ages {g.minAge ?? '?'}–{g.maxAge ?? '?'}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{g._count?.members ?? 0} members · {g._count?.events ?? 0} events</p>
              <ul className="space-y-1 text-muted-foreground">
                {(g.members ?? []).slice(0, 4).map((m) => (
                  <li key={m.member.id}>
                    {m.member.firstName} {m.member.lastName}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                {canManage && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => openChat(g.id)}>
                      Enable chat
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAddMemberGroupId(g.id)}>
                      Add member
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => deleteGroup(g.id, g.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {canManage && addMemberGroupId && (
        <Card className="border-primary/30">
          <CardContent className="flex flex-wrap gap-2 pt-6">
            <select
              className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              value={addMemberId}
              onChange={(e) => setAddMemberId(e.target.value)}
            >
              <option value="">Select youth member…</option>
              {(youthMembers.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={addMember}>
              Add to group
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAddMemberGroupId('')}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
