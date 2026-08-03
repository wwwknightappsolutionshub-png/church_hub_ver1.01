'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Grid3X3, Home, LayoutList, Loader2, Search, UserPlus, Users } from 'lucide-react';
import { LazyFamilyEditorDialog } from '@/lib/membership-lazy';
import { invalidateMembershipQueries } from '@/lib/membership/invalidate-membership';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FamilyDetailDialog } from '@/components/membership/FamilyDetailDialog';

interface FamilyRow {
  id: string;
  name: string;
  headMemberId?: string | null;
  members: Array<{ id: string; firstName: string; lastName: string; status: string }>;
}

interface ServiceUnit {
  id: string;
  name: string;
}

interface FamiliesPanelProps {
  canManage: boolean;
  canAdd?: boolean;
  canViewDirectory?: boolean;
  members: Array<{ id: string; firstName: string; lastName: string }>;
}

type ViewMode = 'grid' | 'list';

export function FamiliesPanel({
  canManage,
  canAdd = canManage,
  canViewDirectory = true,
  members: _members,
}: FamiliesPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [serviceUnitId, setServiceUnitId] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editFamilyId, setEditFamilyId] = useState<string | null>(null);
  const addOnly = !canViewDirectory && canAdd;

  const familiesUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (serviceUnitId) params.set('serviceUnitId', serviceUnitId);
    const q = params.toString();
    return `/membership/families${q ? `?${q}` : ''}`;
  }, [search, serviceUnitId]);

  const { data: families, isLoading } = useApiQuery<FamilyRow[]>(
    ['membership-families', search, serviceUnitId],
    familiesUrl,
    { enabled: canViewDirectory },
  );
  const { data: serviceUnits } = useApiQuery<ServiceUnit[]>(['service-units-list'], '/service-units', {
    enabled: canViewDirectory,
  });

  const invalidate = () => invalidateMembershipQueries(queryClient);

  const openCreate = () => {
    setEditFamilyId(null);
    setShowEditor(true);
    setSelectedFamilyId(null);
  };

  const openEdit = (id: string) => {
    setEditFamilyId(id);
    setShowEditor(true);
    setSelectedFamilyId(null);
  };

  useEffect(() => {
    if (addOnly) {
      openCreate();
      if (searchParams.get('add') === '1') {
        router.replace('/dashboard/membership/families');
      }
      return;
    }
    if (searchParams.get('add') === '1' && canAdd) {
      openCreate();
      router.replace('/dashboard/membership/families');
    }
  }, [searchParams, canAdd, router, addOnly]);

  if (addOnly) {
    return (
      <div className="space-y-4" data-testid="families-panel-add-only">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Add Family</h2>
          <p className="text-sm text-muted-foreground">
            Register a new household. Family directories are visible to Church Admin and Pastor only.
          </p>
        </div>
        {showEditor && canAdd ? (
          <LazyFamilyEditorDialog
            familyId={null}
            onClose={() => {
              setShowEditor(false);
              router.push('/dashboard/membership');
            }}
            onSaved={() => {
              invalidate();
              setShowEditor(false);
              router.push('/dashboard/membership');
            }}
          />
        ) : (
          <Button size="sm" className="shadow-brand" onClick={openCreate} data-testid="families-add-button">
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add Family
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="families-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Families List</h2>
          <p className="text-sm text-muted-foreground">
            Search households, open details, and manage family records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAdd ? (
            <Button size="sm" className="shadow-brand" onClick={openCreate} data-testid="families-add-button">
              <UserPlus className="mr-1.5 h-4 w-4" />
              Add Family
            </Button>
          ) : null}
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            onClick={() => setViewMode('grid')}
            data-testid="families-view-grid"
          >
            <Grid3X3 className="mr-1.5 h-4 w-4" />
            Grid
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            data-testid="families-view-list"
          >
            <LayoutList className="mr-1.5 h-4 w-4" />
            List
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by family name…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="families-search"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:min-w-[220px]"
          value={serviceUnitId}
          onChange={(e) => setServiceUnitId(e.target.value)}
          data-testid="families-unit-filter"
        >
          <option value="">All church units</option>
          {(serviceUnits ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="families-grid">
          {(families ?? []).map((f) => (
            <button
              key={f.id}
              type="button"
              className="text-left"
              onClick={() => setSelectedFamilyId(f.id)}
              data-testid={`family-card-${f.id}`}
            >
              <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Home className="h-4 w-4 text-primary" />
                    {f.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {f.members.length} member{f.members.length === 1 ? '' : 's'}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {f.members.slice(0, 4).map((m) => (
                      <li key={m.id} className="truncate">
                        {m.firstName} {m.lastName}
                      </li>
                    ))}
                    {f.members.length > 4 ? (
                      <li className="text-xs text-muted-foreground">+{f.members.length - 4} more</li>
                    ) : null}
                  </ul>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/50" data-testid="families-list">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Family</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Members</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  Household
                </th>
              </tr>
            </thead>
            <tbody>
              {(families ?? []).map((f) => (
                <tr
                  key={f.id}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/20"
                  onClick={() => setSelectedFamilyId(f.id)}
                >
                  <td className="px-4 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3">{f.members.length}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {f.members.map((m) => `${m.firstName} ${m.lastName}`).join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(families ?? []).length === 0 && !isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No families match your filters.{' '}
          {canAdd ? (
            <button type="button" className="text-primary underline" onClick={openCreate}>
              Add a family
            </button>
          ) : null}
        </p>
      ) : null}

      {selectedFamilyId ? (
        <FamilyDetailDialog
          familyId={selectedFamilyId}
          canManage={canManage}
          onClose={() => setSelectedFamilyId(null)}
          onEdit={() => openEdit(selectedFamilyId)}
          onUpdated={() => {
            invalidate();
            setSelectedFamilyId(null);
          }}
        />
      ) : null}

      {showEditor && canAdd ? (
        <LazyFamilyEditorDialog
          familyId={editFamilyId}
          onClose={() => {
            setShowEditor(false);
            setEditFamilyId(null);
          }}
          onSaved={invalidate}
        />
      ) : null}
    </div>
  );
}
