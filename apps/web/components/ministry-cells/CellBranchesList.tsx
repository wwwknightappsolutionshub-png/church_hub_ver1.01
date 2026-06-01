'use client';

import { useMemo } from 'react';
import { MapPin, Search, User } from 'lucide-react';
import type { BranchRow } from '@/components/ministry-cells/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function branchInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

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

  return (
    <button
      type="button"
      data-testid="branch-picker-item"
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]',
        selected
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border hover:border-primary/30',
      )}
    >
      <div
        className="h-1.5 w-full shrink-0"
        style={{ background: `linear-gradient(90deg, hsl(${hue} 55% 45%), hsl(${(hue + 40) % 360} 60% 55%))` }}
        aria-hidden
      />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-inner"
            style={{ background: `hsl(${hue} 50% 42%)` }}
          >
            {branchInitials(branch.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-base font-semibold leading-tight group-hover:text-primary">
              {branch.name}
            </p>
            {branch.location && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{branch.location}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="tabular-nums">
            {branch.memberCount} members
          </Badge>
          {branch.incidentCount > 0 && (
            <Badge variant="destructive" className="tabular-nums">
              {branch.incidentCount} incidents
            </Badge>
          )}
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{branch.leader?.name ?? 'Leader unassigned'}</span>
        </div>
      </div>
    </button>
  );
}

export function CellBranchesList({
  branches,
  selectedBranchId,
  onSelectBranch,
  canManage,
  search,
  onSearchChange,
}: {
  branches: BranchRow[];
  selectedBranchId: string | null;
  onSelectBranch: (id: string) => void;
  canManage: boolean;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.location?.toLowerCase().includes(q) ||
        b.leader?.name.toLowerCase().includes(q) ||
        (b.members ?? []).some((m) => m.name.toLowerCase().includes(q)),
    );
  }, [branches, search]);

  const emptyMessage =
    branches.length === 0
      ? `No cell branches yet.${canManage ? ' Create your first branch above.' : ''}`
      : 'No branches match your search.';

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search branches, leaders, members…"
          className="h-10 rounded-xl border-border/80 bg-background pl-9 shadow-sm"
          aria-label="Search cell branches"
        />
      </div>

      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
        role="listbox"
        aria-label="Cell branches"
      >
        {filtered.map((b) => (
          <BranchGridCard
            key={b.id}
            branch={b}
            selected={selectedBranchId === b.id}
            onSelect={() => onSelectBranch(b.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
