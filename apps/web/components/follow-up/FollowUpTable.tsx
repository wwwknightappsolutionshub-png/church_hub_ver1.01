'use client';

import { useState } from 'react';
import { Calendar, ChevronRight, Mail, Phone, User } from 'lucide-react';
import { STAGE_LABELS, STAGE_ROW_CLASS, formatDue, nextStage } from '@/lib/follow-up';
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
              <th className="px-3 py-2.5 font-semibold">Referred by</th>
              <th className="px-3 py-2.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const due = formatDue(item.dueAt);
              const nxt = nextStage(item.stage);
              const referred = item.referredBy?.trim() || null;
              return (
                <tr
                  key={item.id}
                  className={cn(
                    'border-b border-border/70 transition-colors hover:brightness-[0.98] dark:hover:brightness-110',
                    STAGE_ROW_CLASS[item.stage] ?? 'bg-card',
                    selectedId === item.id && 'ring-2 ring-inset ring-primary/40',
                  )}
                >
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      className="font-medium text-foreground hover:text-primary hover:underline"
                      onClick={() => onSelect(item.id)}
                    >
                      {item.contactName}
                    </button>
                    {item.stage === 'NEW_LEAD' ? (
                      <Badge variant="gold" className="ml-1.5 text-[10px]">
                        Fresh
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-foreground">
                    {STAGE_LABELS[item.stage] ?? item.stage}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {item.contactPhone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {item.contactPhone}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2.5 text-muted-foreground">
                    {item.contactEmail ? (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3 shrink-0" />
                        {item.contactEmail}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
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
                          due.overdue ? 'text-destructive' : 'text-muted-foreground',
                        )}
                      >
                        <Calendar className="h-3 w-3" />
                        {due.overdue ? 'Overdue ' : ''}
                        {due.label}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-2.5 text-muted-foreground">
                    {referred ?? '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      <Button type="button" variant="outline" size="sm" onClick={() => onSelect(item.id)}>
                        Open
                      </Button>
                      {nxt ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={advancing}
                          className="text-primary"
                          onClick={() =>
                            setPending({
                              id: item.id,
                              contactName: item.contactName,
                              stage: nxt,
                            })
                          }
                        >
                          Progress
                          <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
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
