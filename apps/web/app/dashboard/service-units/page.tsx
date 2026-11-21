'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Search, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { ServiceUnitJoinSheet } from '@/components/service-units/ServiceUnitJoinSheet';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import {
  EnterpriseContent,
  EnterpriseHero,
  EnterpriseShell,
} from '@/components/layout/EnterpriseModuleShell';
import { OnlineIndicator } from '@/components/service-units/OnlineIndicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ServiceUnitListItem {
  id: string;
  name: string;
  description?: string | null;
  activities?: string | null;
  leaders: Array<{ member: { id: string; firstName: string; lastName: string } }>;
  presence: Array<{ memberId: string; isOnline: boolean }>;
  _count: { members: number; meetings: number };
}

interface UnitSuggestion {
  id: string;
  name: string;
}

const UNCATEGORIZED = 'Uncategorized';

export default function ServiceUnitsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, member, isChurchStaff, unitMembershipIds } = useModuleAccess();
  const units = useApiQuery<ServiceUnitListItem[]>(['service-units'], '/service-units');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [joinTarget, setJoinTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: '', description: '', activities: '' });
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<UnitSuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestRef = useRef<HTMLDivElement>(null);

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = units.data ?? [];
    if (!q) return list;
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.description ?? '').toLowerCase().includes(q),
    );
  }, [units.data, search]);

  useEffect(() => {
    if (!isChurchStaff) {
      setSuggestions([]);
      return;
    }
    const q = search.trim();
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const { data } = await api.get<UnitSuggestion[]>('/service-units/suggest', {
          params: { q, limit: 12 },
        });
        if (!cancelled) {
          setSuggestions(data ?? []);
          setSuggestOpen(true);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSuggestLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, isChurchStaff]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!suggestRef.current?.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const openUnit = async (unit: ServiceUnitListItem) => {
    if (isChurchStaff || unitMembershipIds.includes(unit.id)) {
      router.push(`/dashboard/service-units/${unit.id}`);
      return;
    }
    setCheckingId(unit.id);
    try {
      const { data } = await api.get<{
        canView: boolean;
        pendingJoinRequest?: { id: string } | null;
      }>(`/service-units/${unit.id}/access`);
      if (data.canView) {
        router.push(`/dashboard/service-units/${unit.id}`);
      } else if (data.pendingJoinRequest) {
        toast.message('Your join request is pending approval');
      } else {
        setJoinTarget({ id: unit.id, name: unit.name });
      }
    } catch {
      setJoinTarget({ id: unit.id, name: unit.name });
    } finally {
      setCheckingId(null);
    }
  };

  const createUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post('/service-units', form);
      toast.success('Service unit created');
      setForm({ name: '', description: '', activities: '' });
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['service-units'] });
    } catch {
      toast.error('Could not create service unit');
    } finally {
      setSaving(false);
    }
  };

  const deleteUnit = async (unit: ServiceUnitListItem) => {
    if (!isChurchStaff) return;
    if (unit.name.trim().toLowerCase() === UNCATEGORIZED.toLowerCase()) {
      toast.error('The Uncategorized unit cannot be deleted');
      return;
    }
    const hasData = unit._count.members > 0 || unit._count.meetings > 0;
    const message = hasData
      ? `Delete "${unit.name}"?\n\nMembers and related records will move to Uncategorized. This cannot be undone from the hub list.`
      : `Delete "${unit.name}"?`;
    if (!window.confirm(message)) return;

    setDeletingId(unit.id);
    try {
      await api.delete(`/service-units/${unit.id}`);
      toast.success(
        hasData
          ? `"${unit.name}" deleted — members moved to Uncategorized`
          : `"${unit.name}" deleted`,
      );
      queryClient.invalidateQueries({ queryKey: ['service-units'] });
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : 'Could not delete service unit');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <EnterpriseShell>
      <EnterpriseHero
        eyebrow="Ministries"
        title="Service Unit Hub"
        description={MODULE_DESCRIPTIONS.serviceUnits}
        badge={
          <Badge className="border-slate-600 bg-slate-800 text-slate-100">
            {(units.data ?? []).length} units
          </Badge>
        }
        actions={
          isChurchStaff ? (
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New unit
            </Button>
          ) : undefined
        }
      />
      <EnterpriseContent className="space-y-6">
        <div ref={suggestRef} className="relative max-w-xl">
          <label htmlFor="service-unit-search" className="sr-only">
            Search service units
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="service-unit-search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSuggestOpen(true);
              }}
              onFocus={() => setSuggestOpen(true)}
              placeholder="Search units by name…"
              className="pl-9"
              autoComplete="off"
            />
            {suggestLoading ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </div>
          {isChurchStaff && suggestOpen && suggestions.length > 0 ? (
            <ul
              className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-background py-1 shadow-md"
              role="listbox"
              aria-label="Unit name suggestions"
            >
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    role="option"
                    className="flex w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setSearch(s.name);
                      setSuggestOpen(false);
                    }}
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {showForm && isChurchStaff && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create service unit</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createUnit} className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Unit name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <Input
                  placeholder="Short description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <Input
                  className="md:col-span-2"
                  placeholder="Activities summary"
                  value={form.activities}
                  onChange={(e) => setForm({ ...form, activities: e.target.value })}
                />
                <div className="flex gap-2 md:col-span-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save unit'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {units.isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {units.isError && (
          <p className="text-sm text-destructive">
            Could not load service units — ensure the API is running and you are signed in.
          </p>
        )}

        {!units.isLoading && !units.isError && (units.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            No service units yet. Refresh the page or create a unit above — the church catalog loads
            automatically on first visit.
          </p>
        )}

        {!units.isLoading && search.trim() && filteredUnits.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No units match “{search.trim()}”.
          </p>
        )}

        {!units.isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredUnits.map((unit) => {
              const onlineCount = unit.presence.filter((p) => p.isOnline).length;
              const leader = unit.leaders[0]?.member;
              const isUncategorized =
                unit.name.trim().toLowerCase() === UNCATEGORIZED.toLowerCase();
              return (
                <Card
                  key={unit.id}
                  className="relative h-full transition-shadow hover:shadow-elevated"
                >
                  {isChurchStaff && !isUncategorized ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute right-2 top-2 z-10 h-8 w-8 text-muted-foreground hover:text-destructive"
                      title={`Delete ${unit.name}`}
                      disabled={deletingId === unit.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void deleteUnit(unit);
                      }}
                    >
                      {deletingId === unit.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  ) : null}
                  <button
                    type="button"
                    className={cn('w-full text-left', isChurchStaff && !isUncategorized && 'pr-8')}
                    disabled={checkingId === unit.id}
                    onClick={() => openUnit(unit)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">{unit.name}</CardTitle>
                        {onlineCount > 0 && (
                          <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                            <OnlineIndicator online size="sm" />
                            {onlineCount} online
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {unit.description ?? 'Church service group'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {unit._count.members} members · {unit._count.meetings} meetings
                      </div>
                      {leader && (
                        <p className="font-sans text-xs text-muted-foreground">
                          Leader: {leader.firstName} {leader.lastName}
                        </p>
                      )}
                    </CardContent>
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </EnterpriseContent>

      {joinTarget && (
        <ServiceUnitJoinSheet
          unitId={joinTarget.id}
          unitName={joinTarget.name}
          open
          defaultValues={{
            firstName: user?.firstName ?? member?.firstName,
            lastName: user?.lastName ?? member?.lastName,
            email: user?.email,
            memberId: member?.id,
          }}
          onClose={() => setJoinTarget(null)}
          onSubmitted={() => queryClient.invalidateQueries({ queryKey: ['service-units'] })}
        />
      )}
    </EnterpriseShell>
  );
}
