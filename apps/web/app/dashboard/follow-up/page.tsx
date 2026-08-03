'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import type { AxiosError } from 'axios';
import {
  Download,
  Loader2,
  Megaphone,
  Plus,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import {
  FollowUpPipeline,
  type FollowUpCard,
  type ProgressAdvancePayload,
} from '@/components/follow-up/FollowUpPipeline';
import { FollowUpTable } from '@/components/follow-up/FollowUpTable';
import { FollowUpDetailPanel } from '@/components/follow-up/FollowUpDetailPanel';
import { FollowUpNewLeadSheet } from '@/components/follow-up/FollowUpNewLeadSheet';
import { FollowUpAutomationPanel } from '@/components/follow-up/FollowUpAutomationPanel';
import { useMembershipAccess } from '@/lib/hooks/use-membership-access';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { canArchiveFollowUp, canExportOutreachDirectory, isChurchLeadershipRole } from '@/lib/session-role';
import { FollowUpCalendar } from '@/components/follow-up/FollowUpCalendar';
import { FollowUpArchivedTable } from '@/components/follow-up/FollowUpArchivedTable';
import { ModuleGate } from '@/components/app/ModuleGate';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import {
  FOLLOW_UP_EXPORT_OPTIONS,
  exportFollowUpPdf,
} from '@/lib/follow-up-pdf';
import {
  FOLLOW_UP_STAGES,
  STAGE_BADGE_CLASS,
  STAGE_LABELS,
  sortByNewestFirst,
} from '@/lib/follow-up';
import { cn } from '@/lib/utils';
import {
  EnterpriseContent,
  EnterpriseHero,
  EnterpriseShell,
  EnterpriseTabNav,
} from '@/components/layout/EnterpriseModuleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FollowUpStats {
  pending: number;
  overdue: number;
  remindersDue: number;
  archived?: number;
  archiveRequested?: number;
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
  stageAtTime?: string | null;
  kind?: string | null;
  author: { firstName: string; lastName: string };
}

function followUpErrorMessage(err: AxiosError | null) {
  const status = err?.response?.status;
  if (status === 401) return 'Session expired — please sign in again.';
  if (status === 403) return 'You do not have permission to view outreach.';
  if (status && status >= 500) return 'Server error — check API logs.';
  return 'Could not reach the API — ensure it is running on port 4000 with Postgres.';
}

