'use client';

import { useMemo, useState } from 'react';
import { MapPin, Search, User } from 'lucide-react';
import { MapCellProvinceControl } from '@/components/ministry-cells/MapCellProvinceControl';
import type { BranchRow } from '@/components/ministry-cells/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function BranchGridCard({
  branch,
  selected,
  onSelect,
}: {
  branch: BranchRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const hue = branch.name.split('').reduce((n, c) => n + c.charCodeAt(0), 0) % 360;
  const leader = branch.leader?.name ?? 'Leader unassigned';

  return (
    <button
      type="button"
      data-testid="branch-picker-item"
      onClick={onSelect}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        'hover:border-primary/40 hover:shadow-md active:scale-[0.99]',
        selected ? 'border-primary ring-2 ring-primary/25' : 'border-border',
      )}
    >
      <div
        className="h-1 w-full shrink-0"
        style={{
          background: `linear-gradient(90deg, hsl(${hue} 55% 45%), hsl(${(hue + 40) % 360} 60% 55%))`,
        }}
        aria-hidden
      />
      <div className="space-y-1 px-2.5 py-2">
        <p className="truncate font-heading text-sm font-semibold leading-tight text-primary group-hover:underline">
          {branch.name}
        </p>
        <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{branch.location?.trim() || 'No location'}</span>
        </p>
        <p className="truncate text-[11px] tabular-nums text-muted-foreground">
          {branch.postcode?.trim() || 'No postcode'}
          {branch.province?.name ? ` · ${branch.province.name}` : ''}
        </p>
        <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
          <User className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{leader}</span>
        </p>
      </div>
    </button>
  );
}

const DEFAULT_COLLAPSED_COUNT = 4;

export function CollapsibleCellCardsSection({
  title,
  description,
  branches,
  selectedBranchId,
  onSelectBranch,
  emptyMessage,
  defaultCollapsed = true,
  collapsedCount = DEFAULT_COLLAPSED_COUNT,
  showMapControls = false,
  onMapChanged,
}: {
  title: string;
  description?: string;
  branches: BranchRow[];
  selectedBranchId: string | null;
  onSelectBranch: (id: string) => void;
  emptyMessage: string;
  defaultCollapsed?: boolean;
  collapsedCount?: number;
  showMapControls?: boolean;
  onMapChanged?: () => void;
}) {
  const [expanded, setExpanded] = useState(!defaultCollapsed);
  const visible = expanded ? branches : branches.slice(0, collapsedCount);
  const canToggle = branches.length > collapsedCount;

  return (
    <section className="space-y-2" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description ? (
            <p className="text-[11px] text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {branches.length} cell{branches.length === 1 ? '' : 's'}
          </span>
          {canToggle ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-[11px]"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Show less' : 'View all'}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/10 p-2">
        {branches.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((b) => (
              <div key={b.id} className="flex min-w-0 flex-col gap-1.5">
                <BranchGridCard
                  branch={b}
                  selected={selectedBranchId === b.id}
                  onSelect={() => onSelectBranch(b.id)}
                />
                {showMapControls && onMapChanged ? (
                  <div className="rounded-lg border border-border/50 bg-background/80 px-2 py-1.5">
                    <MapCellProvinceControl branch={b} onChanged={onMapChanged} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function CellBranchesList({
  branches,
  selectedBranchId,
  onSelectBranch,
  canManage,
  search,
  onSearchChange,
  defaultCollapsed = true,
}: {
  branches: BranchRow[];
  selectedBranchId: string | null;
  onSelectBranch: (id: string) => void;
  canManage: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  defaultCollapsed?: boolean;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/\s+/g, '');
    if (!q) return branches;
    return branches.filter((b) => {
      const name = b.name.toLowerCase();
      const location = (b.location ?? '').toLowerCase();
      const leader = (b.leader?.name ?? '').toLowerCase();
      const postcode = (b.postcode ?? '').toLowerCase().replace(/\s+/g, '');
      const province = (b.province?.name ?? '').toLowerCase();
      const members = (b.members ?? []).some((m) => m.name.toLowerCase().includes(q));
      return (
        name.includes(q) ||
        location.includes(q) ||
        leader.includes(q) ||
        postcode.includes(q) ||
        province.includes(q) ||
        members ||
        name.includes(search.trim().toLowerCase()) ||
        location.includes(search.trim().toLowerCase())
      );
    });
  }, [branches, search]);

  const emptyMessage =
    branches.length === 0
      ? `No cell branches yet.${canManage ? ' Create your first branch above.' : ''}`
      : 'No cells match that name or postcode.';

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search cell name or postcode…"
          className="h-10 rounded-xl border-border/80 bg-background pl-9 shadow-sm"
          aria-label="Search cell branches by name or postcode"
        />
      </div>

      <CollapsibleCellCardsSection
        title="Cells"
        branches={filtered}
        selectedBranchId={selectedBranchId}
        onSelectBranch={onSelectBranch}
        emptyMessage={emptyMessage}
        defaultCollapsed={defaultCollapsed}
      />
    </div>
  );
}
