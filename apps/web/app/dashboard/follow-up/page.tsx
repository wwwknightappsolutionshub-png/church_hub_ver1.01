'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import type { AxiosError } from 'axios';
import {
  AlertCircle,
  Bell,
  Filter,
  HeartHandshake,
  Loader2,
  Megaphone,
  Plus,
  Search,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { FollowUpPipeline, type FollowUpCard } from '@/components/follow-up/FollowUpPipeline';
import { FollowUpDetailPanel } from '@/components/follow-up/FollowUpDetailPanel';
import { FollowUpNewLeadSheet } from '@/components/follow-up/FollowUpNewLeadSheet';
import { FollowUpMembersPanel } from '@/components/follow-up/FollowUpMembersPanel';
import { FollowUpAutomationPanel } from '@/components/follow-up/FollowUpAutomationPanel';
import { useMembershipAccess } from '@/lib/hooks/use-membership-access';
import { ModuleGate } from '@/components/app/ModuleGate';
import {
  EnterpriseContent,
  EnterpriseHero,
  EnterpriseShell,
  EnterpriseTabNav,
} from '@/components/layout/EnterpriseModuleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FollowUpStats {
  pending: number;
  overdue: number;
  remindersDue: number;
  byStage: Record<string, number>;
}

interface Assignee {
  id: string;
  firstName: string;
  lastName: string;
}

interface Template {
  id: string;
  name: string;
  channel: string;
  subject?: string | null;
  body: string;
}

interface PastoralNote {
  id: string;
  content: string;
  isConfidential: boolean;
  createdAt: string;
  author: { firstName: string; lastName: string };
}

function followUpErrorMessage(err: AxiosError | null) {
  const status = err?.response?.status;
  if (status === 401) return 'Session expired — please sign in again.';
  if (status === 403) return 'You do not have permission to view follow-ups.';
  if (status && status >= 500) return 'Server error — check API logs.';
  return 'Could not reach the API — ensure it is running on port 4000 with Postgres.';
}

