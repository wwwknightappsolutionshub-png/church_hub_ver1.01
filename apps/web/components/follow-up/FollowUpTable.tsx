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
import type { FollowUpCard, ProgressAdvancePayload } from '@/components/follow-up/FollowUpPipeline';
import {
  ProgressStageDialog,
  type ProgressFormValues,
} from '@/components/follow-up/ProgressStageDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** ~50 body rows at ~2.75rem each + header; scroll when directory is large. */
const TABLE_SCROLL_MAX = 'max-h-[min(70vh,calc(2.75rem*50+2.75rem))]';

interface FollowUpTableProps {
  items: FollowUpCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdvance: (id: string, payload: ProgressAdvancePayload) => void | Promise<void>;
  advancing?: boolean;
}

export function FollowUpTable({
  items,
  selectedId,
  onSelect,
  onAdvance,
  advancing,
}: FollowUpTableProps) {
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
    <div className="space-y-3">
      <ProgressStageDialog
        open={!!pending}
        contactName={pending?.contactName ?? ''}
        nextStage={pending?.stage ?? ''}
        submitting={advancing}
        onClose={() => {
          if (!advancing) setPending(null);
        }}
        onSubmit={async (values: ProgressFormValues) => {
          if (!pending) return;
          await onAdvance(pending.id, { ...values, stage: pending.stage });
          setPending(null);
        }}
      />

      <div
        className={cn(
          'overflow-auto rounded-xl border border-border bg-card shadow-sm',
          TABLE_SCROLL_MAX,
        )}
      >
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-muted/95 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
              <th className="px-3 py-2.5 font-semibold">Name</th>
              <th className="px-3 py-2.5 font-semibold">Stage</th>
              <th className="px-3 py-2.5 font-semibold">Phone</th>
              <th className="px-3 py-2.5 font-semibold">Email</th>
              <th className="px-3 py-2.5 font-semibold">Assignee</th>
              <th className="px-3 py-2.5 font-semibold">Due</th>
              <th className="px-3 py-2.5 font-semibold">Captured</th>
              <th className="px-3 py-2.5 font-semibold">Referred by</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => {
              const due = formatDue(item.dueAt);
              const nxt = nextStage(item.stage);
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
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      className="font-medium hover:underline"
                      onClick={() => onSelect(item.id)}
                    >
                      {item.contactName}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <Badge
                        className={cn(
                          'w-fit text-[10px]',
                          STAGE_BADGE_CLASS[item.stage] ?? 'bg-muted text-muted-foreground',
                        )}
                      >
                        {stageStatusLabel(item.stage)}
                      </Badge>
                      <span className={cn('text-[11px]', muted)}>
                        {STAGE_LABELS[item.stage] ?? item.stage}
                      </span>
                    </div>
                  </td>
                  <td className={cn('px-3 py-2.5', muted)}>
                    {item.contactPhone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {item.contactPhone}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={cn('max-w-[180px] truncate px-3 py-2.5', muted)}>
                    {item.contactEmail ? (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3 shrink-0" />
                        {item.contactEmail}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={cn('px-3 py-2.5', muted)}>
                    {item.assignedTo ? (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.assignedTo.firstName} {item.assignedTo.lastName}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {due ? (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-medium',
                          due.overdue ? 'text-destructive' : muted,
                        )}
                      >
                        <Calendar className="h-3 w-3" />
                        {due.overdue ? 'Overdue ' : ''}
                        {due.label}
                      </span>
                    ) : (
                      <span className={muted}>—</span>
                    )}
                  </td>
                  <td className={cn('px-3 py-2.5 text-xs', muted)}>
                    {captured ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {captured}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <span className={cn('max-w-[120px] truncate text-sm', muted)}>
                        {referred ?? '—'}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="ml-auto h-8 w-8 shrink-0 bg-background/70"
                        title="View detailed"
                        aria-label={`View detailed — ${item.contactName}`}
                        onClick={() => onSelect(item.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {nxt ? (
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
