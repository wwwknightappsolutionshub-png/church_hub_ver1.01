'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  ClipboardList,
  Loader2,
  MessageSquare,
  Pin,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useServiceUnitPresence } from '@/lib/hooks/use-service-unit-presence';
import { formatDateTime, formatMemberName, getEmailFromToken } from '@/lib/service-unit-utils';
import { MemberWithPresence, OnlineIndicator } from '@/components/service-units/OnlineIndicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { ServiceUnitJoinSheet } from '@/components/service-units/ServiceUnitJoinSheet';
import { ServiceUnitAdminPanel } from '@/components/service-units/ServiceUnitAdminPanel';
import { ServiceUnitMembersPanel } from '@/components/service-units/ServiceUnitMembersPanel';
import { ServiceUnitWeeklyAttendancePanel } from '@/components/service-units/ServiceUnitWeeklyAttendancePanel';
import {
  DepartmentToolsRouter,
} from '@/components/departments/DepartmentToolsRouter';
import { resolveDeptModuleCode, showDepartmentToolsTab } from '@/lib/dept-module-catalog';
import { useSearchParams } from 'next/navigation';

type Tab =
  | 'overview'
  | 'meetings'
  | 'leaders'
  | 'weekly'
  | 'forum'
  | 'admin'
  | 'department';

interface MemberRef {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  avatarUrl?: string | null;
}

interface MeetingSummary {
  id: string;
  title: string;
  body: string;
  meetingDate?: string | null;
  author: MemberRef;
}

interface ServiceUnitDetail {
  id: string;
  name: string;
  departmentCode?: string | null;
  description?: string | null;
  activities?: string | null;
  access?: {
    canView: boolean;
    canManage: boolean;
    canManageLeaders: boolean;
    canLead?: boolean;
    canViewFeedbacks?: boolean;
    canSubmitReport?: boolean;
    isChurchStaff?: boolean;
  };
  members: Array<{ memberId: string; member: MemberRef }>;
  leaders: Array<{
    id: string;
    role: string;
    isModerator: boolean;
    isUnitAdmin?: boolean;
    member: MemberRef;
  }>;
  meetingSummaries?: MeetingSummary[];
  meetings: Array<{
    id: string;
    title: string;
    description?: string | null;
    location?: string | null;
    startsAt: string;
    endsAt?: string | null;
  }>;
  posts?: ServiceUnitPost[];
}

interface ServiceUnitPost {
  id: string;
  title?: string | null;
  body: string;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  author: MemberRef;
  replies: Array<{ id: string; body: string; createdAt: string; author: MemberRef }>;
}

const baseTabs: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'overview', label: 'Overview', icon: Users },
  { id: 'department', label: 'Department', icon: BarChart3 },
  { id: 'meetings', label: 'Meetings', icon: Calendar },
  { id: 'leaders', label: 'Members', icon: Users },
  { id: 'weekly', label: 'Attendance', icon: ClipboardList },
  { id: 'forum', label: 'Forum', icon: MessageSquare },
  { id: 'admin', label: 'Unit admin', icon: Shield },
];

