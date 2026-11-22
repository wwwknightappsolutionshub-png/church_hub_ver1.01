'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { ResolvedPipeline } from '@/lib/pipeline-definition';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type StageSnap = {
  key: string;
  label: string;
  shortLabel: string;
};

type UpdatesPayload = {
  updatesAvailable: boolean;
  forked: boolean;
  templateKey: string | null;
  forkedFromVersion: number | null;
  templateVersion: number | null;
  dismissedVersion: number | null;
  diff: {
    added: StageSnap[];
    removed: StageSnap[];
    changed: Array<{
      key: string;
      church: StageSnap;
      template: StageSnap;
      fields: Array<{ field: string; from: unknown; to: unknown }>;
    }>;
    custom: StageSnap[];
    conflicts: Array<{ key: string; reason: string }>;
  } | null;
};

function axiosMessage(err: unknown): string {
  const ax = err as { response?: { data?: { message?: string | string[] } } };
  const msg = ax?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return 'Request failed';
}

interface PipelineUpdatesPanelProps {
  enabled: boolean;
  onMerged?: (pipeline: ResolvedPipeline) => void;
}

export function PipelineUpdatesPanel({ enabled, onMerged }: PipelineUpdatesPanelProps) {
  const queryClient = useQueryClient();
  const updatesQuery = useApiQuery<UpdatesPayload>(
    ['follow-up', 'pipeline-updates'],
    '/follow-up/pipeline/updates',
    { enabled, staleTime: 15_000 },
  );
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState<Record<string, 'keep_church' | 'take_template'>>({});
  const [showDiff, setShowDiff] = useState(false);

  const data = updatesQuery.data;
  const conflictKeys = useMemo(
    () => (data?.diff?.conflicts ?? []).map((c) => c.key),
    [data],
  );

  if (!enabled) return null;
  if (updatesQuery.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking template updates…
      </p>
    );
  }
  if (!data?.forked) return null;

  const dismiss = async () => {
    setBusy(true);
    try {
      await api.post('/follow-up/pipeline/updates/dismiss');
      toast.success('Update notice dismissed');
      await queryClient.invalidateQueries({ queryKey: ['follow-up', 'pipeline-updates'] });
      await updatesQuery.refetch();
      setShowDiff(false);
    } catch (err) {
      toast.error(axiosMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const merge = async () => {
    setBusy(true);
    try {
      const resolveConflicts: Record<string, 'keep_church' | 'take_template'> = {};
      for (const key of conflictKeys) {
        resolveConflicts[key] = choices[key] ?? 'keep_church';
      }
      const { data: result } = await api.post<{
        pipeline: ResolvedPipeline;
        applied: string[];
      }>('/follow-up/pipeline/merge', { resolveConflicts });
      toast.success(`Merged template v${data.templateVersion}`);
      queryClient.setQueryData(['follow-up', 'pipeline'], result.pipeline);
      await queryClient.invalidateQueries({ queryKey: ['follow-up', 'pipeline'] });
      await queryClient.invalidateQueries({ queryKey: ['follow-up', 'pipeline-updates'] });
      onMerged?.(result.pipeline);
      await updatesQuery.refetch();
      setShowDiff(false);
    } catch (err) {
      toast.error(axiosMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        data.updatesAvailable
          ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
          : 'border-border bg-card',
      )}
      data-testid="pipeline-updates-panel"
      data-updates-available={data.updatesAvailable ? 'true' : 'false'}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">
              {data.updatesAvailable ? 'Updates available' : 'Template up to date'}
            </p>
            <Badge variant="outline">
              church v{data.forkedFromVersion ?? '—'} → template v{data.templateVersion ?? '—'}
            </Badge>
            {data.templateKey ? <Badge variant="secondary">{data.templateKey}</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.updatesAvailable
              ? 'The system template has changed since you customized. Review the diff, then merge or dismiss.'
              : 'Your church definition is aligned with the current template version.'}
          </p>
        </div>
        {data.updatesAvailable ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setShowDiff((v) => !v)}
              data-testid="pipeline-diff-toggle"
            >
              {showDiff ? 'Hide diff' : 'View diff'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void dismiss()}
              data-testid="pipeline-updates-dismiss"
            >
              Dismiss
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void merge()}
              data-testid="pipeline-merge-btn"
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Merge updates
            </Button>
          </div>
        ) : null}
      </div>

      {showDiff && data.diff ? (
        <div className="mt-4 space-y-3" data-testid="pipeline-diff-view">
          <DiffSection title="Added" items={data.diff.added.map((s) => s.key)} empty="None" />
          <DiffSection title="Removed from template" items={data.diff.removed.map((s) => s.key)} empty="None" />
          <DiffSection title="Custom (kept)" items={data.diff.custom.map((s) => s.key)} empty="None" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Changed / conflicts
            </p>
            {(data.diff.changed ?? []).length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">None</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {data.diff.changed.map((row) => (
                  <li
                    key={row.key}
                    className="rounded-lg border border-border bg-background/80 p-3"
                    data-conflict-key={row.key}
                  >
                    <p className="font-mono text-xs font-semibold">{row.key}</p>
                    <p className="mt-1 text-sm">
                      Church: <span className="font-medium">{row.church.label}</span>
                      {' → '}
                      Template: <span className="font-medium">{row.template.label}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          (choices[row.key] ?? 'keep_church') === 'keep_church'
                            ? 'default'
                            : 'outline'
                        }
                        onClick={() =>
                          setChoices((c) => ({ ...c, [row.key]: 'keep_church' }))
                        }
                      >
                        Keep church
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          choices[row.key] === 'take_template' ? 'default' : 'outline'
                        }
                        onClick={() =>
                          setChoices((c) => ({ ...c, [row.key]: 'take_template' }))
                        }
                      >
                        Take template
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DiffSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <p className="mt-1 font-mono text-sm">{items.join(', ')}</p>
      )}
    </div>
  );
}
