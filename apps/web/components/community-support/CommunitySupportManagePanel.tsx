'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ManageRequest {
  id: string;
  requestType: 'JOB_SEARCH' | 'BUSINESS_SEARCH';
  title: string;
  description: string;
  location?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  skills?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  approvedAt?: string | null;
  validUntil?: string | null;
  member: { id: string; firstName: string; lastName: string; email?: string | null };
  approvedBy?: { firstName: string; lastName: string; email?: string | null } | null;
}

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
}

type SupportForm = {
  memberId: string;
  requestType: ManageRequest['requestType'];
  title: string;
  description: string;
  location: string;
  skills: string;
  status: ManageRequest['status'];
  validUntil: string;
};

const emptyForm: SupportForm = {
  memberId: '',
  requestType: 'JOB_SEARCH',
  title: '',
  description: '',
  location: '',
  skills: '',
  status: 'PENDING',
  validUntil: '',
};

function toLocalInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CommunitySupportManagePanel() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<SupportForm>(emptyForm);

  const url =
    filter === 'PENDING'
      ? '/community-support/manage?status=PENDING'
      : filter === 'APPROVED'
        ? '/community-support/manage?status=APPROVED'
        : '/community-support/manage';

  const { data, isLoading } = useApiQuery<ManageRequest[]>(['community-support-manage', filter], url);
  const members = useApiQuery<MemberOption[]>(['konnect-members-cs'], '/business/members');

  const rows = data ?? [];
  const pendingCount = useMemo(() => rows.filter((r) => r.status === 'PENDING').length, [rows]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['community-support-manage'] });

  const startEdit = (row: ManageRequest) => {
    setEditingId(row.id);
    setShowCreate(false);
    setForm({
      memberId: row.member.id,
      requestType: row.requestType,
      title: row.title,
      description: row.description,
      location: row.location ?? '',
      skills: row.skills ?? '',
      status: row.status,
      validUntil: toLocalInput(row.validUntil),
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId(editingId ?? 'new');
    try {
      const payload = {
        memberId: form.memberId,
        requestType: form.requestType,
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim() || undefined,
        skills: form.skills.trim() || undefined,
        status: form.status,
        validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : undefined,
      };
      if (editingId) {
        await api.patch(`/community-support/manage/${editingId}`, {
          requestType: payload.requestType,
          title: payload.title,
          description: payload.description,
          location: payload.location,
          skills: payload.skills,
          status: payload.status,
          validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
        });
        toast.success('Request updated');
      } else {
        await api.post('/community-support/manage', payload);
        toast.success('Request created');
      }
      setEditingId(null);
      setShowCreate(false);
      setForm(emptyForm);
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Save failed'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this job request permanently?')) return;
    setBusyId(id);
    try {
      await api.delete(`/community-support/manage/${id}`);
      toast.success('Deleted');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Delete failed'));
    } finally {
      setBusyId(null);
    }
  };

  const quickApprove = async (id: string) => {
    setBusyId(id);
    try {
      await api.patch(`/community-support/${id}/approve`, { validityDays: 90 });
      toast.success('Approved for 90 days on landing & Job Board');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Approve failed'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Submitted dates, approval dates, and validity windows control visibility on the public Community
          Support ticker. Expired listings are hidden automatically.
        </p>
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'PENDING', 'APPROVED'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
            >
              {f === 'PENDING' ? `Pending (${pendingCount})` : f.charAt(0) + f.slice(1).toLowerCase()}
            </Button>
          ))}
          <Button size="sm" onClick={() => { setShowCreate(true); setEditingId(null); setForm(emptyForm); }}>
            <Plus className="mr-1 h-4 w-4" />
            New request
          </Button>
        </div>
      </div>

      {(showCreate || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editingId ? 'Edit request' : 'Create request'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
              {!editingId && (
                <select
                  className="h-10 rounded-md border px-3 text-sm sm:col-span-2"
                  value={form.memberId}
                  onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                  required
                >
                  <option value="">Member…</option>
                  {(members.data ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
              )}
              <select
                className="h-10 rounded-md border px-3 text-sm"
                value={form.requestType}
                onChange={(e) =>
                  setForm({ ...form, requestType: e.target.value as 'JOB_SEARCH' | 'BUSINESS_SEARCH' })
                }
              >
                <option value="JOB_SEARCH">Job search</option>
                <option value="BUSINESS_SEARCH">Business search</option>
              </select>
              <select
                className="h-10 rounded-md border px-3 text-sm"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as 'PENDING' | 'APPROVED' | 'REJECTED' })
                }
              >
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <Input
                className="sm:col-span-2"
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <textarea
                className="min-h-[80px] rounded-md border px-3 py-2 text-sm sm:col-span-2"
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
              <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <Input placeholder="Skills / hint" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground">Valid until (when approved)</label>
                <Input
                  type="datetime-local"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={!!busyId} className="sm:col-span-2">
                {busyId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No requests yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">{row.title}</CardTitle>
                  <Badge variant={row.status === 'APPROVED' ? 'success' : 'outline'}>{row.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.requestType === 'JOB_SEARCH' ? 'Job search' : 'Business search'} ·{' '}
                  {row.member.firstName} {row.member.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(row.createdAt).toLocaleString()}
                  {row.approvedAt ? ` · Approved ${new Date(row.approvedAt).toLocaleString()}` : ''}
                  {row.validUntil ? ` · Valid until ${new Date(row.validUntil).toLocaleDateString()}` : ''}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{row.description}</p>
                <div className="flex flex-wrap gap-2">
                  {row.status === 'PENDING' && (
                    <Button size="sm" disabled={busyId === row.id} onClick={() => quickApprove(row.id)}>
                      <Check className="mr-1 h-4 w-4" />
                      Approve (90d)
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn('text-destructive')}
                    disabled={busyId === row.id}
                    onClick={() => remove(row.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
