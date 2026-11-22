'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Eye,
  HeartHandshake,
  Loader2,
  Phone,
  Sprout,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PIPELINE_COLUMNS,
  STAGE_BADGE_CLASS,
  STAGE_LABELS,
  formatCapturedAt,
  isArchiveBlockedStage,
  sortByNewestFirst,
  stageStatusLabel,
} from '@/lib/follow-up';
import {
  isArchiveBlockedInPipeline,
  phaseColumnsFromPipeline,
  stageAccentBorderClass,
  stageBadgeClass,
  stageCardHighlightClass,
  stageLabelMap,
  stagePanelClass,
  stageShortMap,
  type PipelinePhaseColumn,
  type ResolvedPipeline,
} from '@/lib/pipeline-definition';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ProgressFormValues } from '@/components/follow-up/ProgressStageDialog';
import {
  ArchiveIconButton,
  DndIconButton,
  FollowUpArchiveDialog,
} from '@/components/follow-up/FollowUpArchiveDialog';

export interface FollowUpCard {
  id: string;
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  stage: string;
  dueAt?: string | null;
  /** Set when assigned — 72h SLA clock for stage update. */
  assignedAt?: string | null;
  /** Stage at assignment; overdue while still equal after SLA. */
  stageAtAssignment?: string | null;
  /** Last assign or stage advance — 12–24h Due today window. */
  lastProgressAt?: string | null;
  assignedToId?: string | null;
  nextAction?: string | null;
  createdAt?: string | null;
  notes?: string | null;
  referredBy?: string | null;
  archiveRequestedAt?: string | null;
  archiveRequestReason?: string | null;
  member?: { id: string; firstName: string; lastName: string } | null;
  assignedTo?: { id: string; firstName: string; lastName: string } | null;
  reminders?: Array<{ id: string; remindAt: string; sentAt?: string | null; channel: string }>;
}

export type ProgressAdvancePayload = ProgressFormValues & { stage: string };

interface FollowUpPipelineProps {
  items: FollowUpCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Resolved membership pipeline (Phase 3). Falls back to static winners_default maps. */
  pipeline?: ResolvedPipeline | null;
  /** Active stage tab — drives the single card box (defaults to first item’s stage / entry). */
  activeStage?: string | null;
  /** Unfiltered contacts for phase-strip totals (defaults to `items`). */
  overviewItems?: FollowUpCard[];
  canArchive?: boolean;
  canRequestArchive?: boolean;
  onArchive?: (id: string, reason: string) => void | Promise<void>;
  onRequestArchive?: (id: string, reason: string) => void | Promise<void>;
  onApproveArchive?: (id: string, reason: string) => void | Promise<void>;
  onDeclineArchive?: (id: string, note: string) => void | Promise<void>;
  archiveBusy?: boolean;
}

const PHASE_ICONS: Record<string, LucideIcon> = {
  outreach: Users,
  engagement: Sprout,
  belonging: HeartHandshake,
};

/** Cards revealed per infinite-scroll page. */
const STAGE_BOARD_PAGE_SIZE = 12;

function fallbackPhaseColumns(): PipelinePhaseColumn[] {
  return PIPELINE_COLUMNS.map((col) => ({
    id: col.id,
    step: col.step,
    title: col.title,
    subtitle: col.subtitle,
    headerClass: col.headerClass,
    titleClass: col.titleClass,
    subtitleClass: col.subtitleClass,
    dotClass: col.dotClass,
    stages: [...col.stages],
  }));
}

