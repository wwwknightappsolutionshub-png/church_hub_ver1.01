'use client';

import { useState } from 'react';
import { Eye, Loader2, Plus, StickyNote, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { CreateCellProvinceSchema } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { ProvinceDetailPanel } from '@/components/ministry-cells/ProvinceDetailPanel';
import { ProvinceEditPanel } from '@/components/ministry-cells/ProvinceEditPanel';
import type { CellProvinceRow } from '@/components/ministry-cells/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function ProvincesSetupPanel({
  onChanged,
  selectedProvinceId = null,
  onSelectProvince,
}: {
  onChanged: () => void;
  selectedProvinceId?: string | null;
  onSelectProvince?: (province: { id: string; name: string } | null) => void;
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
  const [showCreate, setShowCreate] = useState(false);
  const [viewProvince, setViewProvince] = useState<CellProvinceRow | null>(null);
  const [editProvince, setEditProvince] = useState<CellProvinceRow | null>(null);

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {provinces.length} province{provinces.length === 1 ? '' : 's'}
        </p>
        <Button type="button" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Create province
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="px-4 py-2.5">
          <CardTitle className="text-sm font-semibold">Provinces</CardTitle>
        </CardHeader>
        <CardContent className="max-h-80 space-y-2 overflow-y-auto px-4 pb-3 pt-0">
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          {provinces.map((p) => {
            const selected = selectedProvinceId === p.id;
            return (
              <div
                key={p.id}
                className={cn(
                  'flex items-start justify-between gap-2 rounded-lg border p-3 text-sm transition',
                  selected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border/60',
                )}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() =>
                    onSelectProvince?.(selected ? null : { id: p.id, name: p.name })
                  }
                  aria-pressed={selected}
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Leader: {p.leader.name} · {p.branchCount} cells
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.postcodes.join(', ') || 'No postcodes'}
                  </p>
                  {onSelectProvince ? (
                    <p className="mt-1 text-[11px] font-medium text-primary">
                      {selected ? 'Selected · click to clear' : 'Click to filter cells'}
                    </p>
                  ) : null}
                </button>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground"
                    aria-label={`View ${p.name}`}
                    onClick={() => setViewProvince(p)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground"
                    aria-label={`Edit ${p.name}`}
                    onClick={() => setEditProvince(p)}
                  >
                    <StickyNote className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    aria-label={`Delete ${p.name}`}
                    onClick={() => void remove(p.id, p.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          {!isLoading && provinces.length === 0 && (
            <p className="text-sm text-muted-foreground">No provinces yet.</p>
          )}
        </CardContent>
      </Card>

      {showCreate ? (
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
                <select
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
                </select>
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
      ) : null}

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
    </div>
  );
}
