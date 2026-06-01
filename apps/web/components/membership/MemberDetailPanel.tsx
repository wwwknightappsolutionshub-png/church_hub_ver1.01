'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Home,
  Link2,
  Loader2,
  Pencil,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  MEMBER_STATUSES,
  ROLE_LABELS,
  SELECTABLE_ROLES,
  STATUS_LABELS,
  STATUS_VARIANT,
  formatMemberName,
  onboardingProgress,
} from '@/lib/membership';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MemberTimelinePanel } from '@/components/membership/MemberTimelinePanel';

interface MemberDetail {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  roles: string[];
  ministryInterests: string[];
  onboardingStep: number;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  bornAgain?: boolean | null;
  baptizedInHolySpirit?: boolean | null;
  family?: { id: string; name: string } | null;
  parentLinks?: Array<{ child: { id: string; firstName: string; lastName: string } }>;
  childLinks?: Array<{ parent: { id: string; firstName: string; lastName: string } }>;
}

interface MemberDetailPanelProps {
  member: MemberDetail;
  allMembers: Array<{ id: string; firstName: string; lastName: string }>;
  ministryOptions: string[];
  canManageMembers: boolean;
  onClose: () => void;
  onEditOnboarding: () => void;
  onDeleted?: () => void;
}

const ADMIN_ASSIGNABLE_ROLES = ['ADMIN', 'PASTOR'] as const;

