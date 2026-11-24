'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import {
  AlertTriangle,
  BarChart3,
  Loader2,
  Mail,
  Network,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  CreateCellBranchSchema,
  UpdateCellBranchSchema,
} from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import {
  EnterpriseHero,
  EnterpriseShell,
} from '@/components/layout/EnterpriseModuleShell';
import { cn } from '@/lib/utils';
import { BranchLeaderSelect } from '@/components/ministry-cells/BranchLeaderSelect';
import {
  CellBranchDetailPanel,
} from '@/components/ministry-cells/CellBranchDetailPanel';
import {
  BranchesSetupEmpty,
  CellBranchesList,
  CollapsibleCellCardsSection,
} from '@/components/ministry-cells/CellBranchesList';
import { MINISTRY_CELLS_DESKTOP_MQ } from '@/components/ministry-cells/layout';
import { MinistryCellsAnalyticsPanel } from '@/components/ministry-cells/MinistryCellsAnalyticsPanel';
import { MinistryCellsKpiStrip } from '@/components/ministry-cells/MinistryCellsKpiStrip';
import { CellDeputyAssignPanel } from '@/components/ministry-cells/CellDeputyAssignPanel';
import { ProvincesSetupPanel } from '@/components/ministry-cells/ProvincesSetupPanel';
import { ProvinceAttendancePanel } from '@/components/ministry-cells/ProvinceAttendancePanel';
import type {
  BranchDetail,
  BranchRow,
  FormDef,
  MinistryCellsContext,
  MinistryCellsTab,
  TeachingResource,
} from '@/components/ministry-cells/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function apiError(err: AxiosError | null) {
  const status = err?.response?.status;
  if (status === 403) return 'You do not have access to Ministry/Cells.';
  if (status === 404) return 'Ministry/Cells API not found — restart the API after pulling changes.';
  return 'Could not reach the Ministry/Cells API.';
}

