'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type FieldVisibility = 'VISIBLE' | 'RESTRICTED' | 'HIDDEN';
export type FieldEditability = 'EDITABLE' | 'READ_ONLY' | 'LOCKED';

export type FieldPolicyRow = {
  fieldKey: string;
  label: string;
  group: string;
  entity: string;
  hardcodedFloor: FieldVisibility;
  effectiveVisibility: FieldVisibility;
  effectiveEditability: FieldEditability;
  effectiveSource: string;
  override: {
    visibility: FieldVisibility;
    editability: FieldEditability;
    updatedAt: string;
  } | null;
};

type Draft = {
  visibility: FieldVisibility;
  editability: FieldEditability;
};

const VIS_OPTIONS: { value: FieldVisibility; label: string }[] = [
  { value: 'VISIBLE', label: 'Visible' },
  { value: 'RESTRICTED', label: 'Restricted' },
  { value: 'HIDDEN', label: 'Hidden' },
];

const EDIT_OPTIONS: { value: FieldEditability; label: string }[] = [
  { value: 'EDITABLE', label: 'Editable' },
  { value: 'READ_ONLY', label: 'Read only' },
  { value: 'LOCKED', label: 'Locked' },
];

const VIS_RANK: Record<FieldVisibility, number> = {
  VISIBLE: 0,
  RESTRICTED: 1,
  HIDDEN: 2,
};

function canSelectVisibility(floor: FieldVisibility, option: FieldVisibility): boolean {
  return VIS_RANK[option] >= VIS_RANK[floor];
}

type Props = {
  /** React-query key fragment */
  queryKey: string[];
  catalogUrl: string;
  saveUrl: string;
  canWrite: boolean;
  description?: string;
  /** Extra query params for POST (platform scope) */
  saveMethod?: 'post';
};

export function MemberFieldAccessEditor({
  queryKey,
  catalogUrl,
  saveUrl,
  canWrite,
  description,
}: Props) {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useApiQuery<FieldPolicyRow[]>(queryKey, catalogUrl, {
    enabled: true,
  });
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [dirty, setDirty] = useState(false);
  /** Single-open accordion; null = all collapsed (default). */
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, Draft> = {};
    for (const r of rows) {
      next[r.fieldKey] = {
        visibility: r.override?.visibility ?? r.effectiveVisibility,
        editability: r.override?.editability ?? r.effectiveEditability,
      };
    }
    setDrafts(next);
    setDirty(false);
    setOpenGroup(null);
  }, [rows]);

  const grouped = useMemo(() => {
    const map = new Map<string, FieldPolicyRow[]>();
    for (const r of rows) {
      const list = map.get(r.group) ?? [];
      list.push(r);
      map.set(r.group, list);
    }
    return [...map.entries()];
  }, [rows]);

  const toggleGroup = (group: string) => {
    setOpenGroup((prev) => (prev === group ? null : group));
  };

  const setDraft = (fieldKey: string, patch: Partial<Draft>) => {
    setDrafts((prev) => ({
      ...prev,
      [fieldKey]: { ...prev[fieldKey], ...patch },
    }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const items = rows
        .map((r) => {
          const d = drafts[r.fieldKey];
          if (!d) return null;
          const baselineVis = r.override?.visibility ?? r.effectiveVisibility;
          const baselineEdit = r.override?.editability ?? r.effectiveEditability;
          if (d.visibility === baselineVis && d.editability === baselineEdit && !dirty) {
            return null;
          }
          // Always send current draft for dirty save of changed or all edited
          return {
            fieldKey: r.fieldKey,
            visibility: d.visibility,
            editability: d.editability,
          };
        })
        .filter(Boolean) as Array<{
        fieldKey: string;
        visibility: FieldVisibility;
        editability: FieldEditability;
      }>;

      // Send only rows that differ from effective without override, or from override
      const changed = items.filter((item) => {
        const r = rows.find((x) => x.fieldKey === item.fieldKey);
        if (!r) return false;
        const baseVis = r.override?.visibility ?? r.hardcodedFloor;
        const baseEdit =
          r.override?.editability ??
          (r.hardcodedFloor === 'VISIBLE' ? 'EDITABLE' : 'LOCKED');
        // Prefer comparing to last override or to what UI started with
        const started = {
          visibility: r.override?.visibility ?? r.effectiveVisibility,
          editability: r.override?.editability ?? r.effectiveEditability,
        };
        return (
          item.visibility !== started.visibility || item.editability !== started.editability
        );
      });

      if (!changed.length) {
        throw new Error('No changes to save');
      }

      const { data } = await api.post(saveUrl, { items: changed });
      return data;
    },
    onSuccess: () => {
      toast.success('Field access saved');
      setDirty(false);
      qc.invalidateQueries({ queryKey });
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not save field access')),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      <p className="text-xs text-muted-foreground">
        Hardcoded floor cannot be loosened. Ops viewers never see below the floor; leadership always
        sees profile fields. Capability rows document endpoint gates.
      </p>

      <div className="space-y-2">
        {grouped.map(([group, fields]) => {
          const isOpen = openGroup === group;
          const panelId = `field-access-${group.replace(/\s+/g, '-').toLowerCase()}`;
          return (
            <div
              key={group}
              className="overflow-hidden rounded-lg border border-border/70 bg-background"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40"
                onClick={() => toggleGroup(group)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                      isOpen && 'rotate-90',
                    )}
                    aria-hidden
                  />
                  <span className="text-sm font-semibold tracking-wide">{group}</span>
                </span>
                <Badge variant="outline" className="shrink-0 text-[10px] tabular-nums">
                  {fields.length} field{fields.length === 1 ? '' : 's'}
                </Badge>
              </button>

              {isOpen ? (
                <div
                  id={panelId}
                  role="region"
                  aria-label={group}
                  className="divide-y divide-border/60 border-t border-border/60"
                >
                  {fields.map((r) => {
                    const d = drafts[r.fieldKey] ?? {
                      visibility: r.effectiveVisibility,
                      editability: r.effectiveEditability,
                    };
                    const isCapability = r.fieldKey.startsWith('capability.');
                    return (
                      <div
                        key={r.fieldKey}
                        className={cn(
                          'grid gap-2 p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center',
                          isCapability && 'bg-muted/20',
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{r.label}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.fieldKey}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-[10px]">
                              Floor: {r.hardcodedFloor}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {r.effectiveSource}
                            </Badge>
                          </div>
                        </div>
                        <label className="block text-xs">
                          <span className="mb-1 block text-muted-foreground">Visibility (ops)</span>
                          <select
                            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                            value={d.visibility}
                            disabled={!canWrite || isCapability}
                            onChange={(e) =>
                              setDraft(r.fieldKey, {
                                visibility: e.target.value as FieldVisibility,
                              })
                            }
                          >
                            {VIS_OPTIONS.map((o) => (
                              <option
                                key={o.value}
                                value={o.value}
                                disabled={!canSelectVisibility(r.hardcodedFloor, o.value)}
                              >
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-xs">
                          <span className="mb-1 block text-muted-foreground">Editability (ops)</span>
                          <select
                            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                            value={d.editability}
                            disabled={!canWrite || isCapability}
                            onChange={(e) =>
                              setDraft(r.fieldKey, {
                                editability: e.target.value as FieldEditability,
                              })
                            }
                          >
                            {EDIT_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {canWrite ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save field access'}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">You have read-only access to this catalog.</p>
      )}
    </div>
  );
}
