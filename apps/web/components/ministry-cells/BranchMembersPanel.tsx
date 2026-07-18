'use client';

import { useMemo, useState } from 'react';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BranchMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  joinedAt: string;
}

interface AvailableMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  status: string;
}

interface BranchMembersPanelProps {
  branchId: string;
  members: BranchMember[];
  canManage: boolean;
  onChanged: () => void;
  onOpenFullRoster?: () => void;
}

export function BranchMembersPanel({
  branchId,
  members,
  canManage,
  onChanged,
  onOpenFullRoster,
}: BranchMembersPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const { data: available = [], isLoading } = useApiQuery<AvailableMember[]>(
    ['ministry-cells', 'available-members', branchId],
    `/ministry-cells/available-members?branchId=${branchId}`,
    { enabled: canManage && pickerOpen },
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return available;
    return available.filter(
      (m) =>
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q),
    );
  }, [available, search]);

  const resetPicker = () => {
    setSelectedMemberId('');
    setSearch('');
    setCreateMode(false);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
  };

  const addMember = async () => {
    if (!selectedMemberId) {
      toast.error('Select a member');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/ministry-cells/branches/${branchId}/members`, {
        memberId: selectedMemberId,
      });
      toast.success('Member added to branch');
      resetPicker();
      setPickerOpen(false);
      onChanged();
    } catch {
      toast.error('Could not add member — they may already belong to another branch');
    } finally {
      setBusy(false);
    }
  };

  const createAndAdd = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/ministry-cells/branches/${branchId}/members/create`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      toast.success('Member created and added to branch');
      resetPicker();
      setPickerOpen(false);
      onChanged();
    } catch {
      toast.error('Could not create member');
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (memberId: string) => {
    setBusy(true);
    try {
      await api.delete(`/ministry-cells/branches/${branchId}/members/${memberId}`);
      toast.success('Member removed');
      onChanged();
    } catch {
      toast.error('Failed to remove member');
    } finally {
      setBusy(false);
    }
  };

  const noSearchMatch = !isLoading && search.trim().length > 0 && filtered.length === 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Members ({members.length})</p>
        <div className="flex items-center gap-1">
          {onOpenFullRoster && (
            <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={onOpenFullRoster}>
              Full roster
            </Button>
          )}
          {canManage && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => {
                setPickerOpen((v) => !v);
                if (pickerOpen) resetPicker();
              }}
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Add member
            </Button>
          )}
        </div>
      </div>

      {pickerOpen && canManage && (
        <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
          {!createMode ? (
            <>
              <div>
                <Label htmlFor="member-search">Search church members</Label>
                <Input
                  id="member-search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedMemberId('');
                  }}
                  placeholder="Name or email"
                />
              </div>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                >
                  <option value="">Select a member…</option>
                  {filtered.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                      {m.email ? ` · ${m.email}` : ''} · {m.status.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              )}
              {noSearchMatch && (
                <p className="text-xs text-muted-foreground">
                  No match in the church membership database. You can create them manually.
                </p>
              )}
              {!isLoading && filtered.length === 0 && !search.trim() && (
                <p className="text-xs text-muted-foreground">
                  No available members — all may already be assigned to a cell branch, or create a new
                  member below.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={addMember} disabled={busy || !selectedMemberId}>
                  Add to branch
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setCreateMode(true);
                    const parts = search.trim().split(/\s+/);
                    if (parts[0]) setFirstName(parts[0]);
                    if (parts.length > 1) setLastName(parts.slice(1).join(' '));
                  }}
                >
                  Create new member
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setPickerOpen(false);
                    resetPicker();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Create member and add to this branch</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="new-first">First name</Label>
                  <Input
                    id="new-first"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <Label htmlFor="new-last">Last name</Label>
                  <Input
                    id="new-last"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>
                <div>
                  <Label htmlFor="new-email">Email (optional)</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <Label htmlFor="new-phone">Phone (optional)</Label>
                  <Input
                    id="new-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={createAndAdd}
                  disabled={busy || !firstName.trim() || !lastName.trim()}
                >
                  {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                  Create &amp; add
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setCreateMode(false)}>
                  Back to search
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <ul className="grid max-h-36 gap-1.5 overflow-y-auto sm:grid-cols-2">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-1.5 rounded-md border border-border/60 px-2 py-1 text-xs"
          >
            <div>
              <span className="font-medium">
                {m.firstName} {m.lastName}
              </span>
              {m.email && (
                <span className="ml-2 text-xs text-muted-foreground">{m.email}</span>
              )}
            </div>
            {canManage && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-destructive"
                disabled={busy}
                onClick={() => removeMember(m.id)}
                aria-label={`Remove ${m.firstName} ${m.lastName}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
        {members.length === 0 && (
          <li className="text-sm text-muted-foreground">No members on this branch yet.</li>
        )}
      </ul>
    </div>
  );
}
