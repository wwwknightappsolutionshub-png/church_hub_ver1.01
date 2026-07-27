'use client';

import { useEffect, useMemo, useState } from 'react';
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
  EnterpriseContent,
  EnterpriseHero,
  EnterpriseShell,
  EnterpriseTabNav,
} from '@/components/layout/EnterpriseModuleShell';
import { BranchLeaderSelect } from '@/components/ministry-cells/BranchLeaderSelect';
import {
  CellBranchDetailPanel,
} from '@/components/ministry-cells/CellBranchDetailPanel';
import { CellBranchesList } from '@/components/ministry-cells/CellBranchesList';
import { MINISTRY_CELLS_DESKTOP_MQ } from '@/components/ministry-cells/layout';
import { MinistryCellsAnalyticsPanel } from '@/components/ministry-cells/MinistryCellsAnalyticsPanel';
import { MinistryCellsKpiStrip } from '@/components/ministry-cells/MinistryCellsKpiStrip';
import { MinistryCellsSetupPanel } from '@/components/ministry-cells/MinistryCellsSetupPanel';
import { ProvincesSetupPanel } from '@/components/ministry-cells/ProvincesSetupPanel';
import { ProvinceAttendancePanel } from '@/components/ministry-cells/ProvinceAttendancePanel';
import { MapCellProvinceControl } from '@/components/ministry-cells/MapCellProvinceControl';
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
  const [branchSearch, setBranchSearch] = useState('');
  const [showCreateBranch, setShowCreateBranch] = useState(false);
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

  const seedForms = async () => {
    try {
      const res = await api.post('/ministry-cells/forms/seed-defaults');
      toast.success(res.data.seeded ? 'Default forms created' : 'Forms already exist');
      invalidate();
    } catch {
      toast.error('Failed to seed forms');
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
          <p className="text-sm text-muted-foreground">{apiError(error)}</p>
          <Button variant="outline" className="h-11" onClick={() => invalidate()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const tabs = [
    { id: 'branches' as const, label: 'Branches', icon: Network },
    ...(ctx.role === 'provincialLeader' && ctx.leaderProvinceId
      ? [{ id: 'province' as const, label: 'Province attendance', icon: BarChart3 }]
      : []),
    ...(ctx.canViewAnalytics && ctx.role !== 'provincialLeader'
      ? [{ id: 'analytics' as const, label: 'Analytics', icon: BarChart3 }]
      : []),
  ];

  const showBranchDetail = Boolean(selectedBranchId && branchDetail && detailProps);
  const useDesktopLayout = layoutReady && isDesktopLayout;
  const showMobileOverlay = showBranchDetail && layoutReady && !isDesktopLayout;
  const showWorkspace = showBranchDetail && (useDesktopLayout || showMobileOverlay);
  const showBranchGrid = !showWorkspace || (useDesktopLayout && !showBranchDetail);
  const branchOptions = branches.map((b) => ({ id: b.id, name: b.name }));

  const workspaceProps = detailProps
    ? {
        ...detailProps,
        branchOptions,
        onSwitchBranch: setSelectedBranchId,
      }
    : null;

  return (
    <div className="space-y-3 sm:space-y-4">
      <EnterpriseTabNav
        ariaLabel="Ministry/Cells views"
        tabs={tabs.map((t) => ({ id: t.id, label: t.label }))}
        active={tab}
        onChange={(id) => setTab(id as MinistryCellsTab)}
      />

      {tab === 'branches' && (
        <div className="space-y-4">
          {!showWorkspace && (
            <div className="flex flex-row items-stretch gap-2 sm:gap-3">
              <MinistryCellsKpiStrip branches={branches} className="min-w-0 flex-1" />
              {ctx.canManage && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-auto min-h-[3.25rem] shrink-0 self-stretch rounded-xl px-3 text-xs sm:px-4 sm:text-sm"
                    disabled={digestBusy}
                    onClick={() => void sendCellDigest()}
                  >
                    {digestBusy ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-1.5 h-4 w-4 shrink-0" />
                    )}
                    <span className="whitespace-nowrap">Send digest</span>
                  </Button>
                  <Button
                    size="sm"
                    className="h-auto min-h-[3.25rem] shrink-0 self-stretch rounded-xl px-3 text-xs sm:px-4 sm:text-sm"
                    onClick={() => setShowCreateBranch((v) => !v)}
                  >
                    <Plus className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2" />
                    <span className="whitespace-nowrap">Add New Cell</span>
                  </Button>
                </>
              )}
            </div>
          )}

          {showCreateBranch && ctx.canManage && !showWorkspace && (
            <Card className="overflow-hidden rounded-2xl border-primary/20 shadow-sm">
              <div className="border-b border-border/60 bg-muted/30 px-4 py-2">
                <p className="text-sm font-semibold">Add New Cell</p>
              </div>
              <CardContent className="py-4">
                <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={createBranch}>
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" className="mt-1 h-10" required />
                  </div>
                  <div>
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      name="postcode"
                      className="mt-1 h-10"
                      placeholder="N1 1AA"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" name="location" className="mt-1 h-10" placeholder="Area or address" />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <BranchLeaderSelect
                      id="create-leader"
                      value={createLeaderId}
                      onChange={setCreateLeaderId}
                      enabled={ctx.canManage}
                    />
                  </div>
                  <div className="flex gap-2 sm:col-span-2 lg:col-span-1 lg:items-end">
                    <Button type="submit" className="h-10 flex-1">
                      Create cell
                    </Button>
                    <Button type="button" variant="ghost" className="h-10" onClick={() => setShowCreateBranch(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {showBranchGrid && !showWorkspace && (
            <CellBranchesList
              branches={branches}
              selectedBranchId={selectedBranchId}
              onSelectBranch={setSelectedBranchId}
              canManage={ctx.canManage}
              search={branchSearch}
              onSearchChange={setBranchSearch}
            />
          )}

          {showWorkspace && workspaceProps && useDesktopLayout && (
            <CellBranchDetailPanel {...workspaceProps} onClose={() => setSelectedBranchId(null)} />
          )}

          {showMobileOverlay && workspaceProps && (
            <div className="fixed inset-0 z-40 flex flex-col bg-background">
              <div className="flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))]">
                <CellBranchDetailPanel {...workspaceProps} onClose={() => setSelectedBranchId(null)} />
              </div>
            </div>
          )}

          {ctx.canManage && !showWorkspace && (
            <div className="space-y-6 border-t border-border/60 pt-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold">Provinces & provincial leaders</h3>
                <ProvincesSetupPanel onChanged={invalidate} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Map cells to provinces</h3>
                <div className="space-y-2">
                  {branches.map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.postcode ?? 'No postcode'}
                          {b.location ? ` · ${b.location}` : ''}
                        </p>
                      </div>
                      <MapCellProvinceControl branch={b} onChanged={invalidate} />
                    </div>
                  ))}
                  {branches.length === 0 && (
                    <p className="text-sm text-muted-foreground">Create cells first, then map them.</p>
                  )}
                </div>
              </div>
              <MinistryCellsSetupPanel
                forms={forms}
                teaching={teaching}
                branchOptions={branches.map((b) => ({ id: b.id, name: b.name }))}
                onSeedForms={seedForms}
                onChanged={invalidate}
              />
            </div>
          )}
        </div>
      )}

      {tab === 'province' && ctx.role === 'provincialLeader' && ctx.leaderProvinceId && (
        <ProvinceAttendancePanel provinceId={ctx.leaderProvinceId} />
      )}

      {tab === 'analytics' && ctx.canViewAnalytics && ctx.role !== 'provincialLeader' && (
        <MinistryCellsAnalyticsPanel
          branches={branches}
          analyticsFrom={analyticsFrom}
          analyticsTo={analyticsTo}
          filterBranchId={filterBranchId}
          filterLocation={filterLocation}
          canSendDigest={ctx.canManage}
          onAnalyticsFrom={setAnalyticsFrom}
          onAnalyticsTo={setAnalyticsTo}
          onFilterBranchId={setFilterBranchId}
          onFilterLocation={setFilterLocation}
          analytics={analytics}
          loading={analyticsLoading}
        />
      )}
    </div>
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

  return (
    <EnterpriseShell>
      <EnterpriseHero
        eyebrow="Ministry"
        title="Ministry/Cells"
        description={MODULE_DESCRIPTIONS.ministryCells}
      />
      <EnterpriseContent className="px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6">
        <MinistryCellsApp />
      </EnterpriseContent>
    </EnterpriseShell>
  );
}