function LeadCard({
  item,
  selected,
  onSelect,
  pipeline,
  labels,
  shorts,
  canArchive,
  canRequestArchive,
  onArchiveClick,
  onDndClick,
  onApproveClick,
  onDeclineClick,
}: {
  item: FollowUpCard;
  selected: boolean;
  onSelect: () => void;
  pipeline?: ResolvedPipeline | null;
  labels: Record<string, string>;
  shorts: Record<string, string>;
  canArchive?: boolean;
  canRequestArchive?: boolean;
  onArchiveClick?: () => void;
  onDndClick?: () => void;
  onApproveClick?: () => void;
  onDeclineClick?: () => void;
}) {
  const archiveRequested = !!item.archiveRequestedAt;
  const referred = item.referredBy?.trim() || null;
  const captured = formatCapturedAt(item.createdAt);
  const archiveBlocked = pipeline
    ? isArchiveBlockedInPipeline(pipeline, item.stage)
    : isArchiveBlockedStage(item.stage);
  const assignee = item.assignedTo
    ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}`.trim()
    : null;
  const stageLabel = labels[item.stage] ?? STAGE_LABELS[item.stage] ?? item.stage;
  const shortLabel = shorts[item.stage] ?? stageStatusLabel(item.stage);
  const description =
    item.nextAction?.trim() ||
    item.notes?.trim() ||
    (captured ? `Captured ${captured}` : stageLabel);
  const badgeClass = pipeline
    ? stageBadgeClass(pipeline, item.stage)
    : (STAGE_BADGE_CLASS[item.stage] ?? 'bg-muted text-muted-foreground');
  const accentClass = pipeline
    ? stageAccentBorderClass(pipeline, item.stage)
    : 'border-l-border';
  const highlightClass = pipeline
    ? stageCardHighlightClass(pipeline, item.stage)
    : 'border-border bg-card';

  const showArchive = !archiveBlocked && canArchive && onArchiveClick;
  const showDnd = !archiveBlocked && canRequestArchive && !canArchive && onDndClick;
  const showApprove = !archiveBlocked && canArchive && archiveRequested && onApproveClick;
  const showDecline = !archiveBlocked && canArchive && archiveRequested && onDeclineClick;
  const hasActions = showArchive || showDnd || showApprove || showDecline;

  return (
    <Card
      className={cn(
        'relative h-full border-l-4 transition-shadow hover:shadow-elevated',
        accentClass,
        highlightClass,
        selected &&
          'border-2 border-amber-500 bg-gradient-to-br from-amber-50 via-amber-100/80 to-orange-50 shadow-md ring-2 ring-amber-400/50',
        archiveRequested && !selected && 'ring-1 ring-destructive/40',
      )}
      data-stage={item.stage}
    >
      <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5">
        {showArchive ? <ArchiveIconButton title="Archive" onClick={onArchiveClick} /> : null}
        {showDnd ? <DndIconButton onClick={onDndClick} /> : null}
        {showApprove ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[10px] font-semibold text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onApproveClick();
            }}
          >
            Approve
          </Button>
        ) : null}
        {showDecline ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[10px]"
            onClick={(e) => {
              e.stopPropagation();
              onDeclineClick();
            }}
          >
            Decline
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          title="View detailed"
          aria-label={`View detailed — ${item.contactName}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>

      <button
        type="button"
        className={cn('w-full text-left', hasActions ? 'pr-20' : 'pr-10')}
        onClick={onSelect}
      >
        <CardHeader className="pb-3">
          {selected ? (
            <p className="mb-2 inline-flex rounded-md bg-amber-500 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
              Selected
            </p>
          ) : null}
          <div className="flex items-start justify-between gap-2">
            <CardTitle
              className={cn('text-base leading-snug', selected && 'text-amber-950')}
            >
              {item.contactName}
            </CardTitle>
            <Badge className={cn('shrink-0 gap-1 text-[10px]', badgeClass)}>
              {shortLabel}
            </Badge>
          </div>
          {archiveRequested ? (
            <Badge variant="destructive" className="mt-1 w-fit text-[10px]">
              Archive requested
            </Badge>
          ) : null}
          <CardDescription
            className={cn('line-clamp-2', selected && 'text-amber-900/75')}
          >
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div
            className={cn(
              'flex items-center gap-2 text-muted-foreground',
              selected && 'text-amber-900/80',
            )}
          >
            {item.contactPhone ? (
              <>
                <Phone className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.contactPhone}</span>
              </>
            ) : (
              <>
                <Users className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {stageLabel}
                  {captured ? ` · ${captured}` : ''}
                </span>
              </>
            )}
          </div>
          {item.contactPhone && captured ? (
            <p
              className={cn(
                'font-sans text-xs text-muted-foreground',
                selected && 'text-amber-900/70',
              )}
            >
              Captured {captured}
            </p>
          ) : null}
          {referred ? (
            <p
              className={cn(
                'inline-flex items-center gap-1.5 font-sans text-xs text-muted-foreground',
                selected && 'text-amber-900/70',
              )}
            >
              <User className="h-3.5 w-3.5 shrink-0" />
              Referred by {referred}
            </p>
          ) : null}
          {assignee ? (
            <p
              className={cn(
                'font-sans text-xs text-muted-foreground',
                selected && 'text-amber-900/70',
              )}
            >
              Assignee: {assignee}
            </p>
          ) : null}
        </CardContent>
      </button>
    </Card>
  );
}

