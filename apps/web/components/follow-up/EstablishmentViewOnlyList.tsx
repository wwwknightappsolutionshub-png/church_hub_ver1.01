'use client';

import { Eye } from 'lucide-react';
import {
  STAGE_BADGE_CLASS,
  STAGE_LABELS,
  formatDue,
  sortByNewestFirst,
} from '@/lib/follow-up';
import {
  stageBadgeClass,
  stageLabelMap,
  type ResolvedPipeline,
} from '@/lib/pipeline-definition';
import type { FollowUpCard } from '@/components/follow-up/FollowUpPipeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EstablishmentViewOnlyListProps {
  items: FollowUpCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  pipeline?: ResolvedPipeline | null;
  caption?: string;
}

/** Prayer Squad / WSF leaders — simple read-only pipeline list (no worker cards, no manager tabs). */
export function EstablishmentViewOnlyList({
  items,
  selectedId,
  onSelect,
  pipeline,
  caption = 'Read-only view of contacts in your scope.',
}: EstablishmentViewOnlyListProps) {
  const sorted = sortByNewestFirst(items);
  const labels = Object.keys(stageLabelMap(pipeline)).length
    ? stageLabelMap(pipeline)
    : STAGE_LABELS;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{caption}</p>
      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          No contacts to show.
        </p>
      ) : (
        <ul
          className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card"
          data-testid="establishment-view-only-list"
          data-pipeline-source={pipeline?.source ?? 'static'}
        >
          {sorted.map((item) => {
            const due = formatDue(item.dueAt);
            const selected = selectedId === item.id;
            return (
              <li key={item.id}>
                <div
                  className={cn(
                    'flex flex-wrap items-center gap-3 px-4 py-3',
                    selected && 'bg-primary/5',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.contactName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.assignedTo
                        ? `Assigned: ${item.assignedTo.firstName} ${item.assignedTo.lastName}`
                        : 'Assigned'}
                      {due ? ` · Due ${due.label}` : ''}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      'shrink-0 font-normal',
                      pipeline
                        ? stageBadgeClass(pipeline, item.stage)
                        : STAGE_BADGE_CLASS[item.stage],
                    )}
                  >
                    {labels[item.stage] ?? STAGE_LABELS[item.stage] ?? item.stage}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onSelect(item.id)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    View
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
