'use client';

import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Users, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { STATUS_LABELS, STATUS_VARIANT } from '@/lib/membership';
import { cn } from '@/lib/utils';

export interface BranchListMember {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: string;
  family?: { id: string; name: string } | null;
  joinedAt?: string;
}

interface BranchDetailMembersResponse {
  id: string;
  name: string;
  memberCount: number;
  members?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    status?: string;
    family?: { id: string; name: string } | null;
    joinedAt?: string;
  }>;
}

function normalizeMember(m: NonNullable<BranchDetailMembersResponse['members']>[number]): BranchListMember {
  return {
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    name: `${m.firstName} ${m.lastName}`.trim(),
    email: m.email,
    phone: m.phone,
    status: m.status,
    family: m.family ?? null,
    joinedAt: m.joinedAt,
  };
}

export function CellBranchMembersSheet({
  branchId,
  branchName,
  memberCount,
  onClose,
}: {
  branchId: string;
  branchName: string;
  memberCount: number;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useApiQuery<BranchDetailMembersResponse>(
    ['ministry-cells', 'branch', branchId, 'members-sheet'],
    `/ministry-cells/branches/${branchId}`,
    { enabled: !!branchId },
  );

  const members = useMemo(
    () => (data?.members ?? []).map(normalizeMember),
    [data?.members],
  );

  const displayName = data?.name ?? branchName;
  const count = data?.memberCount ?? memberCount;

  const thClass =
    'whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-members-title"
        className="relative z-10 flex max-h-[min(88dvh,640px)] w-full max-w-4xl flex-col rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 id="branch-members-title" className="font-heading text-lg font-bold">
                {displayName} — members
              </h2>
              <p className="text-sm text-muted-foreground">
                {count} member{count === 1 ? '' : 's'} in this cell branch
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading members…
            </div>
          ) : isError ? (
            <p className="px-5 py-10 text-center text-sm text-destructive">
              Could not load members. Restart the API if you recently updated Ministry/Cells.
            </p>
          ) : members.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No members assigned to this branch yet.
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                <tr className="border-b border-border">
                  <th className={thClass}>Member name</th>
                  <th className={thClass}>Family</th>
                  <th className={cn(thClass, 'hidden sm:table-cell')}>Email</th>
                  <th className={cn(thClass, 'hidden md:table-cell')}>Phone</th>
                  <th className={thClass}>Status</th>
                  <th className={cn(thClass, 'hidden lg:table-cell')}>Joined cell</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.family?.name ?? '—'}</td>
                    <td className="hidden max-w-[200px] truncate px-4 py-3 text-muted-foreground sm:table-cell">
                      {m.email ?? '—'}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground md:table-cell">
                      {m.phone ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {m.status ? (
                        <Badge variant={STATUS_VARIANT[m.status] ?? 'outline'} className="text-xs">
                          {STATUS_LABELS[m.status] ?? m.status}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground lg:table-cell">
                      {m.joinedAt
                        ? new Date(m.joinedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-border px-5 py-3">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
