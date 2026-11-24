'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, MapPin, Network, Search, User } from 'lucide-react';
import { MapCellProvinceControl } from '@/components/ministry-cells/MapCellProvinceControl';
import type { BranchRow } from '@/components/ministry-cells/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const COLS =
  'sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1.15fr)] sm:gap-x-8';

function BranchDirectoryRow({
  branch,
  selected,
  onSelect,
  showMapControls,
  onMapChanged,
}: {
  branch: BranchRow;
  selected: boolean;
  onSelect: () => void;
  showMapControls?: boolean;
  onMapChanged?: () => void;
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const leader = branch.leader?.name ?? 'Leader unassigned';

  return (
    <div
      className={cn(
        'border-b border-border/50 last:border-b-0',
        selected && 'bg-[hsl(215,45%,22%)]/[0.04]',
      )}
    >
      <div className="flex items-stretch gap-0">
        <button
          type="button"
          data-testid="branch-picker-item"
          onClick={onSelect}
          className={cn(
            'flex min-w-0 flex-1 items-start gap-3 py-3 pl-0 pr-2 text-left transition sm:items-center',
            'hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
          )}
        >
          <span
            className={cn(
              'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full sm:mt-0',
              selected
                ? 'bg-[hsl(215,45%,22%)]'
                : branch.leader
                  ? 'bg-emerald-600/80'
                  : 'bg-amber-500/80',
            )}
            aria-hidden
          />
          <div className={cn('grid min-w-0 flex-1 gap-1 sm:grid sm:items-center', COLS)}>
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold text-slate-900">
                {branch.name}
              </p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground sm:hidden">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                {branch.location?.trim() || 'No location'}
              </p>
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="flex items-center gap-1 truncate text-xs text-slate-600">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                <span className="truncate">{branch.location?.trim() || 'No location'}</span>
              </p>
              <p className="mt-0.5 truncate pl-5 text-[11px] tabular-nums text-muted-foreground">
                {branch.postcode?.trim() || 'No postcode'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate text-xs text-slate-600">
                <User className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                <span className="truncate">{leader}</span>
              </p>
              <p className="mt-0.5 truncate pl-5 text-[11px] text-muted-foreground">
                {branch.province?.name ?? 'Unmapped'}
                {typeof branch.memberCount === 'number'
                  ? ` · ${branch.memberCount} member${branch.memberCount === 1 ? '' : 's'}`
                  : ''}
              </p>
            </div>
          </div>
        </button>

        {showMapControls && onMapChanged ? (
          <div className="flex w-14 shrink-0 items-center justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1 px-2 text-[11px] text-muted-foreground"
              onClick={() => setMapOpen((v) => !v)}
              aria-expanded={mapOpen}
            >
              {mapOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              Map
            </Button>
          </div>
        ) : null}
      </div>

      {showMapControls && onMapChanged && mapOpen ? (
        <div className="border-t border-border/40 bg-slate-50/80 px-0 py-2.5">
          <MapCellProvinceControl branch={branch} onChanged={onMapChanged} defaultOpen />
        </div>
      ) : null}
    </div>
  );
}

export function CollapsibleCellCardsSection({
  title,
  description,
  branches,
  selectedBranchId,
  onSelectBranch,
  emptyMessage,
  defaultCollapsed = true,
  collapsedCount = 8,
  showMapControls = false,
  onMapChanged,
  compact = false,
  emptyAction,
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
  compact?: boolean;
  emptyAction?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(!defaultCollapsed);
  const visible = expanded ? branches : branches.slice(0, collapsedCount);
  const canToggle = branches.length > collapsedCount;

  return (
    <section className="min-w-0" aria-label={title}>
      {!compact ? (
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/80 pb-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
            {description ? (
              <p className="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
                {description}
              </p>
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
                variant="ghost"
                className="h-7 px-2 text-[11px]"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? 'Show less' : 'View all'}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {branches.length === 0 ? (
        emptyAction ? (
          <div className="py-2">{emptyAction}</div>
        ) : (
          <p className="px-1 py-14 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        )
      ) : (
        <div className="min-w-0">
          {/* Title sits in the first column on the same row as Location / Leader headers */}
          <div className="flex items-center border-b border-border/60 py-2">
            <div
              className={cn(
                'grid min-w-0 flex-1 items-center gap-1 pl-4 sm:grid',
                COLS,
              )}
            >
              <div className="flex min-w-0 items-baseline justify-between gap-2 sm:block">
                <h3 className="truncate font-heading text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
                  {title}
                </h3>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground sm:hidden">
                  {branches.length} result{branches.length === 1 ? '' : 's'}
                </span>
              </div>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:block">
                Location
              </span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:block">
                Leader / coverage
              </span>
            </div>
            <div className="flex w-14 shrink-0 items-center justify-end gap-1">
              <span className="hidden text-[11px] tabular-nums text-muted-foreground sm:inline">
                {branches.length}
              </span>
              {canToggle ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="hidden h-7 px-1.5 text-[11px] sm:inline-flex"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? 'Less' : 'All'}
                </Button>
              ) : null}
            </div>
          </div>
          {visible.map((b) => (
            <BranchDirectoryRow
              key={b.id}
              branch={b}
              selected={selectedBranchId === b.id}
              onSelect={() => onSelectBranch(b.id)}
              showMapControls={showMapControls}
              onMapChanged={onMapChanged}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function BranchesSetupEmpty({
  onAddCell,
  onCreateProvince,
  filtered,
}: {
  onAddCell: () => void;
  onCreateProvince: () => void;
  filtered?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-[linear-gradient(160deg,#f7f8fa_0%,#eef2f6_45%,#e8eef5_100%)] px-5 py-12 sm:px-10 sm:py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 20%, rgba(30,58,95,0.12), transparent 42%), radial-gradient(circle at 88% 70%, rgba(180,140,60,0.1), transparent 40%)',
        }}
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-lg flex-col items-center text-center">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(215,45%,22%)] text-white shadow-sm">
          <Network className="h-5 w-5" aria-hidden />
        </div>
        <h3 className="font-heading text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          {filtered ? 'No cells in this view' : 'Build your cell network'}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {filtered
            ? 'Try another coverage filter or clear search to see more cells.'
            : 'Start with a cell branch, then group coverage into provinces for provincial leaders.'}
        </p>
        {!filtered ? (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            <Button type="button" className="h-10 px-4" onClick={onAddCell}>
              Add New Cell
            </Button>
            <Button type="button" variant="outline" className="h-10 px-4" onClick={onCreateProvince}>
              Create province
            </Button>
          </div>
        ) : null}
      </div>
    </div>
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
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search cell name or postcode…"
          className="h-10 border-border/70 bg-background pl-9"
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
