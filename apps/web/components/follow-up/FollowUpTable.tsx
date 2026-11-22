'use client';

import { useMemo, useState } from 'react';
import { ArrowRightCircle, Calendar, Clock, Eye, Mail, Phone, User } from 'lucide-react';
import {
  STAGE_BADGE_CLASS,
  STAGE_LABELS,
  STAGE_ROW_CLASS,
  STAGE_ROW_MUTED_CLASS,
  formatCapturedAt,
  formatDue,
  nextStage,
  sortByNewestFirst,
  stageStatusLabel,
} from '@/lib/follow-up';
import {
  nextStageFromPipeline,
  stageBadgeClass,
  stageLabelMap,
  stageShortMap,
  type ResolvedPipeline,
} from '@/lib/pipeline-definition';
import type { FollowUpCard, ProgressAdvancePayload } from '@/components/follow-up/FollowUpPipeline';
import {
  ProgressStageDialog,
  type ProgressFormValues,
} from '@/components/follow-up/ProgressStageDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Vertical scroll only when the directory is long — never force horizontal scroll. */
const TABLE_SCROLL_MAX = 'max-h-[min(70vh,calc(2.75rem*50+2.75rem))]';

interface FollowUpTableProps {
  items: FollowUpCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  pipeline?: ResolvedPipeline | null;
  onAdvance?: (id: string, payload: ProgressAdvancePayload) => void | Promise<void>;
  advancing?: boolean;
}

