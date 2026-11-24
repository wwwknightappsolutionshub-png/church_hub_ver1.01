'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import type { AxiosError } from 'axios';
import {
  Download,
  Loader2,
  Plus,
  SlidersHorizontal,
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
import { isChurchLeadershipRole } from '@/lib/session-role';
import { isEstablishmentReadOnly } from '@/lib/establishment-access';
import { FollowUpCalendar } from '@/components/follow-up/FollowUpCalendar';
import { FollowUpArchivedTable } from '@/components/follow-up/FollowUpArchivedTable';
import { EstablishmentWorkerDashboard } from '@/components/follow-up/EstablishmentWorkerDashboard';
import { EstablishmentViewOnlyList } from '@/components/follow-up/EstablishmentViewOnlyList';
import { ModuleGate } from '@/components/app/ModuleGate';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import {
  buildFollowUpExportOptions,
  exportFollowUpPdf,
} from '@/lib/follow-up-pdf';
import { FOLLOW_UP_STAGES, STAGE_LABELS, sortByNewestFirst } from '@/lib/follow-up';
import {
  entryStageKey,
  stageFilterTabActiveClass,
  stageFilterTabClass,
} from '@/lib/pipeline-definition';
import { usePipelineDefinition } from '@/lib/hooks/use-pipeline-definition';
import { cn } from '@/lib/utils';
import {
  EnterpriseContent,
  EnterpriseHero,
  EnterpriseShell,
  EnterpriseTabNav,
} from '@/components/layout/EnterpriseModuleShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FollowUpStats {
  assigned?: number;
  pending: number;
  overdue: number;
  dueToday?: number;
  graduated?: number;
  remindersDue: number;
  archived?: number;
  archiveRequested?: number;
  byStage: Record<string, number>;
  accessMode?: string;
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
  if (status === 403) return 'You do not have permission to view Establishment.';
  if (status && status >= 500) return 'Server error — check API logs.';
  return 'Could not reach the API — ensure it is running on port 4000 with Postgres.';
}

function FollowUpPageContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { canManageMembers } = useMembershipAccess();
  const { userRoles, establishmentAccess } = useModuleAccess();
  const canExport = establishmentAccess.mode === 'manager';
  const canArchive = establishmentAccess.canArchive;
  const canRequestArchive = establishmentAccess.canRequestArchive;
  const canCreate = establishmentAccess.canCreate;
  const canAssign = establishmentAccess.canAssign;
  const canMutate = establishmentAccess.canMutate;
  const readOnly = isEstablishmentReadOnly(establishmentAccess);
  const isManager = establishmentAccess.mode === 'manager';
  const isWorker = establishmentAccess.mode === 'worker';
  const isViewOnlyChrome =
    establishmentAccess.mode === 'viewOnly' || establishmentAccess.mode === 'wsfLeader';
  const [view, setView] = useState<'pipeline' | 'table' | 'calendar' | 'archived'>(
    'pipeline',
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const fid = searchParams.get('followUpId');
    if (fid) setSelectedId(fid);
  }, [searchParams]);
  const [showNew, setShowNew] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('NEW_LEAD');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const filtersMenuRef = useRef<HTMLDivElement>(null);
  const filtersActive = Boolean(assigneeFilter || dateFrom || dateTo);

  useEffect(() => {
    if (!exportOpen && !filtersOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (exportOpen && !exportMenuRef.current?.contains(target)) {
        setExportOpen(false);
      }
      if (filtersOpen && !filtersMenuRef.current?.contains(target)) {
        setFiltersOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setExportOpen(false);
      setFiltersOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [exportOpen, filtersOpen]);

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
    { enabled: isManager && view === 'archived' },
  );
  const { data: stats } = useApiQuery<FollowUpStats>(['follow-up-stats'], '/follow-up/stats');
  const { data: assignees } = useApiQuery<Assignee[]>(['follow-up-assignees'], '/follow-up/assignees');
  const { data: templates } = useApiQuery<Template[]>(['follow-up-templates'], '/follow-up/templates');
  const {
    pipeline,
    stageKeys: resolvedStageKeys,
    labels: resolvedLabels,
  } = usePipelineDefinition({
    enabled: establishmentAccess.mode !== 'none',
  });

  const journeyStageKeys =
    resolvedStageKeys.length > 0 ? resolvedStageKeys : [...FOLLOW_UP_STAGES];
  const journeyLabels =
    Object.keys(resolvedLabels).length > 0 ? resolvedLabels : STAGE_LABELS;
  const defaultStage = entryStageKey(pipeline, journeyStageKeys[0] ?? 'NEW_LEAD');

  useEffect(() => {
    if (!journeyStageKeys.includes(stageFilter)) {
      setStageFilter(defaultStage);
    }
  }, [journeyStageKeys, stageFilter, defaultStage]);

  const exportOptions = useMemo(
    () => buildFollowUpExportOptions(pipeline),
    [pipeline],
  );
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

  const runExport = async (scope: (typeof exportOptions)[number]['scope']) => {
    try {
      await api.post('/follow-up/export-check');
      exportFollowUpPdf(filteredItems, scope, pipeline);
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
        title="Establishment"
        description={MODULE_DESCRIPTIONS.establishment}
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setShowNew(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Contact
            </Button>
          ) : undefined
        }
      />

      {isManager ? (
      <EnterpriseTabNav
        ariaLabel="Establishment views"
        tabs={[
          { id: 'pipeline', label: 'Membership Pipeline' },
          { id: 'table', label: 'Contact Directory' },
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
          setFiltersOpen(false);
          setView(id as 'pipeline' | 'table' | 'calendar' | 'archived');
        }}
        actions={
          <>
            {view !== 'calendar' && view !== 'archived' ? (
              <div className="relative" ref={filtersMenuRef}>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  className={cn(
                    'relative h-9 w-9 shrink-0 px-0',
                    filtersActive && 'border-primary/50 bg-primary/5',
                  )}
                  aria-expanded={filtersOpen}
                  aria-haspopup="dialog"
                  aria-label="Assignee and date filters"
                  title="Filters"
                  onClick={() => {
                    setExportOpen(false);
                    setFiltersOpen((o) => !o);
                  }}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {filtersActive ? (
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  ) : null}
                </Button>
                {filtersOpen ? (
                  <div
                    role="dialog"
                    aria-label="Assignee and date filters"
                    className="absolute right-0 z-30 mt-1 w-[min(100vw-2rem,18rem)] rounded-lg border border-border bg-card p-3 shadow-lg"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Filters
                      </p>
                      {filtersActive ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => {
                            setAssigneeFilter('');
                            setDateFrom('');
                            setDateTo('');
                          }}
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                    <div className="space-y-2.5">
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-foreground">Assignee</span>
                        <select
                          className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground"
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
                      </label>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-foreground">Captured date</span>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="date"
                            className="h-9 min-w-0 flex-1"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            aria-label="Captured from date"
                            title="Captured from"
                          />
                          <span className="shrink-0 text-xs text-muted-foreground">to</span>
                          <Input
                            type="date"
                            className="h-9 min-w-0 flex-1"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            aria-label="Captured to date"
                            title="Captured to"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {view === 'table' && canExport ? (
              <div className="relative" ref={exportMenuRef}>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  className="h-9 whitespace-nowrap"
                  aria-expanded={exportOpen}
                  aria-haspopup="menu"
                  onClick={() => {
                    setFiltersOpen(false);
                    setExportOpen((o) => !o);
                  }}
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
                    {exportOptions.map((opt) => (
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
          </>
        }
      />
      ) : null}

      <EnterpriseContent>
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading Establishment…</p>
          </div>
        )}

        {isError && !isLoading && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {followUpErrorMessage(error)}
          </div>
        )}

        {!isLoading && !isError && isWorker ? (
          <EstablishmentWorkerDashboard
            items={data ?? []}
            stats={{
              assigned: stats?.assigned ?? (data?.length ?? 0),
              pending: stats?.pending ?? 0,
              overdue: stats?.overdue ?? 0,
              dueToday: stats?.dueToday ?? 0,
              graduated: stats?.graduated ?? 0,
              byStage: stats?.byStage ?? {},
            }}
            selectedId={selectedId}
            onSelect={setSelectedId}
            pipeline={pipeline}
            onAdvance={canMutate ? advanceStage : undefined}
            advancing={advancing}
            canMutate={canMutate}
          />
        ) : null}

        {!isLoading && !isError && isViewOnlyChrome ? (
          <EstablishmentViewOnlyList
            items={data ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
            pipeline={pipeline}
            caption={
              establishmentAccess.mode === 'wsfLeader'
                ? 'WSF contacts assigned to your fellowship — view only.'
                : 'Prayer Squad view — contacts already assigned in Establishment (read only).'
            }
          />
        ) : null}

        {!isLoading && !isError && isManager ? (
          <>
        {view !== 'calendar' && view !== 'archived' && (
        <div
          className="mb-6 flex w-full flex-wrap gap-1.5 rounded-xl border border-dashed border-border bg-muted/20 p-2.5 sm:flex-nowrap"
          data-testid="pipeline-stage-filters"
          data-pipeline-source={pipeline?.source ?? 'static'}
        >
          {journeyStageKeys.map((stage) => {
            const n = stageSummaryItems.filter((f) => f.stage === stage).length;
            const active = stageFilter === stage;
            const label = journeyLabels[stage] ?? STAGE_LABELS[stage] ?? stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setStageFilter(stage)}
                className={cn(
                  'inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-center text-xs font-semibold transition',
                  stageFilterTabClass(pipeline, stage),
                  active && stageFilterTabActiveClass(pipeline, stage),
                )}
                aria-pressed={active}
                title={`Show: ${label}`}
                data-stage={stage}
              >
                <span className="truncate">
                  {label}: {n}
                </span>
              </button>
            );
          })}
        </div>
        )}

        {showPipelineEmpty && (
          <div className="mb-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <UserPlus className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 font-heading text-lg font-semibold text-foreground">Pipeline is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a New Contact manually or capture someone from Outreach — they appear here first.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {canCreate ? (
                <Button onClick={() => setShowNew(true)}>Add first New Contact</Button>
              ) : null}
              <Button variant="outline" asChild>
                <Link href="/dashboard/outreach">Go to Outreach</Link>
              </Button>
            </div>
          </div>
        )}

        {view === 'calendar' && (
          <FollowUpCalendar
            selectedId={selectedId}
            onSelect={setSelectedId}
            pipeline={pipeline}
          />
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
            pipeline={pipeline}
            onRecontacted={refresh}
          />
        )}

        {view === 'pipeline' && !showPipelineEmpty && (
            <FollowUpPipeline
              items={filteredItems}
              overviewItems={stageSummaryItems}
              activeStage={stageFilter}
              selectedId={selectedId}
              onSelect={setSelectedId}
              pipeline={pipeline}
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

        {view === 'table' && (
          <FollowUpTable
            items={filteredItems}
            selectedId={selectedId}
            onSelect={setSelectedId}
            pipeline={pipeline}
            onAdvance={canMutate ? advanceStage : undefined}
            advancing={advancing}
          />
        )}

        {view !== 'archived' && (
          <div className="mt-8 border-t border-border/60 pt-4">
            <FollowUpAutomationPanel />
          </div>
        )}
          </>
        ) : null}
      </EnterpriseContent>

      {canCreate ? (
        <FollowUpNewLeadSheet
          open={showNew}
          onClose={() => setShowNew(false)}
          onSuccess={refresh}
        />
      ) : null}

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
          canManageMembers={canManageMembers && !readOnly}
          canAssign={canAssign}
          canMutate={canMutate}
          readOnly={readOnly}
          showStageAudit={isManager}
          pipeline={pipeline}
          onClose={() => setSelectedId(null)}
          onUpdated={refresh}
          onAdvance={canMutate ? advanceStage : undefined}
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
