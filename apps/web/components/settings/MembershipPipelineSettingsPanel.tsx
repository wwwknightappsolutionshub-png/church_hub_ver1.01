'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { usePipelineDefinition } from '@/lib/hooks/use-pipeline-definition';
import type { ResolvedPipeline, ResolvedPipelineStage } from '@/lib/pipeline-definition';
import { isChurchLeadershipRole } from '@/lib/session-role';
import { PipelineUpdatesPanel } from '@/components/settings/PipelineUpdatesPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type TemplateCatalog = {
  preferredTemplateKey: string;
  forked: boolean;
  templates: Array<{
    key: string;
    name: string;
    description: string | null;
    version: number;
    stageCount: number;
    stageKeys: string[];
    isPreferred: boolean;
  }>;
};

function axiosMessage(err: unknown): string {
  const ax = err as { response?: { data?: { message?: string | string[] } } };
  const msg = ax?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return 'Request failed';
}

export function MembershipPipelineSettingsPanel() {
  const queryClient = useQueryClient();
  const { userRoles, isLoading: accessLoading } = useModuleAccess();
  const allowed = isChurchLeadershipRole(userRoles);
  const { pipeline, isLoading, isError, refetch } = usePipelineDefinition({
    enabled: allowed,
  });
  const templatesQuery = useApiQuery<TemplateCatalog>(
    ['follow-up', 'pipeline-templates'],
    '/follow-up/pipeline/templates',
    { staleTime: 30_000, enabled: allowed },
  );
  const [busy, setBusy] = useState(false);
  const [definitionName, setDefinitionName] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { label: string; shortLabel: string }>>({});
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  /** Template highlighted in the picker (may differ from the live/active base until Activate). */
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!pipeline) return;
    setDefinitionName(pipeline.name);
    setDrafts(
      Object.fromEntries(
        pipeline.stages.map((s) => [s.key, { label: s.label, shortLabel: s.shortLabel }]),
      ),
    );
  }, [pipeline]);

  useEffect(() => {
    const preferred =
      templatesQuery.data?.preferredTemplateKey ?? pipeline?.templateKey ?? null;
    if (preferred) setSelectedKey((prev) => prev ?? preferred);
  }, [templatesQuery.data?.preferredTemplateKey, pipeline?.templateKey]);

  const invalidate = async (next?: ResolvedPipeline) => {
    if (next) {
      queryClient.setQueryData(['follow-up', 'pipeline'], next);
    }
    await queryClient.invalidateQueries({ queryKey: ['follow-up', 'pipeline'] });
    await queryClient.invalidateQueries({ queryKey: ['follow-up', 'pipeline-templates'] });
    await queryClient.invalidateQueries({ queryKey: ['follow-up', 'pipeline-updates'] });
    await refetch();
    await templatesQuery.refetch();
  };

  const activateTemplate = async (templateKey: string) => {
    setBusy(true);
    try {
      const { data } = await api.put<ResolvedPipeline>('/follow-up/pipeline/base-template', {
        templateKey,
      });
      setSelectedKey(templateKey);
      toast.success(`Activated ${templateKey}`);
      await invalidate(data);
    } catch (err) {
      toast.error(axiosMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    if (
      !window.confirm(
        'Discard church customizations and return to the system template? Label edits will no longer apply.',
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post<ResolvedPipeline>('/follow-up/pipeline/discard');
      toast.success('Returned to system template');
      await invalidate(data);
    } catch (err) {
      toast.error(axiosMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const customize = async () => {
    setBusy(true);
    try {
      const preferred = templatesQuery.data?.preferredTemplateKey;
      const { data } = await api.post<ResolvedPipeline>('/follow-up/pipeline/fork', {
        ...(preferred ? { templateKey: preferred } : {}),
      });
      toast.success(
        data.source === 'definition'
          ? 'Church pipeline ready to customize'
          : 'Pipeline customized',
      );
      await invalidate(data);
    } catch (err) {
      toast.error(axiosMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const saveName = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch<ResolvedPipeline>('/follow-up/pipeline', {
        name: definitionName,
      });
      toast.success('Pipeline name saved');
      await invalidate(data);
    } catch (err) {
      toast.error(axiosMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const saveStage = async (stage: ResolvedPipelineStage) => {
    const draft = drafts[stage.key];
    if (!draft) return;
    setBusy(true);
    try {
      const { data } = await api.patch<ResolvedPipeline>(
        `/follow-up/pipeline/stages/${encodeURIComponent(stage.key)}`,
        { label: draft.label, shortLabel: draft.shortLabel },
      );
      toast.success(`Updated ${draft.label}`);
      await invalidate(data);
    } catch (err) {
      toast.error(axiosMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addStage = async () => {
    setBusy(true);
    try {
      const { data } = await api.post<ResolvedPipeline>('/follow-up/pipeline/stages', {
        key: newKey.trim().toUpperCase(),
        label: newLabel.trim(),
      });
      toast.success('Stage added');
      setNewKey('');
      setNewLabel('');
      await invalidate(data);
    } catch (err) {
      toast.error(axiosMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (accessLoading || isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading pipeline…
      </p>
    );
  }

  if (!allowed) {
    return (
      <p className="text-sm text-muted-foreground">
        Only Church Admin or Pastor can manage the membership pipeline.
      </p>
    );
  }

  if (isError || !pipeline) {
    return (
      <p className="text-sm text-destructive">
        Could not load membership pipeline. Ensure the API is running.
      </p>
    );
  }

  const customized = pipeline.source === 'definition';
  const stages = [...pipeline.stages].sort((a, b) => a.sortOrder - b.sortOrder);
  const catalog = templatesQuery.data;
  const activeKey =
    catalog?.preferredTemplateKey ?? pipeline.templateKey ?? selectedKey ?? null;
  const pendingKey = selectedKey ?? activeKey;
  const canActivate =
    !customized && !!pendingKey && pendingKey !== activeKey && !busy;

  return (
    <div className="space-y-6" data-testid="membership-pipeline-settings">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-semibold">{pipeline.name}</h2>
            <Badge variant="outline" data-pipeline-source={pipeline.source}>
              {customized ? 'Church definition' : 'System template'}
            </Badge>
            {pipeline.templateKey ? (
              <Badge variant="secondary" data-testid="pipeline-active-template-key">
                {pipeline.templateKey}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {customized
              ? 'Editing your church’s copy. Changes appear on Establishment tabs immediately.'
              : 'Select a system template, then Activate to use it. Customize to edit labels for your church.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {customized ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void discard()}
              disabled={busy}
              data-testid="pipeline-discard-btn"
            >
              Discard customizations
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void customize()}
              disabled={busy}
              data-testid="pipeline-fork-btn"
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Customize pipeline
            </Button>
          )}
        </div>
      </div>

      <PipelineUpdatesPanel
        enabled={customized}
        onMerged={(next) => {
          void invalidate(next);
        }}
      />

      <div
        className="rounded-xl border border-border bg-card p-4"
        data-testid="pipeline-template-picker"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">System templates</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {customized
                ? 'Base template is locked while a church definition is active. Discard customizations to switch.'
                : 'Select a base journey, then Activate. Establishment updates when the template is activated.'}
            </p>
          </div>
          {!customized ? (
            <Button
              type="button"
              disabled={!canActivate}
              onClick={() => pendingKey && void activateTemplate(pendingKey)}
              data-testid="pipeline-activate-btn"
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Activate
            </Button>
          ) : null}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(catalog?.templates ?? []).map((tpl) => {
            const isActive = activeKey === tpl.key;
            const isSelected = pendingKey === tpl.key;
            return (
              <button
                key={tpl.key}
                type="button"
                disabled={busy || customized}
                data-template-key={tpl.key}
                data-selected={isSelected ? 'true' : 'false'}
                data-active={isActive ? 'true' : 'false'}
                onClick={() => {
                  if (!customized) setSelectedKey(tpl.key);
                }}
                className={cn(
                  'rounded-lg border-2 p-3 text-left transition',
                  isActive
                    ? 'border-sky-500 bg-sky-50 shadow-sm ring-2 ring-sky-500/25 dark:border-sky-400 dark:bg-sky-950/40 dark:ring-sky-400/20'
                    : isSelected
                      ? 'border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-900'
                      : 'border-border hover:border-slate-400',
                  customized && 'cursor-not-allowed opacity-70',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{tpl.name}</p>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {isActive ? (
                      <Badge className="bg-sky-600 text-white hover:bg-sky-600">Active</Badge>
                    ) : null}
                    {isSelected && !isActive ? (
                      <Badge variant="outline">Selected</Badge>
                    ) : null}
                    <Badge variant={isActive ? 'secondary' : 'outline'}>
                      {tpl.stageCount} stages
                    </Badge>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tpl.description ?? tpl.key}
                </p>
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                  {tpl.stageKeys.join(' → ')}
                </p>
              </button>
            );
          })}
          {templatesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">Loading templates…</p>
          ) : null}
        </div>
      </div>

      {customized ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-4">
          <div className="min-w-[12rem] flex-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Definition name
            </label>
            <Input
              value={definitionName}
              onChange={(e) => setDefinitionName(e.target.value)}
              maxLength={120}
            />
          </div>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void saveName()}>
            <Save className="mr-1.5 h-4 w-4" />
            Save name
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Stages</p>
          <p className="text-xs text-muted-foreground">
            Rename labels shown on Establishment. Keys stay stable for contacts already in each stage.
          </p>
        </div>
        <ul className="divide-y divide-border">
          {stages.map((stage) => {
            const draft = drafts[stage.key] ?? {
              label: stage.label,
              shortLabel: stage.shortLabel,
            };
            const dirty =
              draft.label !== stage.label || draft.shortLabel !== stage.shortLabel;
            return (
              <li
                key={stage.key}
                className={cn(
                  'flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-end',
                  !stage.isEnabled && 'opacity-60',
                )}
                data-stage-key={stage.key}
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">
                      {stage.key}
                    </code>
                    {stage.isEntry ? <Badge>Entry</Badge> : null}
                    {stage.blocksArchive ? <Badge variant="outline">Blocks archive</Badge> : null}
                    {stage.graduatesSla ? <Badge variant="secondary">Graduates SLA</Badge> : null}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">
                        Label
                      </label>
                      <Input
                        value={draft.label}
                        disabled={!customized || busy}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [stage.key]: { ...draft, label: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">
                        Short
                      </label>
                      <Input
                        value={draft.shortLabel}
                        disabled={!customized || busy}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [stage.key]: { ...draft, shortLabel: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
                {customized ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={dirty ? 'default' : 'outline'}
                    disabled={!dirty || busy}
                    onClick={() => void saveStage(stage)}
                  >
                    Save
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {customized ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
          <p className="text-sm font-semibold">Add stage</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Key must be UPPER_SNAKE_CASE. New stages append after the current journey.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">
                Key
              </label>
              <Input
                placeholder="CUSTOM_TOUCH"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                className="w-44 font-mono text-sm"
              />
            </div>
            <div className="min-w-[10rem] flex-1">
              <label className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">
                Label
              </label>
              <Input
                placeholder="Custom touchpoint"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
            <Button
              type="button"
              disabled={busy || !newKey.trim() || !newLabel.trim()}
              onClick={() => void addStage()}
              data-testid="pipeline-add-stage-btn"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
