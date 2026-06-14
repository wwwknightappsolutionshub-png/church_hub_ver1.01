'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search, UserPlus } from 'lucide-react';
import type { AxiosError } from 'axios';
import type { PaginatedMembersDto } from '@church-hub/shared-types';
import {
  normalizeMembersListResponse,
  type MemberListRow,
} from '@/lib/membership/normalize-members-list';
import {
  LazyCongregantEditorForm,
  LazyMemberDetailPanel,
  LazyMemberOnboardingWizard,
} from '@/lib/membership-lazy';
import { invalidateMembershipQueries } from '@/lib/membership/invalidate-membership';
import { DashboardPageSkeleton } from '@/components/dashboard/DashboardPageSkeleton';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useMembershipAccess } from '@/lib/hooks/use-membership-access';
import {
  ROLE_LABELS,
  STATUS_LABELS,
  STATUS_VARIANT,
  formatMemberName,
  onboardingProgress,
} from '@/lib/membership';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

interface MemberListItem extends MemberListRow {
  roles: string[];
  ministryInterests: string[];
  onboardingStep: number;
}

interface MemberDetail extends MemberListItem {
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  parentLinks?: Array<{ child: { id: string; firstName: string; lastName: string } }>;
  childLinks?: Array<{ parent: { id: string; firstName: string; lastName: string } }>;
}

interface Catalog {
  ministryInterests: string[];
}

interface Family {
  id: string;
  name: string;
}

function membershipErrorMessage(err: AxiosError | null): string {
  const status = err?.response?.status;
  if (status === 401) {
    return 'Session expired or invalid — sign out and sign in again at /login.';
  }
  if (status === 403) {
    return 'You do not have permission to view members.';
  }
  if (status && status >= 500) {
    return 'Server error loading members — check the API terminal logs.';
  }
  if (!err?.response) {
    return 'Cannot reach the API — start Church API on port 4000 (pnpm dev in apps/api) and confirm Postgres is running.';
  }
  return 'Could not load members — ensure API and database are running.';
}