export function FollowUpTable({
  items,
  selectedId,
  onSelect,
  pipeline,
  onAdvance,
  advancing,
}: FollowUpTableProps) {
  const labels = Object.keys(stageLabelMap(pipeline)).length
    ? stageLabelMap(pipeline)
    : STAGE_LABELS;
  const shorts = stageShortMap(pipeline);
  const [pending, setPending] = useState<{
    id: string;
    contactName: string;
    stage: string;
  } | null>(null);

  const sorted = useMemo(() => sortByNewestFirst(items), [items]);

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No people to show in the directory.
      </p>
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      <ProgressStageDialog
        open={!!pending}
        contactName={pending?.contactName ?? ''}
        nextStage={pending?.stage ?? ''}
        nextStageLabel={
          pending
            ? shorts[pending.stage] ?? labels[pending.stage] ?? pending.stage
            : undefined
        }
        submitting={advancing}
        onClose={() => {
          if (!advancing) setPending(null);
        }}
        onSubmit={async (values: ProgressFormValues) => {
          if (!pending || !onAdvance) return;
          await onAdvance(pending.id, { ...values, stage: pending.stage });
          setPending(null);
        }}
      />

      <div
        className={cn(
          'min-w-0 overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-card shadow-sm',
          TABLE_SCROLL_MAX,
        )}
      >
        <table className="w-full min-w-0 table-fixed border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-muted/95 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
              <th className="px-2 py-2.5 font-semibold sm:px-3">Name</th>
              <th className="px-2 py-2.5 font-semibold sm:px-3">Stage</th>
              <th className="hidden px-2 py-2.5 font-semibold lg:table-cell sm:px-3">Phone</th>
              <th className="hidden px-2 py-2.5 font-semibold xl:table-cell sm:px-3">Email</th>
              <th className="hidden px-2 py-2.5 font-semibold md:table-cell sm:px-3">Assignee</th>
              <th className="px-2 py-2.5 font-semibold sm:px-3">Due</th>
              <th className="hidden px-2 py-2.5 font-semibold 2xl:table-cell sm:px-3">Captured</th>
              <th className="px-2 py-2.5 font-semibold sm:px-3">
                <span className="sr-only">Actions</span>
                <span className="hidden 2xl:inline">Referred</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => {
              const due = formatDue(item.dueAt);
              const nxt =
                nextStageFromPipeline(pipeline, item.stage) ?? nextStage(item.stage);
              const referred = item.referredBy?.trim() || null;
              const captured = formatCapturedAt(item.createdAt);
              const muted = STAGE_ROW_MUTED_CLASS[item.stage] ?? 'text-muted-foreground';
              return (
                <tr
                  key={item.id}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:brightness-[0.97] dark:hover:brightness-110',
                    STAGE_ROW_CLASS[item.stage] ?? 'bg-card',
                    selectedId === item.id && 'ring-2 ring-inset ring-primary/40',
                  )}
                >
                  <td className="min-w-0 px-2 py-2.5 sm:px-3">
                    <button
                      type="button"
                      className="block max-w-full truncate text-left font-medium hover:underline"
                      onClick={() => onSelect(item.id)}
                      title={item.contactName}
                    >
                      {item.contactName}
                    </button>
                    <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground lg:hidden">
                      {item.contactPhone ? (
                        <p className="truncate">
                          <Phone className="mr-1 inline h-3 w-3" />
                          {item.contactPhone}
                        </p>
                      ) : null}
                      {item.contactEmail ? (
                        <p className="truncate xl:hidden">
                          <Mail className="mr-1 inline h-3 w-3" />
                          {item.contactEmail}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="min-w-0 px-2 py-2.5 sm:px-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Badge
                        className={cn(
                          'w-fit max-w-full truncate text-[10px]',
                          pipeline
                            ? stageBadgeClass(pipeline, item.stage)
                            : (STAGE_BADGE_CLASS[item.stage] ?? 'bg-muted text-muted-foreground'),
                        )}
                      >
                        {shorts[item.stage] ?? stageStatusLabel(item.stage)}
                      </Badge>
                      <span className={cn('truncate text-[11px]', muted)}>
                        {labels[item.stage] ?? STAGE_LABELS[item.stage] ?? item.stage}
                      </span>
                    </div>
                  </td>
                  <td className={cn('hidden min-w-0 truncate px-2 py-2.5 lg:table-cell sm:px-3', muted)}>
                    {item.contactPhone ? (
                      <span className="inline-flex max-w-full items-center gap-1 truncate">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{item.contactPhone}</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={cn('hidden min-w-0 truncate px-2 py-2.5 xl:table-cell sm:px-3', muted)}>
                    {item.contactEmail ? (
                      <span className="inline-flex max-w-full items-center gap-1 truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{item.contactEmail}</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={cn('hidden min-w-0 truncate px-2 py-2.5 md:table-cell sm:px-3', muted)}>
                    {item.assignedTo ? (
                      <span className="inline-flex max-w-full items-center gap-1 truncate">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {item.assignedTo.firstName} {item.assignedTo.lastName}
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="min-w-0 px-2 py-2.5 sm:px-3">
                    {due ? (
                      <span
                        className={cn(
                          'inline-flex max-w-full items-center gap-1 text-xs font-medium',
                          due.overdue ? 'text-destructive' : muted,
                        )}
                        title={due.label}
                      >
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {due.overdue ? 'Overdue ' : ''}
                          {due.label}
                        </span>
                      </span>
                    ) : (
                      <span className={muted}>—</span>
                    )}
                  </td>
                  <td className={cn('hidden min-w-0 truncate px-2 py-2.5 text-xs 2xl:table-cell sm:px-3', muted)}>
                    {captured ? (
                      <span className="inline-flex max-w-full items-center gap-1 truncate">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="truncate">{captured}</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-2 py-2.5 sm:px-3">
                    <div className="flex items-center justify-end gap-1">
                      <span
                        className={cn(
                          'mr-auto hidden max-w-[7rem] truncate text-sm 2xl:inline',
                          muted,
                        )}
                      >
                        {referred ?? '—'}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0 bg-background/70"
                        title="View detailed"
                        aria-label={`View detailed — ${item.contactName}`}
                        onClick={() => onSelect(item.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {nxt && onAdvance ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          title="Advance to next stage"
                          aria-label={`Advance ${item.contactName} to next stage`}
                          disabled={advancing}
                          onClick={() =>
                            setPending({
                              id: item.id,
                              contactName: item.contactName,
                              stage: nxt,
                            })
                          }
                        >
                          <ArrowRightCircle className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {items.length >= 20 ? (
        <p className="text-xs text-muted-foreground">
          Showing {items.length} people — scroll the directory to see more.
        </p>
      ) : null}
    </div>
  );
}