export default function ServiceUnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const {
    user,
    member,
    unitAdminUnitIds,
    unitMembershipIds,
    isChurchStaff,
  } = useModuleAccess();
  const [accessDenied, setAccessDenied] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const unit = useApiQuery<ServiceUnitDetail>(['service-unit', id], `/service-units/${id}`, {
    retry: false,
  });

  useEffect(() => {
    if (unit.isError) setAccessDenied(true);
  }, [unit.isError]);
  const posts = useApiQuery<ServiceUnitPost[]>(['service-unit-posts', id], `/service-units/${id}/posts`, {
    enabled: !!id,
  });

  const currentMemberId = useMemo(() => {
    const email = getEmailFromToken()?.toLowerCase();
    if (!email || !unit.data) return unit.data?.members[0]?.memberId;
    const match = unit.data.members.find((m) => m.member.email?.toLowerCase() === email);
    return match?.memberId ?? unit.data.members[0]?.memberId;
  }, [unit.data]);

  const { isOnline } = useServiceUnitPresence(id, currentMemberId);
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<Tab>(
    initialTab === 'department' ? 'department' : 'overview',
  );

  const effectiveDeptCode = useMemo(
    () => resolveDeptModuleCode(unit.data?.departmentCode, unit.data?.name ?? ''),
    [unit.data?.departmentCode, unit.data?.name],
  );

  const canManage =
    isChurchStaff ||
    unit.data?.access?.canManage ||
    unitAdminUnitIds.includes(id);

  const canViewDepartmentTab =
    isChurchStaff ||
    unitMembershipIds.includes(id) ||
    (unit.data?.access?.canView ?? false) ||
    (unit.data?.access?.canLead ?? false) ||
    (unit.data?.access?.canManage ?? false);

  const visibleTabs = useMemo(() => {
    const data = unit.data;
    if (!data) return baseTabs.filter((t) => t.id !== 'department' && t.id !== 'admin');

    const showDeptTab =
      showDepartmentToolsTab(data.departmentCode, data.name) && canViewDepartmentTab;

    return baseTabs.filter((t) => {
      if (t.id === 'department') return showDeptTab;
      if (t.id === 'admin') return canManage;
      return true;
    });
  }, [unit.data, canViewDepartmentTab, canManage]);

  useEffect(() => {
    if (tab === 'department' && !canViewDepartmentTab) setTab('overview');
    if (tab === 'admin' && !canManage) setTab('overview');
  }, [tab, canViewDepartmentTab, canManage]);

  const [unitEditForm, setUnitEditForm] = useState({
    name: '',
    description: '',
    activities: '',
  });
  const [editingUnit, setEditingUnit] = useState(false);
  const [unitSaving, setUnitSaving] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ title: '', startsAt: '', location: '' });
  const [postForm, setPostForm] = useState({ title: '', body: '' });
  const [replyForms, setReplyForms] = useState<Record<string, string>>({});
  const [summaryForm, setSummaryForm] = useState({
    title: '',
    body: '',
    meetingDate: '',
    meetingId: '',
  });
  const [editingSummaryId, setEditingSummaryId] = useState<string | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['service-unit', id] });
    queryClient.invalidateQueries({ queryKey: ['service-unit-posts', id] });
    queryClient.invalidateQueries({ queryKey: ['service-units'] });
  };

  useEffect(() => {
    if (!unit.data) return;
    setUnitEditForm({
      name: unit.data.name,
      description: unit.data.description ?? '',
      activities: unit.data.activities ?? '',
    });
  }, [unit.data?.id, unit.data?.name, unit.data?.description, unit.data?.activities]);

  const saveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setUnitSaving(true);
    try {
      await api.patch(`/service-units/${id}`, unitEditForm);
      toast.success('Service unit updated');
      setEditingUnit(false);
      refresh();
    } catch {
      toast.error('Could not update service unit');
    } finally {
      setUnitSaving(false);
    }
  };

  const deleteUnit = async () => {
    if (!isChurchStaff || !window.confirm(`Deactivate "${unit.data?.name}"?`)) return;
    try {
      await api.delete(`/service-units/${id}`);
      toast.success('Service unit deactivated');
      queryClient.invalidateQueries({ queryKey: ['service-units'] });
      window.location.href = '/dashboard/service-units';
    } catch {
      toast.error('Could not deactivate service unit');
    }
  };

  const addMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/service-units/${id}/meetings`, meetingForm);
      toast.success('Meeting scheduled');
      setMeetingForm({ title: '', startsAt: '', location: '' });
      refresh();
    } catch {
      toast.error('Could not create meeting');
    }
  };

  const deleteMeeting = async (meetingId: string) => {
    try {
      await api.delete(`/service-units/${id}/meetings/${meetingId}`);
      toast.success('Meeting removed');
      refresh();
    } catch {
      toast.error('Could not delete meeting');
    }
  };

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMemberId) return;
    try {
      await api.post(`/service-units/${id}/posts`, { ...postForm, authorId: currentMemberId });
      toast.success('Discussion started');
      setPostForm({ title: '', body: '' });
      refresh();
    } catch {
      toast.error('Could not create post');
    }
  };

  const replyToPost = async (postId: string) => {
    const body = replyForms[postId]?.trim();
    if (!body || !currentMemberId) return;
    try {
      await api.post(`/service-units/${id}/posts/${postId}/replies`, { body, authorId: currentMemberId });
      setReplyForms((f) => ({ ...f, [postId]: '' }));
      refresh();
    } catch {
      toast.error('Could not post reply');
    }
  };

  const saveSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summaryForm.title.trim() || !summaryForm.body.trim()) {
      toast.error('Title and summary body are required');
      return;
    }
    try {
      const payload = {
        title: summaryForm.title.trim(),
        body: summaryForm.body.trim(),
        meetingDate: summaryForm.meetingDate || undefined,
        meetingId: summaryForm.meetingId || undefined,
        // Prefer the signed-in congregant — never fall back to another unit member.
        ...(member?.id ? { authorId: member.id } : {}),
      };
      if (editingSummaryId) {
        await api.patch(`/service-units/${id}/meeting-summaries/${editingSummaryId}`, {
          title: payload.title,
          body: payload.body,
          meetingDate: payload.meetingDate || null,
        });
        toast.success('Summary updated');
      } else {
        await api.post(`/service-units/${id}/meeting-summaries`, payload);
        toast.success('Summary published — pastors and admins notified');
      }
      setSummaryForm({ title: '', body: '', meetingDate: '', meetingId: '' });
      setEditingSummaryId(null);
      refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not save summary'));
    }
  };

  const deleteSummary = async (summaryId: string) => {
    try {
      await api.delete(`/service-units/${id}/meeting-summaries/${summaryId}`);
      toast.success('Summary removed');
      refresh();
    } catch {
      toast.error('Could not delete summary');
    }
  };

  const toggleLock = async (post: ServiceUnitPost) => {
    try {
      await api.patch(`/service-units/${id}/posts/${post.id}`, {
        isLocked: !post.isLocked,
        moderatorMemberId: currentMemberId,
      });
      refresh();
    } catch {
      toast.error('Moderator action failed');
    }
  };

  if (unit.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (accessDenied || (unit.isError && !unit.data)) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">
          You need to be a member of this unit, or have pastor/admin access.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button onClick={() => setShowJoin(true)}>Request to join</Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/service-units">Back to hub</Link>
          </Button>
        </div>
        {showJoin && (
          <ServiceUnitJoinSheet
            unitId={id}
            unitName="this unit"
            open
            defaultValues={{
              firstName: user?.firstName ?? member?.firstName,
              lastName: user?.lastName ?? member?.lastName,
              email: user?.email,
              memberId: member?.id,
            }}
            onClose={() => setShowJoin(false)}
            onSubmitted={() => {
              setShowJoin(false);
              setAccessDenied(false);
              unit.refetch();
            }}
          />
        )}
      </div>
    );
  }

  if (!unit.data) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Service unit not found.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboard/service-units">Back to hub</Link>
        </Button>
      </div>
    );
  }

  const data = unit.data;
  const moderatorIds = new Set(data.leaders.filter((l) => l.isModerator).map((l) => l.member.id));
  const isDepartmentFocus = tab === 'department';

  return (
    <div className={cn('space-y-6', isDepartmentFocus ? 'p-4 md:p-6' : 'p-6 md:p-8')}>
      <div
        className={cn(
          'flex flex-col gap-4',
          !isDepartmentFocus && 'md:flex-row md:items-start md:justify-between',
        )}
      >
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/dashboard/service-units">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Service Unit Hub
            </Link>
          </Button>
          {!isDepartmentFocus ? (
            <>
              <h1 className="font-heading text-2xl font-bold md:text-3xl">{data.name}</h1>
              <p className="font-sans mt-1 max-w-2xl text-sm text-muted-foreground">{data.description}</p>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-xl font-semibold md:text-2xl">{data.name}</h1>
              <Badge variant="secondary">Department workspace</Badge>
            </div>
          )}
        </div>
        {!isDepartmentFocus ? (
          <Badge variant="outline" className="w-fit gap-2">
            <OnlineIndicator online={!!currentMemberId && isOnline(currentMemberId)} />
            {data.members.filter((m) => isOnline(m.memberId)).length} members online
          </Badge>
        ) : null}
      </div>

      <div
        className={cn(
          'flex gap-2 overflow-x-auto pb-1 scrollbar-thin',
          isDepartmentFocus ? 'rounded-xl border border-border/60 bg-muted/20 p-1.5' : 'border-b border-border',
        )}
      >
        {visibleTabs.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setTab(tabId)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:px-4',
              tab === tabId
                ? isDepartmentFocus
                  ? 'bg-background text-primary shadow-sm ring-1 ring-border/60'
                  : 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'department' && unit.data && canViewDepartmentTab && showDepartmentToolsTab(unit.data.departmentCode, unit.data.name) && (
        <DepartmentToolsRouter
          unitId={id}
          departmentCode={effectiveDeptCode ?? unit.data.departmentCode ?? ''}
          unitName={unit.data.name}
          canManage={canManage}
          members={unit.data.members}
          unitAccess={unit.data.access}
        />
      )}

      {tab === 'overview' && (
        <div className="space-y-6">
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Unit details</CardTitle>
                <CardDescription>
                  {isChurchStaff
                    ? 'Church admin can update or deactivate any service unit.'
                    : 'Unit admin can update this unit profile.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {editingUnit ? (
                  <form onSubmit={saveUnit} className="grid gap-3 md:grid-cols-2">
                    <Input
                      placeholder="Unit name"
                      value={unitEditForm.name}
                      onChange={(e) => setUnitEditForm({ ...unitEditForm, name: e.target.value })}
                      required
                    />
                    <Input
                      placeholder="Short description"
                      value={unitEditForm.description}
                      onChange={(e) =>
                        setUnitEditForm({ ...unitEditForm, description: e.target.value })
                      }
                    />
                    <Input
                      className="md:col-span-2"
                      placeholder="Activities summary"
                      value={unitEditForm.activities}
                      onChange={(e) =>
                        setUnitEditForm({ ...unitEditForm, activities: e.target.value })
                      }
                    />
                    <div className="flex flex-wrap gap-2 md:col-span-2">
                      <Button type="submit" disabled={unitSaving}>
                        {unitSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditingUnit(false)}>
                        Cancel
                      </Button>
                      {isChurchStaff && (
                        <Button type="button" variant="destructive" onClick={deleteUnit}>
                          Deactivate unit
                        </Button>
                      )}
                    </div>
                  </form>
                ) : (
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingUnit(true)}>
                    Edit unit details
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-sans text-sm leading-relaxed text-foreground/90">
                {data.activities ?? 'No activities documented yet.'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Members</CardTitle>
              <CardDescription>{data.members.length} people in this unit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.members.map(({ memberId, member }) => (
                <MemberWithPresence
                  key={memberId}
                  name={formatMemberName(member)}
                  online={isOnline(memberId)}
                  subtitle={member.email ?? undefined}
                />
              ))}
            </CardContent>
          </Card>
        </div>
        </div>
      )}

      {tab === 'meetings' && (
        <div className="space-y-6">
          {canManage && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schedule meeting</CardTitle>
              <CardDescription>
                After the meeting, publish a summary below — it stays on this page and is sent to pastors
                and admins.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={addMeeting} className="grid gap-3 md:grid-cols-3">
                <Input
                  placeholder="Meeting title"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  required
                />
                <Input
                  type="datetime-local"
                  value={meetingForm.startsAt}
                  onChange={(e) => setMeetingForm({ ...meetingForm, startsAt: e.target.value })}
                  required
                />
                <Input
                  placeholder="Location"
                  value={meetingForm.location}
                  onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                />
                <Button type="submit" className="md:col-span-3 w-fit">
                  Add meeting
                </Button>
              </form>
            </CardContent>
          </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meeting schedule</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2 font-medium">Title</th>
                    <th className="pb-2 font-medium">Date & time</th>
                    <th className="pb-2 font-medium">Location</th>
                    {canManage && <th className="pb-2 font-medium" />}
                  </tr>
                </thead>
                <tbody>
                  {data.meetings.map((m) => (
                    <tr key={m.id} className="border-b border-border/60">
                      <td className="py-3 font-medium">{m.title}</td>
                      <td className="py-3 text-muted-foreground">{formatDateTime(m.startsAt)}</td>
                      <td className="py-3 text-muted-foreground">{m.location ?? '—'}</td>
                      {canManage && (
                        <td className="py-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingSummaryId(null);
                              setSummaryForm({
                                title: `${m.title} — summary`,
                                body: '',
                                meetingDate: new Date(m.startsAt).toISOString().slice(0, 16),
                                meetingId: m.id,
                              });
                              document
                                .getElementById('meeting-summary-form')
                                ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }}
                          >
                            Summarize
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => deleteMeeting(m.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {data.meetings.length === 0 && (
                    <tr>
                      <td colSpan={canManage ? 4 : 3} className="py-6 text-center text-muted-foreground">
                        No meetings scheduled.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {canManage && (
            <Card id="meeting-summary-form">
              <CardHeader>
                <CardTitle className="text-base">
                  {editingSummaryId ? 'Edit meeting summary' : 'Publish meeting summary'}
                </CardTitle>
                <CardDescription>
                  Saves to this unit, emails pastors and admins, and appears on the reports dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveSummary} className="space-y-3">
                  <Input
                    placeholder="Summary title"
                    value={summaryForm.title}
                    onChange={(e) => setSummaryForm({ ...summaryForm, title: e.target.value })}
                    required
                  />
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={summaryForm.meetingId}
                    onChange={(e) => {
                      const meetingId = e.target.value;
                      const meeting = data.meetings.find((m) => m.id === meetingId);
                      setSummaryForm({
                        ...summaryForm,
                        meetingId,
                        meetingDate: meeting
                          ? new Date(meeting.startsAt).toISOString().slice(0, 16)
                          : summaryForm.meetingDate,
                        title:
                          summaryForm.title ||
                          (meeting ? `${meeting.title} — summary` : summaryForm.title),
                      });
                    }}
                  >
                    <option value="">Link to scheduled meeting (optional)</option>
                    {data.meetings.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} · {formatDateTime(m.startsAt)}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="datetime-local"
                    value={summaryForm.meetingDate}
                    onChange={(e) => setSummaryForm({ ...summaryForm, meetingDate: e.target.value })}
                  />
                  <textarea
                    className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Key decisions, attendance notes, action items…"
                    value={summaryForm.body}
                    onChange={(e) => setSummaryForm({ ...summaryForm, body: e.target.value })}
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="submit">{editingSummaryId ? 'Update' : 'Publish'}</Button>
                    {editingSummaryId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingSummaryId(null);
                          setSummaryForm({ title: '', body: '', meetingDate: '', meetingId: '' });
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Published summaries</h2>
            {(data.meetingSummaries ?? []).map((s) => (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{s.title}</CardTitle>
                      <CardDescription>
                        {formatMemberName(s.author)}
                        {s.meetingDate ? ` · ${formatDateTime(s.meetingDate)}` : ''}
                      </CardDescription>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingSummaryId(s.id);
                            setSummaryForm({
                              title: s.title,
                              body: s.body,
                              meetingDate: s.meetingDate
                                ? new Date(s.meetingDate).toISOString().slice(0, 16)
                                : '',
                              meetingId: '',
                            });
                            document
                              .getElementById('meeting-summary-form')
                              ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteSummary(s.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{s.body}</p>
                </CardContent>
              </Card>
            ))}
            {(data.meetingSummaries ?? []).length === 0 && (
              <p className="text-center text-sm text-muted-foreground">No meeting summaries yet.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'leaders' && (
        <ServiceUnitMembersPanel unitId={id} canManage={canManage} isOnline={isOnline} />
      )}

      {tab === 'weekly' && unit.data && (
        <ServiceUnitWeeklyAttendancePanel
          unitId={id}
          unitName={unit.data.name}
          canManage={canManage}
        />
      )}

      {tab === 'admin' && canManage && unit.data && (
        <ServiceUnitAdminPanel
          unitId={id}
          unitName={unit.data.name}
          departmentCode={unit.data.departmentCode}
          isChurchStaff={unit.data.access?.isChurchStaff}
        />
      )}

      {tab === 'forum' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Start a discussion</CardTitle>
              <CardDescription>Unit leaders moderate this board.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createPost} className="space-y-3">
                <Input
                  placeholder="Topic title"
                  value={postForm.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                />
                <textarea
                  className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-sans"
                  placeholder="Share an update or question…"
                  value={postForm.body}
                  onChange={(e) => setPostForm({ ...postForm, body: e.target.value })}
                  required
                />
                <Button type="submit">Post to forum</Button>
              </form>
            </CardContent>
          </Card>

          {(posts.data ?? []).map((post) => (
            <Card key={post.id} className={post.isPinned ? 'border-gold/40' : undefined}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {post.isPinned && <Pin className="h-4 w-4 text-gold" />}
                      <CardTitle className="text-base">{post.title ?? 'Discussion'}</CardTitle>
                      {post.isLocked && <Badge variant="outline">Locked</Badge>}
                    </div>
                    <CardDescription className="mt-1">
                      {formatMemberName(post.author)} · {formatDateTime(post.createdAt)}
                      {moderatorIds.has(post.author.id) && (
                        <Badge variant="gold" className="ml-2 text-[10px]">
                          Moderator
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  {currentMemberId && moderatorIds.has(currentMemberId) && (
                    <Button type="button" variant="outline" size="sm" onClick={() => toggleLock(post)}>
                      {post.isLocked ? 'Unlock' : 'Lock thread'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-sans text-sm leading-relaxed">{post.body}</p>

                {post.replies.length > 0 && (
                  <div className="space-y-3 border-l-2 border-border pl-4">
                    {post.replies.map((reply) => (
                      <div key={reply.id}>
                        <p className="font-sans text-xs text-muted-foreground">
                          {formatMemberName(reply.author)} · {formatDateTime(reply.createdAt)}
                        </p>
                        <p className="font-sans mt-1 text-sm">{reply.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                {!post.isLocked && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write a reply…"
                      value={replyForms[post.id] ?? ''}
                      onChange={(e) => setReplyForms((f) => ({ ...f, [post.id]: e.target.value }))}
                    />
                    <Button type="button" onClick={() => replyToPost(post.id)}>
                      Reply
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