export function MinistryCellsApp() {
  const queryClient = useQueryClient();
  const { matches: isDesktopLayout, ready: layoutReady } = useMediaQuery(MINISTRY_CELLS_DESKTOP_MQ);
  const [tab, setTab] = useState<MinistryCellsTab>('branches');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const [selectedProvinceName, setSelectedProvinceName] = useState<string | null>(null);
  const [branchSearch, setBranchSearch] = useState('');
  const [directoryScope, setDirectoryScope] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const searchParams = useSearchParams();
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [showCreateProvince, setShowCreateProvince] = useState(false);
  const [createLeaderId, setCreateLeaderId] = useState('');
  const [editBranchOpen, setEditBranchOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPostcode, setEditPostcode] = useState('');
  const [editLeaderId, setEditLeaderId] = useState('');
  const [branchSaving, setBranchSaving] = useState(false);
  const [reportFormId, setReportFormId] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [digestBusy, setDigestBusy] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ministry-cells'] });
  };

  const sendCellDigest = async () => {
    setDigestBusy(true);
    try {
      const res = await api.post<{ emailed: number }>('/ministry-cells/digests/weekly', {});
      const n = res.data?.emailed ?? 0;
      toast.success(
        n > 0
          ? `Cell digest emailed to ${n} recipient(s)`
          : 'Digest built but no Admin/Pastor email found',
      );
    } catch (e) {
      toast.error(apiErrorMessage(e as AxiosError, 'Could not send cell digest'));
    } finally {
      setDigestBusy(false);
    }
  };

  const { data: ctx, error: ctxError, isLoading: ctxLoading } = useApiQuery<MinistryCellsContext>(
    ['ministry-cells', 'context'],
    '/ministry-cells/context',
  );

  const { data: branches = [], isLoading: branchesLoading, error: branchesError } = useApiQuery<
    BranchRow[]
  >(['ministry-cells', 'branches'], '/ministry-cells/branches', { enabled: !!ctx && ctx.role !== 'none' });

  const branchId = selectedBranchId ?? '';

  const { data: branchDetail } = useApiQuery<BranchDetail>(
    ['ministry-cells', 'branch', branchId],
    `/ministry-cells/branches/${branchId}`,
    { enabled: !!selectedBranchId },
  );

  const { data: forms = [] } = useApiQuery<FormDef[]>(
    ['ministry-cells', 'forms'],
    '/ministry-cells/forms',
    { enabled: !!ctx && ctx.role !== 'none' },
  );

  const { data: teaching = [] } = useApiQuery<TeachingResource[]>(
    ['ministry-cells', 'teaching'],
    '/ministry-cells/teaching',
    { enabled: !!ctx && ctx.role !== 'none' },
  );

  const { data: contacts } = useApiQuery<{
    leaderUserId: string | null;
    leadershipContacts: { id: string; firstName: string; lastName: string; email: string }[];
  }>(
    ['ministry-cells', 'contacts', branchId],
    `/ministry-cells/branches/${branchId}/contacts`,
    { enabled: !!selectedBranchId },
  );

  const { data: messages = [] } = useApiQuery<
    {
      id: string;
      body: string;
      createdAt: string;
      fromUser: { firstName: string; lastName: string };
      toUser: { firstName: string; lastName: string };
    }[]
  >(
    ['ministry-cells', 'messages', branchId],
    `/ministry-cells/branches/${branchId}/messages`,
    { enabled: !!selectedBranchId },
  );

  const [analyticsFrom, setAnalyticsFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  });
  const [analyticsTo, setAnalyticsTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterBranchId, setFilterBranchId] = useState('');
  const [filterLocation, setFilterLocation] = useState('');

  const analyticsQuery = useMemo(() => {
    const q = new URLSearchParams();
    if (filterBranchId) q.set('branchId', filterBranchId);
    if (filterLocation) q.set('location', filterLocation);
    q.set('from', analyticsFrom);
    q.set('to', analyticsTo);
    return `/ministry-cells/analytics?${q.toString()}`;
  }, [analyticsFrom, analyticsTo, filterBranchId, filterLocation]);

  const { data: analytics, isLoading: analyticsLoading } = useApiQuery<{
    totals: Record<string, number>;
    branchMetrics: {
      branchId: string;
      name: string;
      location: string | null;
      memberCount: number;
      leader: string | null;
      avgAttendance: number;
      reportCompliance: number;
      incidentCount: number;
      openIncidents: number;
      prayerCount: number;
      messageCount: number;
    }[];
    attendanceTrend?: {
      branchId: string;
      weekStart: string;
      presentCount: number;
    }[];
  }>(['ministry-cells', 'analytics', analyticsQuery], analyticsQuery, {
    enabled: tab === 'analytics' && !!ctx?.canViewAnalytics,
  });

  const loading = ctxLoading || branchesLoading;
  const error = (ctxError || branchesError) as AxiosError | null;

  useEffect(() => {
    if (ctx?.role === 'cellLeader' && ctx.leaderBranchId && !selectedBranchId) {
      setSelectedBranchId(ctx.leaderBranchId);
    }
  }, [ctx, selectedBranchId]);

  useEffect(() => {
    const branchFromQuery = searchParams.get('branch')?.trim() ?? '';
    // Reject non-UUID values to avoid probing arbitrary IDs via query string.
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(branchFromQuery)) {
      setSelectedBranchId(branchFromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    if (ctx?.role === 'provincialLeader' && ctx.leaderProvinceId && tab === 'branches') {
      // keep branches tab; province attendance is separate tab
    }
  }, [ctx, tab]);

  useEffect(() => {
    if (!branchDetail || !editBranchOpen) return;
    setEditName(branchDetail.name);
    setEditLocation(branchDetail.location ?? '');
    setEditPostcode(branchDetail.postcode ?? '');
    setEditLeaderId(branchDetail.leader?.id ?? '');
  }, [branchDetail, editBranchOpen]);

  const createBranch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = CreateCellBranchSchema.safeParse({
      name: fd.get('name'),
      location: fd.get('location') || undefined,
      postcode: fd.get('postcode'),
      leaderUserId: createLeaderId || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Check the cell details');
      return;
    }
    try {
      await api.post('/ministry-cells/branches', parsed.data);
      toast.success('Cell branch created');
      invalidate();
      setShowCreateBranch(false);
      setCreateLeaderId('');
      (e.target as HTMLFormElement).reset();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed to create branch');
    }
  };

  const saveBranchEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    const parsed = UpdateCellBranchSchema.safeParse({
      name: editName.trim(),
      location: editLocation.trim() || null,
      postcode: editPostcode.trim(),
      leaderUserId: editLeaderId || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Check the cell details');
      return;
    }
    setBranchSaving(true);
    try {
      await api.patch(`/ministry-cells/branches/${selectedBranchId}`, parsed.data);
      toast.success('Branch updated');
      setEditBranchOpen(false);
      invalidate();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed to update branch');
    } finally {
      setBranchSaving(false);
    }
  };

  const submitReport = async () => {
    if (!selectedBranchId || !reportFormId) return;
    try {
      await api.post(`/ministry-cells/branches/${selectedBranchId}/reports`, {
        formId: reportFormId,
        payload: { highlights: 'Submitted from dashboard' },
      });
      toast.success('Report submitted');
      invalidate();
    } catch {
      toast.error('Failed to submit report');
    }
  };

  const sendMessage = async () => {
    if (!selectedBranchId || !messageBody.trim() || !contacts) return;
    const toUserId =
      ctx?.role === 'cellLeader' ? contacts.leadershipContacts[0]?.id : contacts.leaderUserId;
    if (!toUserId) {
      toast.error('No message recipient available');
      return;
    }
    try {
      await api.post(`/ministry-cells/branches/${selectedBranchId}/messages`, {
        toUserId,
        body: messageBody.trim(),
      });
      setMessageBody('');
      toast.success('Message sent');
      invalidate();
    } catch {
      toast.error('Failed to send message');
    }
  };

  const detailProps =
    ctx && branchDetail && selectedBranchId
      ? {
          ctx,
          branchDetail,
          selectedBranchId,
          forms,
          teaching,
          messages,
          editBranchOpen,
          editName,
          editLocation,
          editPostcode,
          editLeaderId,
          branchSaving,
          reportFormId,
          messageBody,
          incidentCount: branches.find((b) => b.id === selectedBranchId)?.incidentCount ?? 0,
          onEditToggle: () => setEditBranchOpen((v) => !v),
          onEditName: setEditName,
          onEditLocation: setEditLocation,
          onEditPostcode: setEditPostcode,
          onEditLeaderId: setEditLeaderId,
          onSaveBranch: saveBranchEdit,
          onReportFormId: setReportFormId,
          onSubmitReport: submitReport,
          onMessageBody: setMessageBody,
          onSendMessage: sendMessage,
          onChanged: invalidate,
        }
      : null;

  const searchFilteredBranches = useMemo(() => {
    const q = branchSearch.trim().toLowerCase().replace(/\s+/g, '');
    if (!q) return branches;
    return branches.filter((b) => {
      const name = b.name.toLowerCase();
      const location = (b.location ?? '').toLowerCase();
      const leader = (b.leader?.name ?? '').toLowerCase();
      const postcode = (b.postcode ?? '').toLowerCase().replace(/\s+/g, '');
      const province = (b.province?.name ?? '').toLowerCase();
      return (
        name.includes(q) ||
        location.includes(q) ||
        leader.includes(q) ||
        postcode.includes(q) ||
        province.includes(q) ||
        name.includes(branchSearch.trim().toLowerCase()) ||
        location.includes(branchSearch.trim().toLowerCase())
      );
    });
  }, [branches, branchSearch]);

  const mappedCells = useMemo(() => {
    const withProvince = searchFilteredBranches.filter((b) => b.provinceId);
    if (!selectedProvinceId) return withProvince;
    return withProvince.filter((b) => b.provinceId === selectedProvinceId);
  }, [searchFilteredBranches, selectedProvinceId]);

  const unmappedCells = useMemo(
    () => searchFilteredBranches.filter((b) => !b.provinceId),
    [searchFilteredBranches],
  );

  const directoryCells = useMemo(() => {
    if (selectedProvinceId) return mappedCells;
    if (directoryScope === 'mapped') return mappedCells;
    if (directoryScope === 'unmapped') return unmappedCells;
    return searchFilteredBranches;
  }, [
    selectedProvinceId,
    directoryScope,
    mappedCells,
    unmappedCells,
    searchFilteredBranches,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !ctx || ctx.role === 'none') {
    return (
      <Card className="border-destructive/40 shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 px-4 py-12 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <p className="text-sm text-muted-foreground">
            {ctx?.role === 'none' && !error
              ? 'Ministry/Cells is limited to church Admin, Pastor, Provincial Leader, and assigned cell roles.'
              : apiError(error)}
          </p>
          <Button variant="outline" className="h-11" onClick={() => invalidate()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isCellWorkspace = ctx.role === 'cellLeader';
  const tabs = isCellWorkspace
    ? []
    : [
        { id: 'branches' as const, label: 'All Cells', icon: Network },
        ...(ctx.canViewAnalytics
          ? [{ id: 'analytics' as const, label: 'Performance Analytics', icon: BarChart3 }]
          : []),
        ...(ctx.role === 'provincialLeader' && ctx.leaderProvinceId
          ? [{ id: 'province' as const, label: 'Province attendance', icon: BarChart3 }]
          : []),
      ];

  const showBranchDetail = Boolean(selectedBranchId && branchDetail && detailProps);
  const useDesktopLayout = layoutReady && isDesktopLayout;
  const showMobileOverlay =
    showBranchDetail && layoutReady && !isDesktopLayout && !isCellWorkspace;
  const showWorkspace =
    Boolean(isCellWorkspace && showBranchDetail) ||
    (showBranchDetail && (useDesktopLayout || showMobileOverlay));
  const showBranchGrid =
    !isCellWorkspace && (!showWorkspace || (useDesktopLayout && !showBranchDetail));
  const branchOptions = branches.map((b) => ({ id: b.id, name: b.name }));

  const workspaceProps = detailProps
    ? {
        ...detailProps,
        branchOptions,
        onSwitchBranch: setSelectedBranchId,
        ...(isCellWorkspace ? { onClose: undefined as undefined } : {}),
      }
    : null;

  return (
    <EnterpriseShell>
      <EnterpriseHero
        eyebrow="Ministry"
        title="Ministry/Cells"
        description={MODULE_DESCRIPTIONS.ministryCells}
        badge={
          isCellWorkspace ? undefined : (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <nav
              className="flex flex-wrap items-center justify-end gap-1.5"
              aria-label="Ministry/Cells views"
            >
              {tabs.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium transition',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                      active
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'bg-white/10 text-white/85 hover:bg-white/18 hover:text-white',
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </nav>
            {ctx.canManage ? (
              <Button
                size="sm"
                variant="secondary"
                className="h-9 border-0 bg-amber-400/90 text-slate-900 hover:bg-amber-300"
                disabled={digestBusy}
                onClick={() => void sendCellDigest()}
              >
                {digestBusy ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-1.5 h-4 w-4 shrink-0" />
                )}
                Push Reports
              </Button>
            ) : null}
          </div>
          )
        }
      />

      <div className="w-full space-y-3 px-4 py-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:space-y-4 sm:px-6 sm:py-5 md:px-8">
      {tab === 'branches' && (
        <div className="space-y-5">
          {!isCellWorkspace && !showWorkspace && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <MinistryCellsKpiStrip branches={branches} className="min-w-0" />
                {ctx.canManage && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="outline" className="h-9">
                      <Link href="/dashboard/ministry-cells/ministers">
                        <Users className="mr-1.5 h-4 w-4 shrink-0" />
                        Cell Ministers
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9"
                      onClick={() => setShowCreateProvince(true)}
                    >
                      <Plus className="mr-1.5 h-4 w-4 shrink-0" />
                      Province
                    </Button>
                    <Button size="sm" className="h-9" onClick={() => setShowCreateBranch(true)}>
                      <Plus className="mr-1.5 h-4 w-4 shrink-0" />
                      Add New Cell
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {showCreateBranch && ctx.canManage ? (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
              onClick={() => {
                setShowCreateBranch(false);
                setCreateLeaderId('');
              }}
            >
              <div
                className="flex max-h-[min(94vh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-background shadow-xl sm:rounded-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-new-cell-title"
                data-testid="add-new-cell-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                  <div>
                    <h2 id="add-new-cell-title" className="text-base font-semibold">
                      Add New Cell
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Create a cell branch and optionally assign a leader
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label="Close"
                    onClick={() => {
                      setShowCreateBranch(false);
                      setCreateLeaderId('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <form
                  className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
                  onSubmit={createBranch}
                >
                  <div className="space-y-1">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" className="h-10" required autoFocus />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      name="postcode"
                      className="h-10"
                      placeholder="N1 1AA"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      className="h-10"
                      placeholder="Area or address"
                    />
                  </div>
                  <BranchLeaderSelect
                    id="create-leader"
                    value={createLeaderId}
                    onChange={setCreateLeaderId}
                    enabled={ctx.canManage}
                  />
                  <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                    <Button type="submit" className="h-10 flex-1 sm:flex-none">
                      Create cell
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-10"
                      onClick={() => {
                        setShowCreateBranch(false);
                        setCreateLeaderId('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          {showBranchGrid && !showWorkspace && !ctx.canManage && (
            <CellBranchesList
              branches={branches}
              selectedBranchId={selectedBranchId}
              onSelectBranch={setSelectedBranchId}
              canManage={ctx.canManage}
              search={branchSearch}
              onSearchChange={setBranchSearch}
            />
          )}

          {isCellWorkspace && workspaceProps ? (
            <CellBranchDetailPanel {...workspaceProps} />
          ) : null}

          {!isCellWorkspace && showWorkspace && workspaceProps && useDesktopLayout && (
            <CellBranchDetailPanel
              {...workspaceProps}
              onClose={() => setSelectedBranchId(null)}
            />
          )}

          {!isCellWorkspace && showMobileOverlay && workspaceProps && (
            <div className="fixed inset-0 z-40 flex flex-col bg-background">
              <div className="flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))]">
                <CellBranchDetailPanel
                  {...workspaceProps}
                  onClose={() => setSelectedBranchId(null)}
                />
              </div>
            </div>
          )}

          {isCellWorkspace && !workspaceProps ? (
            <p className="py-8 text-sm text-muted-foreground">
              Loading your cell workspace…
            </p>
          ) : null}

          {ctx.canManage && !showWorkspace && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 border-y border-border/60 py-3 lg:flex-row lg:items-center lg:justify-between">
                <ProvincesSetupPanel
                  variant="bar"
                  hideCreateChip
                  onChanged={invalidate}
                  selectedProvinceId={selectedProvinceId}
                  onSelectProvince={(province) => {
                    setSelectedProvinceId(province?.id ?? null);
                    setSelectedProvinceName(province?.name ?? null);
                  }}
                  createOpen={showCreateProvince}
                  onCreateOpenChange={setShowCreateProvince}
                />
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
                  {!selectedProvinceId ? (
                    <div
                      className="inline-flex h-9 shrink-0 items-center gap-0.5"
                      role="group"
                      aria-label="Directory scope"
                    >
                      {(
                        [
                          ['all', 'All'],
                          ['mapped', 'Mapped'],
                          ['unmapped', 'Unmapped'],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          className={
                            directoryScope === value
                              ? 'rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white'
                              : 'rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                          }
                          onClick={() => setDirectoryScope(value)}
                          aria-pressed={directoryScope === value}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Showing {selectedProvinceName ?? 'province'}
                    </p>
                  )}
                  <div className="relative w-full min-w-0 sm:w-56">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={branchSearch}
                      onChange={(e) => setBranchSearch(e.target.value)}
                      placeholder="Search name or postcode…"
                      className="h-9 border-border/70 bg-background pl-9"
                      aria-label="Search cell branches by name or postcode"
                    />
                  </div>
                </div>
              </div>

              {showBranchGrid ? (
                <div className="min-w-0">
                  <CollapsibleCellCardsSection
                    key={selectedProvinceId ?? directoryScope}
                    title={
                      selectedProvinceId
                        ? selectedProvinceName ?? 'Province cells'
                        : directoryScope === 'mapped'
                          ? 'Mapped cells'
                          : directoryScope === 'unmapped'
                            ? 'Unmapped cells'
                            : 'Cells'
                    }
                    branches={directoryCells}
                    selectedBranchId={selectedBranchId}
                    onSelectBranch={setSelectedBranchId}
                    emptyMessage={
                      selectedProvinceId
                        ? 'No cells mapped to this province yet.'
                        : directoryScope === 'unmapped'
                          ? 'All cells are mapped to a province.'
                          : branchSearch.trim()
                            ? 'No cells match that search.'
                            : 'No cells yet. Add a new cell to get started.'
                    }
                    emptyAction={
                      <BranchesSetupEmpty
                        filtered={
                          Boolean(selectedProvinceId) ||
                          directoryScope !== 'all' ||
                          Boolean(branchSearch.trim())
                        }
                        onAddCell={() => setShowCreateBranch(true)}
                        onCreateProvince={() => setShowCreateProvince(true)}
                      />
                    }
                    defaultCollapsed={false}
                    showMapControls
                    onMapChanged={invalidate}
                    compact
                  />
                </div>
              ) : (
                <p className="py-8 text-sm text-muted-foreground">
                  Open a cell from the directory to manage it.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'province' && ctx.role === 'provincialLeader' && ctx.leaderProvinceId && (
        <div className="space-y-4">
          {!ctx.isDeputy ? (
            <CellDeputyAssignPanel
              scope="province"
              scopeId={ctx.leaderProvinceId}
              canAssign={!!ctx.canAssignDeputies}
            />
          ) : null}
          <ProvinceAttendancePanel provinceId={ctx.leaderProvinceId} />
        </div>
      )}

      {tab === 'analytics' && ctx.canViewAnalytics && (
        <MinistryCellsAnalyticsPanel
          branches={branches}
          analyticsFrom={analyticsFrom}
          analyticsTo={analyticsTo}
          filterBranchId={filterBranchId}
          filterLocation={filterLocation}
          onAnalyticsFrom={setAnalyticsFrom}
          onAnalyticsTo={setAnalyticsTo}
          onFilterBranchId={setFilterBranchId}
          onFilterLocation={setFilterLocation}
          analytics={analytics}
          loading={analyticsLoading}
        />
      )}
      </div>
    </EnterpriseShell>
  );
}

export function MinistryCellsPageShell() {
  const { enabledModules, isLoading } = useModuleAccess();
  const moduleOn = enabledModules?.ministryCells !== false;

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!moduleOn) {
    return (
      <Card className="mx-4 shadow-sm">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Ministry/Cells is not enabled for your church. Contact your platform administrator.
        </CardContent>
      </Card>
    );
  }

  return <MinistryCellsApp />;
}