export function MemberDetailPanel({
  member,
  allMembers,
  ministryOptions,
  canManageMembers,
  onClose,
  onEditOnboarding,
  onDeleted,
}: MemberDetailPanelProps) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [detailTab, setDetailTab] = useState<'profile' | 'timeline'>('profile');
  const [linkChildId, setLinkChildId] = useState('');
  const [form, setForm] = useState({
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email ?? '',
    phone: member.phone ?? '',
    notes: member.notes ?? '',
    roles: [...member.roles],
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['membership'] });

  const advanceStatus = async () => {
    if (!canManageMembers) return;
    setBusy(true);
    try {
      await api.post(`/membership/members/${member.id}/status/advance`);
      toast.success('Status advanced');
      refresh();
      onClose();
    } catch {
      toast.error('Cannot advance further');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: string) => {
    if (!canManageMembers) return;
    setBusy(true);
    try {
      await api.patch(`/membership/members/${member.id}/status`, { status });
      toast.success('Status updated');
      refresh();
    } catch {
      toast.error('Could not update status');
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      await api.patch(`/membership/members/${member.id}`, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email || undefined,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
        roles: form.roles,
      });
      toast.success('Member updated');
      setEditing(false);
      refresh();
    } catch {
      toast.error('Could not save — Member Admin permission required');
    } finally {
      setBusy(false);
    }
  };

  const deleteMember = async () => {
    if (!window.confirm(`Remove ${formatMemberName(member)} from membership?`)) return;
    setBusy(true);
    try {
      await api.delete(`/membership/members/${member.id}`);
      toast.success('Member removed');
      onDeleted?.();
      onClose();
    } catch {
      toast.error('Could not delete — Member Admin permission required');
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = (role: string) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }));
  };

  const toggleMinistry = async (tag: string) => {
    if (!canManageMembers) return;
    const next = member.ministryInterests.includes(tag)
      ? member.ministryInterests.filter((t) => t !== tag)
      : [...member.ministryInterests, tag];
    setBusy(true);
    try {
      await api.patch(`/membership/members/${member.id}`, { ministryInterests: next });
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const linkGuardian = async () => {
    if (!canManageMembers || !linkChildId) return;
    setBusy(true);
    try {
      await api.post(`/membership/members/${member.id}/guardian`, { childId: linkChildId });
      toast.success('Family link added');
      setLinkChildId('');
      refresh();
    } catch {
      toast.error('Could not link member');
    } finally {
      setBusy(false);
    }
  };

  const progress = onboardingProgress(member.onboardingStep);
  const inOnboarding = member.onboardingStep > 0 && member.onboardingStep < 6;

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-border bg-card shadow-elevated">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <div>
            <p className="font-heading font-semibold">{formatMemberName(member)}</p>
            <Badge variant={STATUS_VARIANT[member.status] ?? 'outline'}>
              {STATUS_LABELS[member.status]}
            </Badge>
          </div>
        </div>
        <div className="flex gap-1">
          {canManageMembers && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditing((v) => !v)}
              title={editing ? 'Cancel edit' : 'Edit member'}
            >
              <Pencil className="h-5 w-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border px-5">
        <button
          type="button"
          className={cn(
            'border-b-2 px-3 py-2 text-sm font-medium transition',
            detailTab === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground',
          )}
          onClick={() => setDetailTab('profile')}
        >
          Profile
        </button>
        <button
          type="button"
          className={cn(
            'border-b-2 px-3 py-2 text-sm font-medium transition',
            detailTab === 'timeline'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground',
          )}
          onClick={() => setDetailTab('timeline')}
        >
          Service history
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {detailTab === 'timeline' && <MemberTimelinePanel memberId={member.id} />}

        {detailTab === 'profile' && (
          <>
        {!canManageMembers && (
          <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            View only — changes require Church Admin, Pastor, or a Member profile with the Admin role.
          </p>
        )}

        {editing && canManageMembers && (
          <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-medium">Edit member</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
              <Input
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
            <Input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <textarea
              className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Roles</p>
              <div className="flex flex-wrap gap-1">
                {SELECTABLE_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                      form.roles.includes(role)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border opacity-70',
                    )}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
                {ADMIN_ASSIGNABLE_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                      form.roles.includes(role)
                        ? 'border-secondary bg-secondary/15'
                        : 'border-border opacity-70',
                    )}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={busy} onClick={saveProfile}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {inOnboarding && (
          <div className="rounded-lg border border-gold/30 bg-gold/5 p-3">
            <p className="text-sm font-medium">Onboarding in progress</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <Button size="sm" variant="outline" className="mt-3" onClick={onEditOnboarding}>
              Continue onboarding
            </Button>
          </div>
        )}

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h3>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{member.email ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{member.phone ?? '—'}</dd>
            </div>
            {(member.address || member.city) && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Location</dt>
                <dd className="text-right">
                  {[member.address, member.city].filter(Boolean).join(', ')}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Roles</h3>
          <div className="mt-2 flex flex-wrap gap-1">
            {member.roles.map((r) => (
              <Badge key={r} variant="outline">
                {ROLE_LABELS[r] ?? r}
              </Badge>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ministry interests
          </h3>
          <div className="flex flex-wrap gap-1">
            {ministryOptions.map((tag) => (
              <button
                key={tag}
                type="button"
                disabled={busy || !canManageMembers}
                onClick={() => toggleMinistry(tag)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  member.ministryInterests.includes(tag)
                    ? 'border-secondary bg-secondary/15'
                    : 'border-border opacity-60 hover:opacity-100',
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Home className="h-3.5 w-3.5" />
            Family
          </h3>
          {member.family ? (
            <p className="mt-2 text-sm font-medium">{member.family.name}</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Not linked to a household</p>
          )}
          {(member.parentLinks?.length ?? 0) > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">Guardian of</p>
              <ul className="mt-1 space-y-1 text-sm">
                {member.parentLinks!.map((l) => (
                  <li key={l.child.id}>
                    {l.child.firstName} {l.child.lastName}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(member.childLinks?.length ?? 0) > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">Linked parent/guardian</p>
              <ul className="mt-1 space-y-1 text-sm">
                {member.childLinks!.map((l) => (
                  <li key={l.parent.id}>
                    {l.parent.firstName} {l.parent.lastName}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <select
              className="flex h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              value={linkChildId}
              onChange={(e) => setLinkChildId(e.target.value)}
            >
              <option value="">Link child / dependent…</option>
              {allMembers
                .filter((m) => m.id !== member.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canManageMembers || !linkChildId || busy}
              onClick={linkGuardian}
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lifecycle</h3>
          <div className="mt-2 flex flex-wrap gap-1">
            {MEMBER_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy || !canManageMembers}
                onClick={() => setStatus(s)}
                className={cn(
                  'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                  member.status === s ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80',
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <Button
            className="mt-3 w-full"
            variant="outline"
            size="sm"
            disabled={!canManageMembers || busy || member.status === 'DISCIPLED'}
            onClick={advanceStatus}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                Advance to next stage
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </>
            )}
          </Button>
        </section>

        {!editing &&
          (member.bornAgain != null || member.baptizedInHolySpirit != null) && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Landing registration
              </h3>
              <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
                {member.bornAgain != null && (
                  <div className="flex justify-between gap-4">
                    <dt>Born again</dt>
                    <dd className="font-medium text-foreground">
                      {member.bornAgain ? 'Yes' : 'No'}
                    </dd>
                  </div>
                )}
                {member.baptizedInHolySpirit != null && (
                  <div className="flex justify-between gap-4">
                    <dt>Baptized in the Holy Spirit</dt>
                    <dd className="font-medium text-foreground">
                      {member.baptizedInHolySpirit ? 'Yes' : 'No'}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

        {member.notes && !editing && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</h3>
            <p className="mt-2 text-sm text-muted-foreground">{member.notes}</p>
          </section>
        )}

        {canManageMembers && (
          <section className="border-t border-border pt-4">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              disabled={busy}
              onClick={deleteMember}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete member
                </>
              )}
            </Button>
          </section>
        )}
          </>
        )}
      </div>
    </div>
  );
}