function FollowUpPageContent() {
  const queryClient = useQueryClient();
  const { canManageMembers } = useMembershipAccess();
  const { userRoles } = useModuleAccess();
  const canExport = canExportOutreachDirectory(userRoles);
  const canArchive = canArchiveFollowUp(userRoles);
  const canRequestArchive = !canArchive;
  const [view, setView] = useState<'pipeline' | 'table' | 'calendar' | 'archived'>(
    'pipeline',
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (target && !exportMenuRef.current?.contains(target)) {
        setExportOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [exportOpen]);

  const listUrl = assigneeFilter
    ? `/follow-up?assignedToId=${encodeURIComponent(assigneeFilter)}`
    : '/follow-up';

  const { data, isLoading, isError, error } = useApiQuery<FollowUpCard[]>(
    ['follow-up', assigneeFilter],
    listUrl,
  );
  const { data: archivedData } = useApiQuery<FollowUpCard[]>(
    ['follow-up-archived'],
    '/follow-up?archived=1',
    { enabled: view === 'archived' },
  );
  const { data: stats } = useApiQuery<FollowUpStats>(['follow-up-stats'], '/follow-up/stats');
  const { data: assignees } = useApiQuery<Assignee[]>(['follow-up-assignees'], '/follow-up/assignees');
  const { data: templates } = useApiQuery<Template[]>(['follow-up-templates'], '/follow-up/templates');
  const { data: churchMembers } = useApiQuery<
    Array<{ id: string; firstName: string; lastName: string }>
  >(['membership-members-list'], '/membership/members', {
    retry: false,
    enabled: isChurchLeadershipRole(userRoles),
  });

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
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    const filtered = list.filter((f) => {
      if (stageFilter && f.stage !== stageFilter) return false;

      if (fromMs != null || toMs != null) {
        const raw = f.createdAt || f.dueAt;
        if (!raw) return false;
        const t = new Date(raw).getTime();
        if (Number.isNaN(t)) return false;
        if (fromMs != null && t < fromMs) return false;
        if (toMs != null && t > toMs) return false;
      }

      return true;
    });

    return sortByNewestFirst(filtered);
  }, [data, stageFilter, dateFrom, dateTo]);

  /** Stage chips use date-filtered counts (ignore stage dropdown so totals stay visible). */
  const stageSummaryItems = useMemo(() => {
    const list = data ?? [];
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    if (fromMs == null && toMs == null) return list;
    return list.filter((f) => {
      const raw = f.createdAt || f.dueAt;
      if (!raw) return false;
      const t = new Date(raw).getTime();
      if (Number.isNaN(t)) return false;
      if (fromMs != null && t < fromMs) return false;
      if (toMs != null && t > toMs) return false;
      return true;
    });
  }, [data, dateFrom, dateTo]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['follow-up'] });
    queryClient.invalidateQueries({ queryKey: ['follow-up-archived'] });
    queryClient.invalidateQueries({ queryKey: ['follow-up-stats'] });
    queryClient.invalidateQueries({ queryKey: ['follow-up-calendar'] });
    if (selectedId) {
      queryClient.invalidateQueries({ queryKey: ['follow-up-detail', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['pastoral-notes', selectedId] });
    }
  };

  const [advancing, setAdvancing] = useState(false);

  const runArchiveAction = async (
    fn: () => Promise<unknown>,
    successMsg: string,
  ) => {
    setArchiveBusy(true);
    try {
      await fn();
      toast.success(successMsg);
      refresh();
    } catch {
      toast.error('Could not update archive status');
      throw new Error('archive failed');
    } finally {
      setArchiveBusy(false);
    }
  };

  const advanceStage = async (id: string, payload: ProgressAdvancePayload) => {
    setAdvancing(true);
    try {
      await api.patch(`/follow-up/${id}/stage`, {
        stage: payload.stage,
        whatWasDone: payload.whatWasDone,
        whatNext: payload.whatNext,
        dueAt: payload.dueAt ? new Date(payload.dueAt).toISOString() : undefined,
      });
      toast.success('Advanced to next stage');
      queryClient.invalidateQueries({ queryKey: ['pastoral-notes', id] });
      refresh();
    } catch {
      toast.error('Could not update stage');
      throw new Error('advance failed');
    } finally {
      setAdvancing(false);
    }
  };

  const runExport = async (scope: (typeof FOLLOW_UP_EXPORT_OPTIONS)[number]['scope']) => {
    try {
      await api.post('/follow-up/export-check');
      exportFollowUpPdf(filteredItems, scope);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Export requires Admin, Pastor, or Follow-up Leader permission');
    } finally {
      setExportOpen(false);
    }
  };

  const showPipelineEmpty =
    view === 'pipeline' && !isLoading && !isError && (data?.length ?? 0) === 0;

  return (
    <EnterpriseShell>
      <EnterpriseHero
        eyebrow="Discipleship"
        title="Outreach"
        description={MODULE_DESCRIPTIONS.followUp}
        actions={
          <>
            <Button size="sm" onClick={() => setShowNew(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Fresh Contact
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <Link href="/dashboard/outreach">
                <Megaphone className="mr-1.5 h-4 w-4" />
                Field capture
              </Link>
            </Button>
          </>
        }
        badge={
          stats ? (
            <div className="grid grid-cols-3 gap-2 text-slate-900 sm:grid-cols-4">
              {[
                { label: 'Active', value: stats.pending },
                { label: 'Overdue', value: stats.overdue },
                { label: 'Reminders', value: stats.remindersDue },
                { label: 'Archive req.', value: stats.archiveRequested ?? 0 },
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
        ariaLabel="Outreach views"
        tabs={[
          { id: 'pipeline', label: 'Pipeline' },
          { id: 'table', label: 'Outreach Directory' },
          { id: 'calendar', label: 'Calendar' },
          {
            id: 'archived',
            label:
              stats?.archived != null && stats.archived > 0
                ? `Archived (${stats.archived})`
                : 'Archived Leads',
          },
        ]}
        active={view}
        onChange={(id) => {
          setExportOpen(false);
          setView(id as 'pipeline' | 'table' | 'calendar' | 'archived');
        }}
        actions={
          <>
            {view === 'table' && canExport ? (
              <div className="relative" ref={exportMenuRef}>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  className="h-9 whitespace-nowrap"
                  aria-expanded={exportOpen}
                  aria-haspopup="menu"
                  onClick={() => setExportOpen((o) => !o)}
                  disabled={filteredItems.length === 0}
                >
                  <Download className="mr-1.5 h-4 w-4 shrink-0" />
                  Export PDF
                </Button>
                {exportOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 z-30 mt-1 w-64 rounded-lg border border-border bg-card p-1 shadow-lg"
                  >
                    {FOLLOW_UP_EXPORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        role="menuitem"
                        className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => runExport(opt.scope)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {stats ? (
              <Badge variant="outline" className="hidden h-9 items-center whitespace-nowrap sm:inline-flex">
                <Sparkles className="mr-1 h-3 w-3" />
                {stats.pending} in pipeline
                {(stats.archiveRequested ?? 0) > 0
                  ? ` · ${stats.archiveRequested} archive requests`
                  : ''}
              </Badge>
            ) : null}
          </>
        }
      />

      <EnterpriseContent className="max-w-[1600px]">
        {view !== 'calendar' && view !== 'archived' && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex min-w-[200px] flex-1 flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/20 p-2.5">
            {FOLLOW_UP_STAGES.map((stage) => {
              const n = stageSummaryItems.filter((f) => f.stage === stage).length;
              const active = stageFilter === stage;
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setStageFilter((prev) => (prev === stage ? '' : stage))}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                    STAGE_BADGE_CLASS[stage] ?? 'border-border bg-card text-foreground',
                    active && 'ring-2 ring-primary/50',
                  )}
                  aria-pressed={active}
                  title={`Filter: ${STAGE_LABELS[stage]}`}
                >
                  {STAGE_LABELS[stage]}: {n}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              aria-label="Filter by assignee"
            >
              <option value="">All assignees</option>
              {(assignees ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.firstName} {a.lastName}
                </option>
              ))}
            </select>
            <Input
              type="date"
              className="h-10 w-auto min-w-[9.5rem]"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Captured from date"
              title="Captured from"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              className="h-10 w-auto min-w-[9.5rem]"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Captured to date"
              title="Captured to"
            />
          </div>
        </div>
        )}

        {view !== 'calendar' && view !== 'archived' && isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading pipeline…</p>
          </div>
        )}

        {view !== 'calendar' && view !== 'archived' && isError && !isLoading && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {followUpErrorMessage(error)}
          </div>
        )}

        {!isLoading && !isError && filteredItems.length === 0 && (data?.length ?? 0) > 0 && view !== 'calendar' && view !== 'archived' && (
          <p className="mb-4 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            No matches for the current filters. Clear stage or date to see more people.
          </p>
        )}

        {showPipelineEmpty && (
          <div className="mb-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <UserPlus className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 font-heading text-lg font-semibold text-foreground">Pipeline is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a Fresh Contact manually or capture someone from Field Outreach — they appear here
              first.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={() => setShowNew(true)}>Add first Fresh Contact</Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/outreach">Go to Field Outreach</Link>
              </Button>
            </div>
          </div>
        )}

        {view === 'calendar' && (
          <FollowUpCalendar selectedId={selectedId} onSelect={setSelectedId} />
        )}

        {view === 'archived' && (
          <FollowUpArchivedTable
            items={(archivedData ?? []).map((f) => ({
              id: f.id,
              contactName: f.contactName,
              contactPhone: f.contactPhone,
              contactEmail: f.contactEmail,
              stage: f.stage,
              archiveReason: (f as { archiveReason?: string | null }).archiveReason,
              archivedAt: (f as { archivedAt?: string | null }).archivedAt,
              archivedBy: (f as { archivedBy?: { firstName: string; lastName: string } | null })
                .archivedBy,
            }))}
            canRecontact={canArchive}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRecontacted={refresh}
          />
        )}

        {view === 'pipeline' &&
          !isLoading &&
          !isError &&
          (filteredItems.length > 0 || (data?.length ?? 0) === 0) && (
            <FollowUpPipeline
              items={filteredItems}
              selectedId={selectedId}
              onSelect={setSelectedId}
              canArchive={canArchive}
              canRequestArchive={canRequestArchive}
              archiveBusy={archiveBusy}
              onArchive={(id, reason) =>
                runArchiveAction(
                  () => api.post(`/follow-up/${id}/archive`, { reason }),
                  'Lead archived',
                )
              }
              onRequestArchive={(id, reason) =>
                runArchiveAction(
                  () => api.post(`/follow-up/${id}/archive-request`, { reason }),
                  'Archive request sent to leaders',
                )
              }
              onApproveArchive={(id, reason) =>
                runArchiveAction(
                  () => api.post(`/follow-up/${id}/archive-request/approve`, { reason }),
                  'Archive approved',
                )
              }
              onDeclineArchive={(id, note) =>
                runArchiveAction(
                  () => api.post(`/follow-up/${id}/archive-request/decline`, { note }),
                  'Archive request declined',
                )
              }
            />
          )}

        {view === 'table' && !isLoading && !isError && (
          <FollowUpTable
            items={filteredItems}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdvance={advanceStage}
            advancing={advancing}
          />
        )}

        {view !== 'archived' && (
          <div className="mt-8 border-t border-border/60 pt-4">
            <FollowUpAutomationPanel />
          </div>
        )}
      </EnterpriseContent>

      <FollowUpNewLeadSheet
        open={showNew}
        onClose={() => setShowNew(false)}
        onSuccess={refresh}
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
          onAdvance={advanceStage}
          advancing={advancing}
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