export function FollowUpPipeline({
  items,
  selectedId,
  onSelect,
  pipeline,
  activeStage,
  overviewItems,
  canArchive,
  canRequestArchive,
  onArchive,
  onRequestArchive,
  onApproveArchive,
  onDeclineArchive,
  archiveBusy,
}: FollowUpPipelineProps) {
  const [archiveDlg, setArchiveDlg] = useState<{
    id: string;
    contactName: string;
    mode: 'archive' | 'dnd' | 'decline';
  } | null>(null);
  const [visibleCount, setVisibleCount] = useState(STAGE_BOARD_PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const phaseColumns = useMemo(() => {
    const fromApi = phaseColumnsFromPipeline(pipeline);
    return fromApi.length ? fromApi : fallbackPhaseColumns();
  }, [pipeline]);

  const labels = useMemo(() => {
    const fromApi = stageLabelMap(pipeline);
    return Object.keys(fromApi).length ? fromApi : STAGE_LABELS;
  }, [pipeline]);

  const shorts = useMemo(() => stageShortMap(pipeline), [pipeline]);

  const stageKey = activeStage || items[0]?.stage || 'NEW_LEAD';
  const stageItems = useMemo(
    () =>
      sortByNewestFirst(
        activeStage ? items.filter((f) => f.stage === activeStage) : items,
      ),
    [items, activeStage],
  );
  const phaseCountSource = overviewItems ?? items;
  const stageLabel = labels[stageKey] ?? STAGE_LABELS[stageKey] ?? stageKey;
  const activePhase = phaseColumns.find((col) => col.stages.includes(stageKey));
  const panelClass = pipeline
    ? stagePanelClass(pipeline, stageKey)
    : 'bg-transparent';

  useEffect(() => {
    setVisibleCount(STAGE_BOARD_PAGE_SIZE);
  }, [stageKey, stageItems.length]);

  const visibleItems = useMemo(
    () => stageItems.slice(0, visibleCount),
    [stageItems, visibleCount],
  );
  const hasMore = visibleCount < stageItems.length;

  useEffect(() => {
    if (!hasMore) return;
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((prev) =>
            Math.min(prev + STAGE_BOARD_PAGE_SIZE, stageItems.length),
          );
        }
      },
      { root: null, rootMargin: '240px 0px', threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, stageItems.length, visibleCount]);

  const cardActions = (item: FollowUpCard) => ({
    canArchive,
    canRequestArchive,
    onArchiveClick: onArchive
      ? () =>
          setArchiveDlg({
            id: item.id,
            contactName: item.contactName,
            mode: 'archive',
          })
      : undefined,
    onDndClick: onRequestArchive
      ? () =>
          setArchiveDlg({
            id: item.id,
            contactName: item.contactName,
            mode: 'dnd',
          })
      : undefined,
    onApproveClick: onApproveArchive
      ? () =>
          void onApproveArchive(
            item.id,
            item.archiveRequestReason || 'Approved archive request',
          )
      : undefined,
    onDeclineClick: onDeclineArchive
      ? () =>
          setArchiveDlg({
            id: item.id,
            contactName: item.contactName,
            mode: 'decline',
          })
      : undefined,
  });

  return (
    <div className="space-y-6" data-pipeline-source={pipeline?.source ?? 'static'}>
      <FollowUpArchiveDialog
        open={!!archiveDlg}
        mode={archiveDlg?.mode ?? 'archive'}
        contactName={archiveDlg?.contactName ?? ''}
        submitting={archiveBusy}
        onClose={() => {
          if (!archiveBusy) setArchiveDlg(null);
        }}
        onSubmit={async (reason) => {
          if (!archiveDlg) return;
          if (archiveDlg.mode === 'archive') await onArchive?.(archiveDlg.id, reason);
          else if (archiveDlg.mode === 'dnd') await onRequestArchive?.(archiveDlg.id, reason);
          else await onDeclineArchive?.(archiveDlg.id, reason);
          setArchiveDlg(null);
        }}
      />

      <div
        className="grid gap-5 md:grid-cols-3"
        data-testid="pipeline-phase-strip"
      >
        {phaseColumns.map((col, i) => {
          const Icon = PHASE_ICONS[col.id] ?? Users;
          const count = phaseCountSource.filter((f) =>
            col.stages.includes(f.stage),
          ).length;
          const phaseActive = activePhase?.id === col.id;
          return (
            <div key={col.id} className="relative min-w-0">
              {i < phaseColumns.length - 1 && (
                <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-muted-foreground/40 md:block" />
              )}
              <div
                className={cn(
                  'rounded-xl border px-4 py-3.5 transition',
                  col.headerClass,
                  phaseActive && 'shadow-md ring-2 ring-foreground/15 ring-offset-2 ring-offset-background',
                )}
              >
                <div className="flex gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-card/70',
                      col.headerClass,
                    )}
                  >
                    <Icon className={cn('h-5 w-5', col.titleClass)} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', col.dotClass)} />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Phase {col.step}
                      </span>
                    </div>
                    <h3 className={cn('mt-0.5 font-heading text-base font-bold', col.titleClass)}>
                      {col.title}
                    </h3>
                    {col.subtitle ? (
                      <p className={cn('text-sm', col.subtitleClass)}>{col.subtitle}</p>
                    ) : null}
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                      {count} in this phase
                      {phaseActive ? ` · viewing ${stageLabel}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <section
        className={cn('space-y-4 rounded-2xl px-0.5 py-1', panelClass)}
        data-testid="pipeline-stage-board"
        data-stage={stageKey}
        data-phase={activePhase?.id}
      >
        <div className="flex flex-wrap items-center gap-2 px-0.5">
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-full',
              activePhase?.dotClass ?? 'bg-muted-foreground',
            )}
          />
          <h4
            className={cn(
              'font-heading text-sm font-bold',
              activePhase?.titleClass ?? 'text-foreground',
            )}
          >
            {stageLabel}
          </h4>
          {activePhase ? (
            <span className="text-xs text-muted-foreground">
              Phase {activePhase.step}: {activePhase.title}
            </span>
          ) : null}
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
            {stageItems.length}
          </span>
        </div>

        {stageItems.length === 0 ? (
          <p
            className="rounded-xl bg-muted/20 px-4 py-12 text-center text-sm font-medium text-muted-foreground"
            data-testid="pipeline-stage-empty"
          >
            No Data Available
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleItems.map((item) => (
                <LeadCard
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={() => onSelect(item.id)}
                  pipeline={pipeline}
                  labels={labels}
                  shorts={shorts}
                  {...cardActions(item)}
                />
              ))}
            </div>
            {hasMore ? (
              <div
                ref={loadMoreRef}
                className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground"
                data-testid="pipeline-stage-load-more"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading more…
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
