'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  ListChecks,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FOLLOW_UP_STAGES,
  STAGE_BADGE_CLASS,
  STAGE_LABELS,
  sortByNewestFirst,
} from '@/lib/follow-up';
import {
  enabledStages,
  stageBadgeClass,
  stageLabelMap,
  type ResolvedPipeline,
} from '@/lib/pipeline-definition';
import type { FollowUpCard, ProgressAdvancePayload } from '@/components/follow-up/FollowUpPipeline';
import { FollowUpTable } from '@/components/follow-up/FollowUpTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface WorkerDashboardStats {
  assigned: number;
  pending: number;
  overdue: number;
  dueToday: number;
  graduated: number;
  byStage: Record<string, number>;
}

type WorkerFocus =
  | 'assigned'
  | 'pipeline'
  | 'stages'
  | 'graduated'
  | 'overdue'
  | 'dueToday';

const FALLBACK_GRADUATED = new Set(['JOINED_GROUP', 'ENLISTED_FOR_BAPTISM']);

function graduatedSet(pipeline?: ResolvedPipeline | null) {
  const fromApi = enabledStages(pipeline)
    .filter((s) => s.graduatesSla)
    .map((s) => s.key);
  return new Set(fromApi.length ? fromApi : FALLBACK_GRADUATED);
}

/** 12–24h after last assign or stage advance. */
function isDueTodayByProgress(
  lastProgressAt?: string | null,
  assignedAt?: string | null,
  now = Date.now(),
  afterMs = 12 * 60 * 60 * 1000,
  untilMs = 24 * 60 * 60 * 1000,
) {
  const raw = lastProgressAt ?? assignedAt;
  if (!raw) return false;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return false;
  const elapsed = now - t;
  return elapsed >= afterMs && elapsed < untilMs;
}

/** Past dueAt, or still on assignment stage after 72h. */
function isOverdueContact(
  f: {
    stage: string;
    dueAt?: string | null;
    assignedAt?: string | null;
    stageAtAssignment?: string | null;
    assignedToId?: string | null;
    assignedTo?: { id: string } | null;
  },
  now = Date.now(),
  slaMs = 72 * 60 * 60 * 1000,
  graduated: Set<string> = FALLBACK_GRADUATED,
) {
  if (graduated.has(f.stage)) return false;
  if (f.dueAt) {
    const due = new Date(f.dueAt).getTime();
    if (!Number.isNaN(due) && due < now) return true;
  }
  const assigneeId = f.assignedToId ?? f.assignedTo?.id ?? null;
  if (!assigneeId || !f.assignedAt || !f.stageAtAssignment) return false;
  if (f.stage !== f.stageAtAssignment) return false;
  const assignedAt = new Date(f.assignedAt).getTime();
  if (Number.isNaN(assignedAt)) return false;
  return assignedAt <= now - slaMs;
}

interface EstablishmentWorkerDashboardProps {
  items: FollowUpCard[];
  stats: WorkerDashboardStats;
  selectedId: string | null;
  onSelect: (id: string) => void;
  pipeline?: ResolvedPipeline | null;
  onAdvance?: (id: string, payload: ProgressAdvancePayload) => void | Promise<void>;
  advancing?: boolean;
  canMutate?: boolean;
}

