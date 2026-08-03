'use client';

import { useState } from 'react';
import {
  ArrowRight,
  ChevronRight,
  HeartHandshake,
  Sprout,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FOLLOW_UP_STAGES,
  PIPELINE_COLUMNS,
  STAGE_BADGE_CLASS,
  STAGE_LABELS,
  stageStatusLabel,
} from '@/lib/follow-up';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

function LeadCard({
  item,
  selected,
  stageAccent,
  onSelect,
  canArchive,
  canRequestArchive,
  onArchiveClick,
  onDndClick,
  onApproveClick,
  onDeclineClick,
}: {
  item: FollowUpCard;
  selected: boolean;
  stageAccent: string;
  onSelect: () => void;
  canArchive?: boolean;
  canRequestArchive?: boolean;
  onArchiveClick?: () => void;
  onDndClick?: () => void;
  onApproveClick?: () => void;
  onDeclineClick?: () => void;
}) {
  const archiveRequested = !!item.archiveRequestedAt;
  const referred = item.referredBy?.trim() || null;

  return (
    <article
      className={cn(
        'group rounded-xl border bg-card transition-all',
        selected
          ? 'border-primary ring-2 ring-primary/25 shadow-md'
          : 'border-border shadow-sm hover:border-primary/30 hover:shadow-md',
        archiveRequested && 'border-destructive/50 ring-1 ring-destructive/30',
        stageAccent,
        'border-t-[3px]',
      )}
    >
      <button type="button" onClick={onSelect} className="w-full p-3 text-left">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
            {item.contactName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="font-semibold leading-tight text-foreground">{item.contactName}</h4>
              <Badge
                className={cn(
                  'text-[10px]',
                  STAGE_BADGE_CLASS[item.stage] ?? 'bg-muted text-muted-foreground',
                )}
              >
                {stageStatusLabel(item.stage)}
              </Badge>
              {archiveRequested && (
                <Badge variant="destructive" className="text-[10px]">
                  Archive requested
                </Badge>
              )}
            </div>
            {referred ? (
              <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                <User className="h-3 w-3 shrink-0" />
                Referred by {referred}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground/70">No referrer noted</p>
            )}
          </div>
        </div>
      </button>
      <div className="flex flex-wrap items-center gap-1 border-t border-border/80 px-2 py-1.5">
        {canArchive && onArchiveClick && (
          <ArchiveIconButton title="Archive" onClick={onArchiveClick} />
        )}
        {canRequestArchive && !canArchive && onDndClick && <DndIconButton onClick={onDndClick} />}
        {canArchive && archiveRequested && onApproveClick && (
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
            Approve archive
          </Button>
        )}
        {canArchive && archiveRequested && onDeclineClick && (
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
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto h-8 text-xs font-semibold text-primary"
          onClick={onSelect}
        >
          View detailed
          <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </article>
  );
}

export function FollowUpPipeline({
  items,
  selectedId,
  onSelect,
  canArchive,
  canRequestArchive,
  onArchive,
  onRequestArchive,
  onApproveArchive,
  onDeclineArchive,
  archiveBusy,
}: FollowUpPipelineProps) {
  const total = items.length;
  const [archiveDlg, setArchiveDlg] = useState<{
    id: string;
    contactName: string;
    mode: 'archive' | 'dnd' | 'decline';
  } | null>(null);

  return (
    <div className="space-y-6">
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

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm md:px-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Discipleship journey
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: total
                  ? `${Math.min(100, (items.filter((f) => f.stage === 'JOINED_GROUP').length / total) * 100 + 10)}%`
                  : '8%',
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {total} people in pipeline · open View detailed to advance stages
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PIPELINE_COLUMNS.map((col, i) => {
            const Icon = PHASE_ICONS[col.id] ?? Users;
            const count = items.filter((f) =>
              (col.stages as readonly string[]).includes(f.stage),
            ).length;
            return (
              <div key={col.id} className="relative flex min-w-0 flex-col gap-4">
                {i < PIPELINE_COLUMNS.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-5 z-10 hidden h-5 w-5 text-muted-foreground/40 md:block" />
                )}

                <div className={cn('rounded-xl border px-4 py-3.5', col.headerClass)}>
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
                      <p className={cn('text-sm', col.subtitleClass)}>{col.subtitle}</p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        {count} in this phase
                      </p>
                    </div>
                  </div>
                </div>

                {col.stages.map((stage) => {
                  const stageItems = items.filter((f) => f.stage === stage);
                  const accent =
                    col.stageAccent[stage as keyof typeof col.stageAccent] ?? 'border-t-slate-400';
                  return (
                    <div key={stage} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-sm font-bold text-foreground">
                          {STAGE_LABELS[stage]}
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
                          {stageItems.length}
                        </span>
                      </div>
                      <div className="flex max-h-[28rem] min-h-[120px] flex-col gap-2.5 overflow-y-auto rounded-xl bg-muted/30 p-2">
                        {stageItems.length === 0 ? (
                          <p className="flex flex-1 items-center justify-center px-2 py-8 text-center text-xs text-muted-foreground">
                            No one here yet
                          </p>
                        ) : (
                          stageItems.map((item) => (
                            <LeadCard
                              key={item.id}
                              item={item}
                              selected={selectedId === item.id}
                              stageAccent={accent}
                              onSelect={() => onSelect(item.id)}
                              canArchive={canArchive}
                              canRequestArchive={canRequestArchive}
                              onArchiveClick={
                                onArchive
                                  ? () =>
                                      setArchiveDlg({
                                        id: item.id,
                                        contactName: item.contactName,
                                        mode: 'archive',
                                      })
                                  : undefined
                              }
                              onDndClick={
                                onRequestArchive
                                  ? () =>
                                      setArchiveDlg({
                                        id: item.id,
                                        contactName: item.contactName,
                                        mode: 'dnd',
                                      })
                                  : undefined
                              }
                              onApproveClick={
                                onApproveArchive
                                  ? () =>
                                      void onApproveArchive(
                                        item.id,
                                        item.archiveRequestReason || 'Approved archive request',
                                      )
                                  : undefined
                              }
                              onDeclineClick={
                                onDeclineArchive
                                  ? () =>
                                      setArchiveDlg({
                                        id: item.id,
                                        contactName: item.contactName,
                                        mode: 'decline',
                                      })
                                  : undefined
                              }
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-3">
        {FOLLOW_UP_STAGES.map((stage) => {
          const n = items.filter((f) => f.stage === stage).length;
          return (
            <span
              key={stage}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium',
                STAGE_BADGE_CLASS[stage] ?? 'border-border bg-card text-foreground',
              )}
            >
              {STAGE_LABELS[stage]}: {n}
            </span>
          );
        })}
      </div>
    </div>
  );
}
