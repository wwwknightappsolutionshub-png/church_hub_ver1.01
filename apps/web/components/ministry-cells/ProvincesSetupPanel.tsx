'use client';

import { useState } from 'react';
import { Eye, Loader2, MoreHorizontal, Plus, StickyNote, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { CreateCellProvinceSchema } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { ProvinceDetailPanel } from '@/components/ministry-cells/ProvinceDetailPanel';
import { ProvinceEditPanel } from '@/components/ministry-cells/ProvinceEditPanel';
import type { CellProvinceRow } from '@/components/ministry-cells/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { FormSelect } from '@/components/ui/form-select';

export function ProvincesSetupPanel({
  onChanged,
  selectedProvinceId = null,
  onSelectProvince,
  variant = 'bar',
  createOpen,
  onCreateOpenChange,
  hideCreateChip = false,
}: {
  onChanged: () => void;
  selectedProvinceId?: string | null;
  onSelectProvince?: (province: { id: string; name: string } | null) => void;
  /** Horizontal coverage chips (default) or legacy vertical rail */
  variant?: 'bar' | 'rail';
  /** Controlled create-modal open (optional) */
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
  /** Hide inline + Province chip (create is triggered from parent actions) */
  hideCreateChip?: boolean;
}) {
  const { data: provinces = [], isLoading } = useApiQuery<CellProvinceRow[]>(
    ['ministry-cells', 'provinces'],
    '/ministry-cells/provinces',
  );
  const { data: candidates = [] } = useApiQuery<{ id: string; name: string; email: string }[]>(
    ['ministry-cells', 'provincial-leader-candidates'],
    '/ministry-cells/provincial-leader-candidates',
  );

  const [name, setName] = useState('');
  const [postcodes, setPostcodes] = useState('');
  const [leaderUserId, setLeaderUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [internalCreate, setInternalCreate] = useState(false);
  const [viewProvince, setViewProvince] = useState<CellProvinceRow | null>(null);
  const [editProvince, setEditProvince] = useState<CellProvinceRow | null>(null);
  const [menuProvinceId, setMenuProvinceId] = useState<string | null>(null);

  const showCreate = createOpen ?? internalCreate;
  const setShowCreate = (open: boolean) => {
    onCreateOpenChange?.(open);
    if (createOpen === undefined) setInternalCreate(open);
  };

  const openCreate = () => setShowCreate(true);

  const closeCreate = () => {
    setShowCreate(false);
    setName('');
    setPostcodes('');
    setLeaderUserId('');
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = postcodes
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const parsed = CreateCellProvinceSchema.safeParse({
      name,
      leaderUserId,
      postcodes: list,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Check the province details');
      return;
    }
    setBusy(true);
    try {
      await api.post('/ministry-cells/provinces', parsed.data);
      toast.success('Province created');
      closeCreate();
      onChanged();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed to create province');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, label: string) => {
    if (!confirm(`Delete province "${label}"? Cells will be unmapped.`)) return;
    try {
      await api.delete(`/ministry-cells/provinces/${id}`);
      toast.success('Province deleted');
      if (selectedProvinceId === id) onSelectProvince?.(null);
      onChanged();
    } catch {
      toast.error('Failed to delete province');
    }
  };

  const createModal = showCreate ? (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={closeCreate}
    >
      <div
        className="flex max-h-[min(94vh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-background shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-province-title"
        data-testid="create-province-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 id="create-province-title" className="text-base font-semibold">
              Create province
            </h2>
            <p className="text-xs text-muted-foreground">
              Set coverage postcodes and assign a provincial leader
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Close"
            onClick={closeCreate}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form
          className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
          onSubmit={(e) => void create(e)}
        >
          <div className="space-y-1">
            <Label htmlFor="province-name">Name</Label>
            <Input
              id="province-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="North London"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="province-postcodes">Coverage postcodes</Label>
            <Input
              id="province-postcodes"
              value={postcodes}
              onChange={(e) => setPostcodes(e.target.value)}
              placeholder="N1, N2, N3 (comma-separated)"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Outward codes or full postcodes. Each code can belong to only one province.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="province-leader">Provincial leader</Label>
            <FormSelect
              id="province-leader"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={leaderUserId}
              onChange={(e) => setLeaderUserId(e.target.value)}
              required
            >
              <option value="">Select PROVINCIAL_LEADER user…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </FormSelect>
            {candidates.length === 0 && (
              <p className="text-[11px] text-amber-700">
                Create a staff user with the PROVINCIAL_LEADER role first (Church Officers).
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <Button
              type="submit"
              className="h-10 flex-1 sm:flex-none"
              disabled={busy || !candidates.length}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              Create province
            </Button>
            <Button type="button" variant="ghost" className="h-10" onClick={closeCreate}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  const panels = (
    <>
      {createModal}
      {viewProvince ? (
        <ProvinceDetailPanel province={viewProvince} onClose={() => setViewProvince(null)} />
      ) : null}
      {editProvince ? (
        <ProvinceEditPanel
          province={editProvince}
          onClose={() => setEditProvince(null)}
          onSaved={onChanged}
        />
      ) : null}
    </>
  );

  if (variant === 'bar') {
    return (
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Coverage
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {onSelectProvince ? (
              <button
                type="button"
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition',
                  !selectedProvinceId
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80',
                )}
                onClick={() => onSelectProvince(null)}
                aria-pressed={!selectedProvinceId}
              >
                All areas
              </button>
            ) : null}

            {isLoading ? (
              <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : null}

            {provinces.map((p) => {
              const selected = selectedProvinceId === p.id;
              const menuOpen = menuProvinceId === p.id;
              return (
                <div key={p.id} className="relative shrink-0">
                  <div
                    className={cn(
                      'flex items-center gap-0.5 rounded-full pl-3 transition',
                      selected
                        ? 'bg-[hsl(215,45%,22%)] text-white'
                        : 'bg-slate-100 text-slate-800 hover:bg-slate-200/80',
                    )}
                  >
                    <button
                      type="button"
                      className="max-w-[11rem] truncate py-1.5 pr-1 text-left text-xs font-medium"
                      onClick={() =>
                        onSelectProvince?.(selected ? null : { id: p.id, name: p.name })
                      }
                      aria-pressed={selected}
                      title={`${p.name} · ${p.leader.name} · ${p.branchCount} cells`}
                    >
                      {p.name}
                      <span
                        className={cn(
                          'ml-1.5 tabular-nums',
                          selected ? 'text-white/70' : 'text-slate-500',
                        )}
                      >
                        {p.branchCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'mr-1 rounded-full p-1 transition',
                        selected ? 'hover:bg-white/15' : 'hover:bg-slate-300/50',
                      )}
                      aria-label={`${p.name} actions`}
                      aria-expanded={menuOpen}
                      onClick={() => setMenuProvinceId(menuOpen ? null : p.id)}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {menuOpen ? (
                    <div className="absolute left-0 top-[calc(100%+4px)] z-20 min-w-[9.5rem] overflow-hidden rounded-lg border border-border/80 bg-background py-1 shadow-lg">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted"
                        onClick={() => {
                          setMenuProvinceId(null);
                          setViewProvince(p);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        View
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted"
                        onClick={() => {
                          setMenuProvinceId(null);
                          setEditProvince(p);
                        }}
                      >
                        <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-destructive hover:bg-muted"
                        onClick={() => {
                          setMenuProvinceId(null);
                          void remove(p.id, p.name);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {!hideCreateChip ? (
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                onClick={openCreate}
              >
                <Plus className="h-3.5 w-3.5" />
                Province
              </button>
            ) : null}
          </div>
        </div>
        {panels}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-slate-900">Provinces</h3>
          <p className="text-[11px] text-muted-foreground">
            {provinces.length} region{provinces.length === 1 ? '' : 's'} · click to filter
          </p>
        </div>
        <Button type="button" size="sm" className="h-8 shrink-0" onClick={openCreate}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Create province
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto py-2">
        {onSelectProvince ? (
          <button
            type="button"
            className={cn(
              'flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition',
              !selectedProvinceId
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-muted/70',
            )}
            onClick={() => onSelectProvince(null)}
            aria-pressed={!selectedProvinceId}
          >
            <span className="font-medium">All cells</span>
          </button>
        ) : null}

        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {provinces.map((p) => {
          const selected = selectedProvinceId === p.id;
          return (
            <div
              key={p.id}
              className={cn(
                'group rounded-md px-1 py-0.5 transition',
                selected ? 'bg-primary/8' : 'hover:bg-muted/50',
              )}
            >
              <div className="flex items-start gap-1">
                <button
                  type="button"
                  className="min-w-0 flex-1 rounded-md px-1.5 py-2 text-left"
                  onClick={() =>
                    onSelectProvince?.(selected ? null : { id: p.id, name: p.name })
                  }
                  aria-pressed={selected}
                >
                  <p
                    className={cn(
                      'truncate text-sm font-medium',
                      selected ? 'text-primary' : 'text-slate-900',
                    )}
                  >
                    {p.name}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {p.leader.name} · {p.branchCount} cell{p.branchCount === 1 ? '' : 's'}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground/90">
                    {p.postcodes.join(', ') || 'No postcodes'}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-0.5 pt-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground"
                    aria-label={`View ${p.name}`}
                    onClick={() => setViewProvince(p)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground"
                    aria-label={`Edit ${p.name}`}
                    onClick={() => setEditProvince(p)}
                  >
                    <StickyNote className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    aria-label={`Delete ${p.name}`}
                    onClick={() => void remove(p.id, p.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {!isLoading && provinces.length === 0 && (
          <p className="px-2 py-6 text-sm text-muted-foreground">
            No provinces yet. Create one to organize cells by area.
          </p>
        )}
      </div>
      {panels}
    </div>
  );
}
