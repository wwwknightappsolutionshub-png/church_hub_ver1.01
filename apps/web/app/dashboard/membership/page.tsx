'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, CalendarCheck, FileUp, Home, Search, UserPlus, Users } from 'lucide-react';
import {
  LazyAttendancePanel,
  LazyClassesPanel,
  LazyFamiliesPanel,
  LazyMemberDetailPanel,
  LazyMemberOnboardingWizard,
  LazyMembershipImportWizard,
} from '@/lib/membership-lazy';
import { DashboardPageSkeleton } from '@/components/dashboard/DashboardPageSkeleton';
import type { AxiosError } from 'axios';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useMembershipAccess } from '@/lib/hooks/use-membership-access';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { StatusPipeline } from '@/components/membership/StatusPipeline';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
interface MemberListItem {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  roles: string[];
  ministryInterests: string[];
  onboardingStep: number;
  family?: { id: string; name: string } | null;
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

interface MemberDetail extends MemberListItem {
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  parentLinks?: Array<{ child: { id: string; firstName: string; lastName: string } }>;
  childLinks?: Array<{ parent: { id: string; firstName: string; lastName: string } }>;
}

interface MembershipStats {
  total: number;
  inOnboarding: number;
  families: number;
  byStatus: Record<string, number>;
}

interface Catalog {
  ministryInterests: string[];
}

interface Family {
  id: string;
  name: string;
  members: Array<{ id: string; firstName: string; lastName: string; status: string }>;
}

export default function MembershipPage() {
  const queryClient = useQueryClient();
  const { canManageMembers } = useMembershipAccess();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [showWizard, setShowWizard] = useState(false);
  const [wizardMemberId, setWizardMemberId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hubTab, setHubTab] = useState<
    'members' | 'families' | 'classes' | 'attendance' | 'import'
  >('members');

  const queryParams = new URLSearchParams();
  if (search) queryParams.set('search', search);
  if (statusFilter) queryParams.set('status', statusFilter);
  if (roleFilter) queryParams.set('role', roleFilter);
  const membersUrl = `/membership/members${queryParams.toString() ? `?${queryParams}` : ''}`;

  const {
    data: members,
    isLoading,
    isError,
    error: membersError,
  } = useApiQuery<MemberListItem[]>(
    ['membership', search, statusFilter ?? '', roleFilter ?? ''],
    membersUrl,
  );
  const { data: stats } = useApiQuery<MembershipStats>(['membership-stats'], '/membership/stats');
  const { data: catalog } = useApiQuery<Catalog>(['membership-catalog'], '/membership/catalog');
  const { data: families } = useApiQuery<Family[]>(['membership-families'], '/membership/families');

  const { data: selectedMember } = useApiQuery<MemberDetail>(
    ['membership-member', selectedId ?? ''],
    `/membership/members/${selectedId}`,
    { enabled: !!selectedId },
  );

  const ministryOptions = catalog?.ministryInterests ?? [];

  const openOnboarding = (id?: string) => {
    setWizardMemberId(id ?? null);
    setShowWizard(true);
    if (id) setSelectedId(null);
  };

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      openOnboarding();
    }
  }, [searchParams]);

  const handleMemberClick = async (id: string) => {
    const m = members?.find((x) => x.id === id);
    if (m && m.onboardingStep > 0 && m.onboardingStep < 6) {
      openOnboarding(id);
    } else {
      setSelectedId(id);
    }
  };

  const roleFilters = useMemo(
    () => ['YOUTH', 'ADULT', 'LEADER', 'DRIVER', 'EVANGELIST'] as const,
    [],
  );

  return (
    <DashboardModuleShell
      title="Membership"
      description="Enterprise member registry—onboarding, households, ministry placement, and lifecycle governance from visitor through discipleship."
      badge={
        stats ? (
          <Badge variant="outline" className="border-slate-500 text-slate-200">
            {stats.total} members
          </Badge>
        ) : undefined
      }
      actions={
        canManageMembers ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setHubTab('import')}
            >
              <FileUp className="mr-1.5 h-4 w-4" />
              Import CSV
            </Button>
            <Button size="sm" className="shadow-brand" onClick={() => openOnboarding()}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              Start onboarding
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="membership-hub-root space-y-6">
        {stats && (
          <StatusPipeline
            counts={stats.byStatus}
            activeFilter={statusFilter}
            onFilter={setStatusFilter}
          />
        )}

        <div
          className="flex flex-wrap gap-2 border-b border-border pb-2"
          role="tablist"
          aria-label="Membership sections"
        >
          {(
            [
              { id: 'members' as const, label: 'Members', icon: Users },
              { id: 'families' as const, label: 'Families', icon: Home },
              { id: 'classes' as const, label: 'Classes', icon: BookOpen },
              { id: 'attendance' as const, label: 'Attendance', icon: CalendarCheck },
              ...(canManageMembers
                ? [{ id: 'import' as const, label: 'Import', icon: FileUp }]
                : []),
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={hubTab === id ? 'default' : 'outline'}
              size="sm"
              role="tab"
              aria-selected={hubTab === id}
              onClick={() => setHubTab(id)}
            >
              <Icon className="mr-1.5 h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        {hubTab === 'families' && (
          <LazyFamiliesPanel
            canManage={canManageMembers}
            members={(members ?? []).map((m) => ({
              id: m.id,
              firstName: m.firstName,
              lastName: m.lastName,
            }))}
          />
        )}

        {hubTab === 'classes' && (
          <LazyClassesPanel
            canManage={canManageMembers}
            members={(members ?? []).map((m) => ({
              id: m.id,
              firstName: m.firstName,
              lastName: m.lastName,
            }))}
          />
        )}

        {hubTab === 'import' && canManageMembers && (
          <LazyMembershipImportWizard
            onComplete={() => {
              queryClient.invalidateQueries({ queryKey: ['membership'] });
              queryClient.invalidateQueries({ queryKey: ['membership-stats'] });
              queryClient.invalidateQueries({ queryKey: ['membership-families'] });
            }}
          />
        )}

        {hubTab === 'attendance' && (
          <LazyAttendancePanel
            members={(members ?? []).map((m) => ({
              id: m.id,
              firstName: m.firstName,
              lastName: m.lastName,
              familyId: m.family?.id ?? null,
            }))}
          />
        )}

        {hubTab === 'members' && (
          <>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
        {isError && (
          <p className="text-sm text-destructive">{membershipErrorMessage(membersError)}</p>
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Member</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Family</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Roles</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground xl:table-cell">
                  Ministries
                </th>
              </tr>
            </thead>
            <tbody>
              {(members ?? []).map((m) => (
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
                        <span className="text-xs text-muted-foreground">+{m.ministryInterests.length - 2}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(members ?? []).length === 0 && !isLoading && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No members match your filters.{' '}
              {canManageMembers && (
                <button type="button" className="text-primary underline" onClick={() => openOnboarding()}>
                  Start onboarding
                </button>
              )}
            </p>
          )}
        </div>
          </>
        )}
      </div>

      {showWizard && canManageMembers && (
        <LazyMemberOnboardingWizard
          memberId={wizardMemberId}
          ministryOptions={ministryOptions}
          families={(families ?? []).map((f) => ({ id: f.id, name: f.name }))}
          onClose={() => {
            setShowWizard(false);
            setWizardMemberId(null);
            queryClient.invalidateQueries({ queryKey: ['membership'] });
          }}
          onCreated={(id) => setWizardMemberId(id)}
        />
      )}

      {selectedId && selectedMember && (
        <LazyMemberDetailPanel
          member={selectedMember}
          allMembers={(members ?? []).map((m) => ({
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
    </DashboardModuleShell>
  );
}