export function EstablishmentWorkerDashboard({
  items,
  stats,
  selectedId,
  onSelect,
  pipeline,
  onAdvance,
  advancing,
  canMutate = true,
}: EstablishmentWorkerDashboardProps) {
  const [focus, setFocus] = useState<WorkerFocus>('assigned');
  const [stageFilter, setStageFilter] = useState<string>('');
  const graduatedStages = useMemo(() => graduatedSet(pipeline), [pipeline]);
  const journeyStages = useMemo(() => {
    const fromApi = enabledStages(pipeline);
    return fromApi.length ? fromApi.map((s) => s.key) : [...FOLLOW_UP_STAGES];
  }, [pipeline]);
  const journeyLabels = useMemo(() => {
    const fromApi = stageLabelMap(pipeline);
    return Object.keys(fromApi).length ? fromApi : STAGE_LABELS;
  }, [pipeline]);

  const filtered = useMemo(() => {
    const list = sortByNewestFirst(items);
    const now = Date.now();

    return list.filter((f) => {
      const graduated = graduatedStages.has(f.stage);
      if (focus === 'graduated') return graduated;
      if (focus === 'pipeline') return !graduated;
      if (focus === 'overdue') {
        return isOverdueContact(f, now, 72 * 60 * 60 * 1000, graduatedStages);
      }
      if (focus === 'dueToday') {
        if (graduated) return false;
        return isDueTodayByProgress(f.lastProgressAt, f.assignedAt, now);
      }
      if (focus === 'stages') {
        if (stageFilter) return f.stage === stageFilter;
        return true;
      }
      // assigned — all scoped contacts
      return true;
    });
  }, [items, focus, stageFilter, graduatedStages]);

  const cards: Array<{
    id: WorkerFocus;
    label: string;
    value: number;
    hint: string;
    icon: typeof Users;
  }> = [
    {
      id: 'assigned',
      label: 'Assigned contacts',
      value: stats.assigned,
      hint: 'People assigned to you',
      icon: Users,
    },
    {
      id: 'pipeline',
      label: 'Follow up pipeline',
      value: stats.pending,
      hint: 'Active in the journey',
      icon: Layers,
    },
    {
      id: 'stages',
      label: 'Follow up stages',
      value: Object.values(stats.byStage).reduce((a, b) => a + b, 0),
      hint: 'Breakdown by stage',
      icon: ListChecks,
    },
    {
      id: 'graduated',
      label: 'Graduated',
      value: stats.graduated,
      hint: 'Joined a service unit / baptism track',
      icon: CheckCircle2,
    },
  ];

  return (
    <div
      className="min-w-0 space-y-6"
      data-testid="establishment-worker-dashboard"
      data-pipeline-source={pipeline?.source ?? 'static'}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ id, label, value, hint, icon: Icon }) => {
          const active = focus === id || (id === 'stages' && focus === 'stages');
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setFocus(id);
                if (id !== 'stages') setStageFilter('');
              }}
              className={cn(
                'rounded-xl border p-4 text-left transition',
                active
                  ? 'border-primary/40 bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/25',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-2 font-heading text-3xl font-bold tabular-nums">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                </div>
                <Icon className="h-5 w-5 text-primary/80" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Quick filters
        </span>
        <Button
          type="button"
          size="sm"
          variant={focus === 'overdue' ? 'default' : 'outline'}
          onClick={() => setFocus('overdue')}
          className={cn(
            stats.overdue > 0 &&
              (focus === 'overdue'
                ? 'border-red-600 bg-red-600 text-white hover:bg-red-600/90 hover:text-white'
                : 'border-red-500/70 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800'),
          )}
        >
          <Clock className="mr-1.5 h-3.5 w-3.5" />
          Overdue ({stats.overdue})
        </Button>
        <Button
          type="button"
          size="sm"
          variant={focus === 'dueToday' ? 'default' : 'outline'}
          onClick={() => setFocus('dueToday')}
        >
          Due today ({stats.dueToday})
        </Button>
      </div>

      {focus === 'stages' ? (
        <div className="flex flex-wrap gap-2">
          {journeyStages.map((stage) => {
            const count = stats.byStage[stage] ?? 0;
            const active = stageFilter === stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setStageFilter((s) => (s === stage ? '' : stage))}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                  active ? 'border-primary bg-primary/10' : 'border-border bg-card',
                )}
              >
                <Badge
                  className={cn(
                    'font-normal',
                    pipeline
                      ? stageBadgeClass(pipeline, stage)
                      : STAGE_BADGE_CLASS[stage],
                  )}
                >
                  {journeyLabels[stage] ?? STAGE_LABELS[stage] ?? stage}
                </Badge>
                <span className="tabular-nums text-muted-foreground">{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">
            {focus === 'assigned' && 'Your assigned contacts'}
            {focus === 'pipeline' && 'Active pipeline'}
            {focus === 'stages' &&
              (stageFilter
                ? journeyLabels[stageFilter] ?? STAGE_LABELS[stageFilter] ?? stageFilter
                : 'All stages')}
            {focus === 'graduated' && 'Graduated contacts'}
            {focus === 'overdue' && 'Overdue follow-ups'}
            {focus === 'dueToday' && 'Due today'}
            <span className="ml-2 text-muted-foreground">({filtered.length})</span>
          </p>
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No contacts in this view.
          </p>
        ) : (
          <FollowUpTable
            items={filtered}
            selectedId={selectedId}
            onSelect={onSelect}
            pipeline={pipeline}
            onAdvance={canMutate ? onAdvance : undefined}
            advancing={advancing}
          />
        )}
      </div>

    </div>
  );
}

/** Exported for unit tests. */
export const __workerDashboardTestUtils = {
  isDueTodayByProgress,
  isOverdueContact,
  GRADUATED_STAGES: FALLBACK_GRADUATED,
};