function FollowUpPageContent() {
  const queryClient = useQueryClient();
  const { canManageMembers } = useMembershipAccess();
  const [view, setView] = useState<'pipeline' | 'members'>('pipeline');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [newForm, setNewForm] = useState({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    assignedToId: '',
    dueAt: '',
  });
  const [creating, setCreating] = useState(false);

  const listUrl = assigneeFilter
    ? `/follow-up?assignedToId=${encodeURIComponent(assigneeFilter)}`
    : '/follow-up';

  const { data, isLoading, isError, error } = useApiQuery<FollowUpCard[]>(
    ['follow-up', assigneeFilter],
    listUrl,
  );
  const { data: stats } = useApiQuery<FollowUpStats>(['follow-up-stats'], '/follow-up/stats');
  const { data: assignees } = useApiQuery<Assignee[]>(['follow-up-assignees'], '/follow-up/assignees');
  const { data: templates } = useApiQuery<Template[]>(['follow-up-templates'], '/follow-up/templates');
  const { data: churchMembers } = useApiQuery<
    Array<{ id: string; firstName: string; lastName: string }>
  >(['membership-members-list'], '/membership/members', { retry: false });

  const { data: selectedDetail } = useApiQuery<
    FollowUpCard & { reminders: FollowUpCard['reminders'] }
  >(['follow-up-detail', selectedId ?? ''], `/follow-up/${selectedId}`, {
    enabled: !!selectedId,
  });

  const { data: pastoralNotes } = useApiQuery<PastoralNote[]>(
    ['pastoral-notes', selectedId ?? ''],
    `/follow-up/pastoral-notes?followUpId=${selectedId}`,
    { enabled: !!selectedId, retry: false },
  );

  const filteredItems = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (f) =>
        f.contactName.toLowerCase().includes(q) ||
        f.contactPhone?.includes(q) ||
        f.contactEmail?.toLowerCase().includes(q) ||
        f.assignedTo?.firstName.toLowerCase().includes(q) ||
        f.assignedTo?.lastName.toLowerCase().includes(q),
    );
  }, [data, search]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['follow-up'] });
    queryClient.invalidateQueries({ queryKey: ['follow-up-stats'] });
    if (selectedId) {
      queryClient.invalidateQueries({ queryKey: ['follow-up-detail', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['pastoral-notes', selectedId] });
    }
  };

  const advanceStage = async (id: string, stage: string) => {
    try {
      await api.patch(`/follow-up/${id}/stage`, { stage });
      toast.success('Stage updated');
      refresh();
    } catch {
      toast.error('Could not update stage');
    }
  };

  const createLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.contactName.trim()) return;
    setCreating(true);
    try {
      await api.post('/follow-up', {
        contactName: newForm.contactName.trim(),
        contactPhone: newForm.contactPhone || undefined,
        contactEmail: newForm.contactEmail || undefined,
        assignedToId: newForm.assignedToId || undefined,
        dueAt: newForm.dueAt ? new Date(newForm.dueAt).toISOString() : undefined,
        scheduleReminder: !!newForm.dueAt,
        reminderChannel: 'WHATSAPP',
      });
      toast.success('New lead added to pipeline');
      setNewForm({ contactName: '', contactPhone: '', contactEmail: '', assignedToId: '', dueAt: '' });
      setShowNew(false);
      refresh();
    } catch {
      toast.error('Could not create follow-up');
    } finally {
      setCreating(false);
    }
  };

  return (
    <EnterpriseShell>
      <EnterpriseHero
        eyebrow="Discipleship"
        title="Follow-Up"
        description="End-to-end discipleship pipeline from outreach capture through cell placement, with governed lead creation and team notifications."
        actions={
          <>
            <Button size="sm" onClick={() => setShowNew(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New lead
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <Link href="/dashboard/outreach">
                <Megaphone className="mr-1.5 h-4 w-4" />
                Fast capture
              </Link>
            </Button>
          </>
        }
        badge={
          stats ? (
            <div className="grid grid-cols-3 gap-2 text-slate-900">
              {[
                { label: 'Active', value: stats.pending },
                { label: 'Overdue', value: stats.overdue },
                { label: 'Reminders', value: stats.remindersDue },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-slate-600/50 bg-slate-800/80 px-3 py-2 text-center"
                >
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
          ) : undefined
        }
      />

      <EnterpriseTabNav
        ariaLabel="Follow-up views"
        tabs={[
          { id: 'pipeline', label: 'Pipeline' },
          { id: 'members', label: 'Members' },
        ]}
        active={view}
        onChange={(id) => setView(id as 'pipeline' | 'members')}
      />

      <EnterpriseContent className="max-w-[1600px]">
        <div className="mb-6">
          <FollowUpAutomationPanel />
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, email, assignee…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
            >
              <option value="">All assignees</option>
              {(assignees ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.firstName} {a.lastName}
                </option>
              ))}
            </select>
          </div>
          {stats && (
            <Badge variant="outline" className="hidden sm:inline-flex">
              <Sparkles className="mr-1 h-3 w-3" />
              {stats.pending} in pipeline
            </Badge>
          )}
        </div>
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading pipeline…</p>
          </div>
        )}

        {isError && !isLoading && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {followUpErrorMessage(error)}
          </div>
        )}

        {!isLoading && !isError && filteredItems.length === 0 && (data?.length ?? 0) > 0 && (
          <p className="mb-4 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            No matches for &quot;{search}&quot;. Clear search to see all leads.
          </p>
        )}

        {!isLoading && !isError && (data?.length ?? 0) === 0 && (
          <div className="mb-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <UserPlus className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 font-heading text-lg font-semibold text-foreground">Pipeline is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a lead manually or capture someone from Outreach — they appear here as New Lead.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={() => setShowNew(true)}>Add first lead</Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/outreach">Go to Outreach</Link>
              </Button>
            </div>
          </div>
        )}

        {view === 'members' && (
          <FollowUpMembersPanel canManageMembers={canManageMembers} />
        )}

        {view === 'pipeline' && !isLoading && !isError && (filteredItems.length > 0 || (data?.length ?? 0) === 0) && (
          <FollowUpPipeline
            items={filteredItems}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdvance={advanceStage}
          />
        )}
      </EnterpriseContent>

      <FollowUpNewLeadSheet
        open={showNew}
        form={newForm}
        assignees={assignees ?? []}
        creating={creating}
        onChange={setNewForm}
        onClose={() => setShowNew(false)}
        onSubmit={createLead}
      />

      {selectedId && selectedDetail && (
        <FollowUpDetailPanel
          followUp={{
            ...selectedDetail,
            reminders: selectedDetail.reminders ?? [],
          }}
          assignees={assignees ?? []}
          templates={templates ?? []}
          pastoralNotes={pastoralNotes ?? []}
          members={(churchMembers ?? []).map((m) => ({
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
          }))}
          canManageMembers={canManageMembers}
          onClose={() => setSelectedId(null)}
          onUpdated={refresh}
        />
      )}
    </EnterpriseShell>
  );
}

export default function FollowUpPage() {
  return (
    <ModuleGate gate="followUp">
      <FollowUpPageContent />
    </ModuleGate>
  );
}
