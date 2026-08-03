'use client';

import { useMemo } from 'react';
import { MapPin, Search, User } from 'lucide-react';
import type { BranchRow } from '@/components/ministry-cells/types';
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
        // allow spaced search against original fields
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

      <div
        className="max-h-[min(70vh,36rem)] overflow-y-auto overscroll-contain rounded-xl border border-border/60 bg-muted/10 p-2"
        role="listbox"
        aria-label="Cell branches"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>
        )}
      </div>
    </div>
  );
}
