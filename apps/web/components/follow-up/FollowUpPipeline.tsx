'use client';

import { useState } from 'react';
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  HeartHandshake,
  Mail,
  Phone,
  Sprout,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FOLLOW_UP_STAGES,
  PIPELINE_COLUMNS,
  STAGE_LABELS,
  formatDue,
  nextStage,
} from '@/lib/follow-up';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ProgressStageDialog,
  type ProgressFormValues,
} from '@/components/follow-up/ProgressStageDialog';

export interface FollowUpCard {
  id: string;
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  stage: string;
  dueAt?: string | null;
  createdAt?: string | null;
  notes?: string | null;
  referredBy?: string | null;
  member?: { id: string; firstName: string; lastName: string } | null;
  assignedTo?: { id: string; firstName: string; lastName: string } | null;
  reminders?: Array<{ id: string; remindAt: string; sentAt?: string | null; channel: string }>;
}

export type ProgressAdvancePayload = ProgressFormValues & { stage: string };

interface FollowUpPipelineProps {
  items: FollowUpCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdvance: (id: string, payload: ProgressAdvancePayload) => void | Promise<void>;
  advancing?: boolean;
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
  onRequestProgress,
}: {
  item: FollowUpCard;
  selected: boolean;
  stageAccent: string;
  onSelect: () => void;
  onRequestProgress: (stage: string) => void;
}) {
  const due = formatDue(item.dueAt);
  const nxt = nextStage(item.stage);
  const pendingReminder = item.reminders?.find((r) => !r.sentAt);
  const isNew = item.stage === 'NEW_LEAD';

  return (
    <article
      className={cn(
        'group rounded-xl border bg-card transition-all',
        selected
          ? 'border-primary ring-2 ring-primary/25 shadow-md'
          : 'border-border shadow-sm hover:border-primary/30 hover:shadow-md',
        stageAccent,
        'border-t-[3px]',
      )}
    >
      <button type="button" onClick={onSelect} className="w-full p-3.5 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
            {item.contactName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="font-semibold leading-tight text-foreground">{item.contactName}</h4>
              {isNew && (
                <Badge variant="gold" className="text-[10px]">
                  New
                </Badge>
              )}
              {item.member && (
                <Badge variant="outline" className="text-[10px]">
                  Member
                </Badge>
              )}
            </div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              {item.contactPhone && (
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 shrink-0" />
                  {item.contactPhone}
                </p>
              )}
              {item.contactEmail && (
                <p className="flex items-center gap-1.5 truncate">
                  <Mail className="h-3 w-3 shrink-0" />
                  {item.contactEmail}
                </p>
              )}
              {item.referredBy?.trim() && (
                <p className="flex items-center gap-1.5 truncate">
                  <User className="h-3 w-3 shrink-0" />
                  Referred by {item.referredBy.trim()}
                </p>
              )}
              {item.assignedTo && (
                <p className="flex items-center gap-1.5 font-medium text-foreground/80">
                  <User className="h-3 w-3 shrink-0 text-primary" />
                  {item.assignedTo.firstName} {item.assignedTo.lastName}
                </p>
              )}
            </div>
          </div>
        </div>
        {(due || pendingReminder) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {due && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium',
                  due.overdue
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <Calendar className="h-3 w-3" />
                {due.overdue ? 'Overdue' : 'Due'} {due.label}
              </span>
            )}
            {pendingReminder && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                Reminder set
              </span>
            )}
          </div>
        )}
      </button>
      {nxt && (
        <div className="border-t border-border/80 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-between text-xs font-semibold text-primary"
            onClick={() => onRequestProgress(nxt)}
          >
            Progress to the next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </article>
  );
}

export function FollowUpPipeline({
  items,
  selectedId,
  onSelect,
  onAdvance,
  advancing,
}: FollowUpPipelineProps) {
  const total = items.length;
  const [pending, setPending] = useState<{
    id: string;
    contactName: string;
    stage: string;
  } | null>(null);

  return (
    <div className="space-y-6">
      <ProgressStageDialog
        open={!!pending}
        contactName={pending?.contactName ?? ''}
        nextStage={pending?.stage ?? ''}
        submitting={advancing}
        onClose={() => {
          if (!advancing) setPending(null);
        }}
        onSubmit={async (values) => {
          if (!pending) return;
          await onAdvance(pending.id, { ...values, stage: pending.stage });
          setPending(null);
        }}
      />

      {/* Journey + phases share one 3-col grid so columns line up */}
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
            {total} people in pipeline · drag-free kanban by stage below
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
                              onRequestProgress={(s) =>
                                setPending({
                                  id: item.id,
                                  contactName: item.contactName,
                                  stage: s,
                                })
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

      {/* Mini legend: all 5 stages */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-3">
        {FOLLOW_UP_STAGES.map((stage) => {
          const n = items.filter((f) => f.stage === stage).length;
          return (
            <span
              key={stage}
              className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {STAGE_LABELS[stage]}: {n}
            </span>
          );
        })}
      </div>
    </div>
  );
}