export function CongregantsMembersView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canManageMembers } = useMembershipAccess();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    () => searchParams.get('status') ?? undefined,
  );
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [showWizard, setShowWizard] = useState(false);
  const [showCongregantEditor, setShowCongregantEditor] = useState(false);
  const [editCongregantId, setEditCongregantId] = useState<string | null>(null);
  const [wizardMemberId, setWizardMemberId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, roleFilter, pageSize]);

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('limit', String(pageSize));
  if (search) queryParams.set('search', search);
  if (statusFilter) queryParams.set('status', statusFilter);
  if (roleFilter) queryParams.set('role', roleFilter);
  const membersUrl = `/membership/members?${queryParams}`;

  const {
    data: rawPaginated,
    isLoading,
    isError,
    error: membersError,
  } = useApiQuery<PaginatedMembersDto<MemberListItem> | MemberListItem[]>(
    ['membership-members', String(page), String(pageSize), search, statusFilter ?? '', roleFilter ?? ''],
    membersUrl,
  );
  const paginated = normalizeMembersListResponse(rawPaginated) as PaginatedMembersDto<MemberListItem>;
  const members = (paginated.items ?? []).map((m) => ({
    ...m,
    roles: m.roles ?? [],
    ministryInterests: m.ministryInterests ?? [],
    onboardingStep: m.onboardingStep ?? 0,
  }));
  const total = paginated.total ?? 0;
  const totalPages = paginated.totalPages ?? 0;

  const { data: catalog } = useApiQuery<Catalog>(['membership-catalog'], '/membership/catalog');
  const { data: families } = useApiQuery<Family[]>(['membership-families'], '/membership/families');
  const { data: selectedMember } = useApiQuery<MemberDetail>(
    ['membership-member', selectedId ?? ''],
    `/membership/members/${selectedId}`,
    { enabled: !!selectedId },
  );

  const ministryOptions = catalog?.ministryInterests ?? [];
  const roleFilters = useMemo(
    () => ['YOUTH', 'ADULT', 'LEADER', 'DRIVER', 'EVANGELIST'] as const,
    [],
  );

  const invalidateMembership = () => invalidateMembershipQueries(queryClient);

  const openOnboarding = (id?: string) => {
    setWizardMemberId(id ?? null);
    setShowWizard(true);
    if (id) setSelectedId(null);
  };

  const openCongregantEditor = (id?: string | null) => {
    setEditCongregantId(id ?? null);
    setShowCongregantEditor(true);
    setSelectedId(null);
  };

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      window.scrollTo(0, 0);
      openCongregantEditor();
      router.replace('/dashboard/membership/members');
    }
  }, [searchParams, router]);

  const handleMemberClick = (id: string) => {
    const m = members.find((x) => x.id === id);
    if (m && m.onboardingStep > 0 && m.onboardingStep < 6) {
      openOnboarding(id);
    } else {
      setSelectedId(id);
    }
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Members</h2>
          <p className="text-sm text-muted-foreground">Search, filter, and manage congregant records.</p>
        </div>
        {canManageMembers ? (
          <Button size="sm" className="shadow-brand" onClick={() => openCongregantEditor()} data-testid="quick-add-congregant">
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add New Congregant
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="congregant-search"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!roleFilter ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRoleFilter(undefined)}
          >
            All roles
          </Button>
          {roleFilters.map((r) => (
            <Button
              key={r}
              variant={roleFilter === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter(roleFilter === r ? undefined : r)}
            >
              {ROLE_LABELS[r]}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && <DashboardPageSkeleton cards={3} />}
      {isError && <p className="text-sm text-destructive">{membershipErrorMessage(membersError)}</p>}

      <div
        className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/50"
        data-testid="congregant-list"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Member</th>
              <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                Family
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                Roles
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground xl:table-cell">
                Ministries
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr
                key={m.id}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/20"
                onClick={() => handleMemberClick(m.id)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {m.firstName[0]}
                        {m.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium">{formatMemberName(m)}</span>
                      {m.onboardingStep > 0 && m.onboardingStep < 6 && (
                        <p className="text-[10px] text-gold">
                          Onboarding {onboardingProgress(m.onboardingStep)}%
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                  {m.family?.name ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[m.status] ?? 'outline'}>
                    {STATUS_LABELS[m.status] ?? m.status}
                  </Badge>
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {m.roles.slice(0, 3).map((r) => (
                      <span key={r} className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">
                        {ROLE_LABELS[r] ?? r}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="hidden px-4 py-3 xl:table-cell">
                  <div className="flex max-w-[200px] flex-wrap gap-0.5">
                    {m.ministryInterests.slice(0, 2).map((t) => (
                      <span key={t} className="truncate text-xs text-muted-foreground">
                        {t}
                      </span>
                    ))}
                    {m.ministryInterests.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{m.ministryInterests.length - 2}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && !isLoading && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No members match your filters.{' '}
            {canManageMembers && (
              <button type="button" className="text-primary underline" onClick={() => openCongregantEditor()}>
                Add congregant
              </button>
            )}
          </p>
        )}
      </div>

      {!isLoading && total > 0 ? (
        <div
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          data-testid="congregant-pagination"
        >
          <p className="text-sm text-muted-foreground">
            Showing {rangeStart}–{rangeEnd} of {total} members
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Per page
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                data-testid="congregant-page-size"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              data-testid="congregant-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[5rem] text-center text-sm tabular-nums">
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              data-testid="congregant-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {showWizard && canManageMembers && (
        <LazyMemberOnboardingWizard
          memberId={wizardMemberId}
          ministryOptions={ministryOptions}
          families={(families ?? []).map((f) => ({ id: f.id, name: f.name }))}
          onClose={() => {
            setShowWizard(false);
            setWizardMemberId(null);
            invalidateMembership();
          }}
          onCreated={(id) => setWizardMemberId(id)}
        />
      )}

      {showCongregantEditor && canManageMembers && (
        <LazyCongregantEditorForm
          memberId={editCongregantId}
          families={(families ?? []).map((f) => ({ id: f.id, name: f.name }))}
          onClose={() => {
            setShowCongregantEditor(false);
            setEditCongregantId(null);
          }}
          onSaved={() => invalidateMembership()}
        />
      )}

      {selectedId && selectedMember && (
        <LazyMemberDetailPanel
          member={selectedMember}
          allMembers={members.map((m) => ({
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
          }))}
          ministryOptions={ministryOptions}
          canManageMembers={canManageMembers}
          onClose={() => setSelectedId(null)}
          onDeleted={() => setSelectedId(null)}
          onEditOnboarding={() => {
            if (!canManageMembers) return;
            setSelectedId(null);
            openOnboarding(selectedMember.id);
          }}
        />
      )}
    </div>
  );
}
