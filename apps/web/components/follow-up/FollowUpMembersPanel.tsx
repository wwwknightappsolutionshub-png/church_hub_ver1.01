'use client';

import Link from 'next/link';
import { ExternalLink, Loader2, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { formatMemberName, ROLE_LABELS, STATUS_LABELS, STATUS_VARIANT } from '@/lib/membership';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MemberRow {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  roles: string[];
  ministryInterests: string[];
}

interface FollowUpMembersPanelProps {
  canManageMembers: boolean;
  onSelectMember?: (id: string) => void;
}

export function FollowUpMembersPanel({
  canManageMembers,
  onSelectMember,
}: FollowUpMembersPanelProps) {
  const [search, setSearch] = useState('');
  const { data: members, isLoading } = useApiQuery<MemberRow[]>(
    ['follow-up-members'],
    '/membership/members',
  );

  const discipleshipMembers = useMemo(() => {
    const list = members ?? [];
    const q = search.trim().toLowerCase();
    const filtered = list.filter(
      (m) =>
        m.ministryInterests.includes('Follow-up & Discipleship') ||
        m.status === 'VISITOR' ||
        m.status === 'NEW_MEMBER',
    );
    if (!q) return filtered;
    return filtered.filter(
      (m) =>
        formatMemberName(m).toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.phone?.includes(q),
    );
  }, [members, search]);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">Church members</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Visitors and discipleship-track members linked to your pipeline.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageMembers && (
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/membership?add=1">
                <Users className="mr-1.5 h-4 w-4" />
                Add member
              </Link>
            </Button>
          )}
          <Button size="sm" variant="ghost" asChild>
            <Link href="/dashboard/membership">
              Full membership
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="border-b border-border px-5 py-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && discipleshipMembers.length === 0 && (
        <p className="p-8 text-center text-sm text-muted-foreground">
          No visitors or discipleship members yet.
          {canManageMembers ? ' Add a member or capture from Outreach.' : ''}
        </p>
      )}

      {!isLoading && discipleshipMembers.length > 0 && (
        <ul className="divide-y divide-border">
          {discipleshipMembers.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/30"
                onClick={() => onSelectMember?.(m.id)}
              >
                <div>
                  <p className="font-medium text-foreground">{formatMemberName(m)}</p>
                  <p className="text-xs text-muted-foreground">
                    {[m.phone, m.email].filter(Boolean).join(' · ') || 'No contact on file'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.roles.slice(0, 3).map((r) => (
                      <span
                        key={r}
                        className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium"
                      >
                        {ROLE_LABELS[r] ?? r}
                      </span>
                    ))}
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[m.status] ?? 'outline'}>
                  {STATUS_LABELS[m.status] ?? m.status}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
