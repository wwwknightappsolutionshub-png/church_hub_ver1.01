'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Mail, MessageSquare, Search, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type QueueStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
type TriageKind = 'all' | 'department' | 'weekly' | 'queue' | 'notification' | 'message';

interface ReplyTarget {
  userId: string;
  label: string;
  source: string;
}

export interface ReportsInboxData {
  reports: {
    department: Array<{
      id: string;
      title: string;
      body: string;
      submittedAt: string;
      author: { id: string; userId: string | null; firstName: string; lastName: string };
      serviceUnit: { id: string; name: string; departmentCode: string | null };
    }>;
    weekly: Array<{
      id: string;
      body: string;
      weekStart: string;
      createdAt: string;
      stats?: Record<string, unknown> | null;
      serviceUnit: { id: string; name: string; departmentCode: string | null };
    }>;
  };
  queue: Array<{
    id: string;
    kind: string;
    title: string;
    body: string;
    status: string;
    createdAt: string;
    targetUserId?: string | null;
    serviceUnit?: { id: string; name: string } | null;
  }>;
  notifications: Array<{ id: string; title: string; body: string; type: string; sentAt: string }>;
  messages: Array<{
    id: string;
    subject?: string | null;
    body: string;
    createdAt: string;
    sender: { id: string; firstName: string; lastName: string };
    recipient: { id: string; firstName: string; lastName: string };
  }>;
  replyTargets: ReplyTarget[];
}

const STATUS_OPTIONS: Array<{ value: 'all' | QueueStatus; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SENT', label: 'Sent' },
  { value: 'FAILED', label: 'Failed' },
];

const KIND_OPTIONS: Array<{ value: TriageKind; label: string }> = [
  { value: 'all', label: 'All types' },
  { value: 'department', label: 'Department reports' },
  { value: 'weekly', label: 'Weekly reports' },
  { value: 'queue', label: 'Queue alerts' },
  { value: 'notification', label: 'Notifications' },
  { value: 'message', label: 'In-app messages' },
];

function matchesSearch(text: string, query: string) {
  if (!query.trim()) return true;
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

function formatWeekLabel(iso: string) {
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return iso;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function weeklyReportTitle(body: string, serviceUnitName: string) {
  const firstLine = body.split('\n').find((line) => line.trim())?.trim();
  return firstLine || `${serviceUnitName} weekly report`;
}

function InboxScrollCard({
  title,
  description,
  count,
  emptyMessage,
  testId,
  children,
  className,
}: {
  title: string;
  description?: string;
  count: number;
  emptyMessage: string;
  testId?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn('flex min-h-[22rem] flex-col xl:min-h-[26rem]', className)}
      data-testid={testId}
    >
      <CardHeader className="shrink-0 space-y-1 pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="outline" className="shrink-0 tabular-nums">
            {count}
          </Badge>
        </div>
        {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden p-0 pb-4">
        <div className="max-h-[min(26rem,52vh)] overflow-y-auto overscroll-contain px-6">
          <div className="space-y-3 pb-1">{children}</div>
          {count === 0 ? (
            <p className="pb-2 text-xs text-muted-foreground">{emptyMessage}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyReportItem({ report }: { report: ReportsInboxData['reports']['weekly'][number] }) {
  const [expanded, setExpanded] = useState(false);
  const title = weeklyReportTitle(report.body, report.serviceUnit.name);
  const isLong = report.body.length > 320 || report.body.split('\n').length > 8;

  return (
    <article className="rounded-lg border bg-card px-3 py-2.5 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium leading-snug">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {report.serviceUnit.name}
            {report.serviceUnit.departmentCode ? ` · ${report.serviceUnit.departmentCode}` : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            Week of {formatWeekLabel(report.weekStart)} ·{' '}
            {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          Weekly
        </Badge>
      </div>
      <pre
        className={cn(
          'mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-muted/45 p-2.5 font-sans text-xs leading-relaxed text-foreground',
          !expanded && isLong && 'max-h-36 overflow-hidden',
        )}
      >
        {report.body}
      </pre>
      {isLong ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-7 gap-1 px-2 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Show full report
            </>
          )}
        </Button>
      ) : null}
    </article>
  );
}

type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

function queueUrgency(status: string): UrgencyLevel {
  if (status === 'FAILED') return 'critical';
  if (status === 'PENDING') return 'high';
  if (status === 'PROCESSING') return 'medium';
  if (status === 'SENT') return 'low';
  return 'info';
}

const URGENCY_META: Record<
  UrgencyLevel,
  { label: string; card: string; badge: string; dot: string }
> = {
  critical: {
    label: 'Critical',
    card: 'border-l-4 border-l-red-600 bg-red-50/90 dark:bg-red-950/25',
    badge: 'border-red-600/50 bg-red-600 text-white',
    dot: 'bg-red-600',
  },
  high: {
    label: 'High',
    card: 'border-l-4 border-l-orange-500 bg-orange-50/90 dark:bg-orange-950/20',
    badge: 'border-orange-500/50 bg-orange-500 text-white',
    dot: 'bg-orange-500',
  },
  medium: {
    label: 'Medium',
    card: 'border-l-4 border-l-amber-500 bg-amber-50/80 dark:bg-amber-950/20',
    badge: 'border-amber-500/50 bg-amber-500 text-white',
    dot: 'bg-amber-500',
  },
  low: {
    label: 'Low',
    card: 'border-l-4 border-l-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/20',
    badge: 'border-emerald-600/50 bg-emerald-600 text-white',
    dot: 'bg-emerald-600',
  },
  info: {
    label: 'Info',
    card: 'border-l-4 border-l-slate-400 bg-slate-50/80 dark:bg-slate-900/40',
    badge: 'border-slate-400/50 bg-slate-600 text-white',
    dot: 'bg-slate-500',
  },
};

export interface ReportsInboxPanelProps {
  queryKey: string;
  inboxPath: string;
  replyPath: string;
  replyFormId: string;
  eyebrow: string;
  title: string;
  description: string;
  defaultReplySubject?: string;
}

export function ReportsInboxPanel({
  queryKey,
  inboxPath,
  replyPath,
  replyFormId,
  eyebrow,
  title,
  description,
  defaultReplySubject = 'Re: Church report',
}: ReportsInboxPanelProps) {
  const qc = useQueryClient();
  const { data, isLoading } = useApiQuery<ReportsInboxData>([queryKey], inboxPath);
  const [reply, setReply] = useState({ recipientId: '', subject: '', body: '' });
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | QueueStatus>('all');
  const [kindFilter, setKindFilter] = useState<TriageKind>('all');

  const selectedTarget = useMemo(
    () => data?.replyTargets.find((t) => t.userId === reply.recipientId),
    [data?.replyTargets, reply.recipientId],
  );

  const pickReply = (target: { userId: string; subject: string }) => {
    setReply((p) => ({
      ...p,
      recipientId: target.userId,
      subject: target.subject,
    }));
    document.getElementById(replyFormId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const deptReports = useMemo(() => {
    if (kindFilter !== 'all' && kindFilter !== 'department') return [];
    return (data?.reports.department ?? []).filter((r) => {
      const blob = `${r.title} ${r.body} ${r.serviceUnit.name} ${r.author.firstName} ${r.author.lastName}`;
      return matchesSearch(blob, search);
    });
  }, [data, kindFilter, search]);

  const weeklyReports = useMemo(() => {
    if (kindFilter !== 'all' && kindFilter !== 'weekly') return [];
    return (data?.reports.weekly ?? []).filter((r) => {
      const blob = `${r.body} ${r.serviceUnit.name}`;
      return matchesSearch(blob, search);
    });
  }, [data, kindFilter, search]);

  const queueItems = useMemo(() => {
    if (kindFilter !== 'all' && kindFilter !== 'queue') return [];
    return (data?.queue ?? []).filter((q) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      const blob = `${q.title} ${q.body} ${q.kind} ${q.status} ${q.serviceUnit?.name ?? ''}`;
      return matchesSearch(blob, search);
    });
  }, [data, kindFilter, search, statusFilter]);

  const notifications = useMemo(() => {
    if (kindFilter !== 'all' && kindFilter !== 'notification') return [];
    return (data?.notifications ?? []).filter((n) => {
      const blob = `${n.title} ${n.body} ${n.type}`;
      return matchesSearch(blob, search);
    });
  }, [data, kindFilter, search]);

  const messages = useMemo(() => {
    if (kindFilter !== 'all' && kindFilter !== 'message') return [];
    return (data?.messages ?? []).filter((m) => {
      const blob = `${m.subject ?? ''} ${m.body} ${m.sender.firstName} ${m.sender.lastName} ${m.recipient.firstName} ${m.recipient.lastName}`;
      return matchesSearch(blob, search);
    });
  }, [data, kindFilter, search]);

  const triageCount =
    deptReports.length + weeklyReports.length + queueItems.length + notifications.length + messages.length;

  const urgencyCounts = useMemo(() => {
    const counts: Record<UrgencyLevel, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    for (const q of data?.queue ?? []) {
      if (statusFilter !== 'all' && q.status !== statusFilter) continue;
      counts[queueUrgency(q.status)] += 1;
    }
    if (deptReports.length) counts.medium += deptReports.length;
    if (weeklyReports.length) counts.info += weeklyReports.length;
    return counts;
  }, [data?.queue, deptReports.length, weeklyReports.length, statusFilter]);

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.recipientId || !reply.body.trim()) {
      toast.error('Pick a recipient and write a message');
      return;
    }
    setBusy(true);
    try {
      await api.post(replyPath, {
        recipientId: reply.recipientId,
        subject: reply.subject.trim() || defaultReplySubject,
        body: reply.body.trim(),
      });
      toast.success('Reply sent');
      setReply({ recipientId: '', subject: '', body: '' });
      qc.invalidateQueries({ queryKey: [queryKey] });
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not send reply'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardModuleShell
      eyebrow={eyebrow}
      title={title}
      description={description}
      badge={
        <Badge variant="success" className="gap-1 border-emerald-600/50 bg-emerald-900/40 text-emerald-100">
          <Mail className="h-3 w-3" />
          {(data?.reports.department.length ?? 0) + (data?.reports.weekly.length ?? 0)} reports ·{' '}
          {data?.messages.length ?? 0} messages
        </Badge>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" data-testid="reports-urgency-strip">
        {(Object.keys(URGENCY_META) as UrgencyLevel[]).map((level) => (
          <div
            key={level}
            className={cn(
              'rounded-xl border px-4 py-3 shadow-sm',
              URGENCY_META[level].card,
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full', URGENCY_META[level].dot)} aria-hidden />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {URGENCY_META[level].label}
              </p>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">{urgencyCounts[level]}</p>
          </div>
        ))}
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[200px] flex-1 space-y-1">
            <Label htmlFor={`${replyFormId}-search`} className="text-xs text-muted-foreground">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id={`${replyFormId}-search`}
                className="pl-8"
                placeholder="Title, department, sender, body..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${replyFormId}-status`} className="text-xs text-muted-foreground">
              Queue status
            </Label>
            <select
              id={`${replyFormId}-status`}
              className="h-10 w-full min-w-[140px] rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | QueueStatus)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${replyFormId}-kind`} className="text-xs text-muted-foreground">
              Type
            </Label>
            <select
              id={`${replyFormId}-kind`}
              className="h-10 w-full min-w-[160px] rounded-md border border-input bg-background px-3 text-sm"
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as TriageKind)}
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <p className="pb-2 text-xs text-muted-foreground sm:ml-auto">
            {isLoading ? 'Loading…' : `${triageCount} item${triageCount === 1 ? '' : 's'} match`}
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4" data-testid="reports-inbox-grid">
          <div className="grid gap-4 xl:grid-cols-2 xl:items-stretch">
            <InboxScrollCard
              title="Department reports"
              description="Submitted from department modules and leadership workflows."
              count={deptReports.length}
              emptyMessage="No department reports match your filters."
              testId="reports-dept-inbox"
            >
              {deptReports.map((r) => (
                <div
                  key={r.id}
                  className={cn('rounded-lg border px-3 py-2.5 text-sm', URGENCY_META.medium.card)}
                >
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.serviceUnit.name} · {r.author.firstName} {r.author.lastName} ·{' '}
                    {new Date(r.submittedAt).toLocaleString()}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{r.body}</p>
                  {r.author.userId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() =>
                        pickReply({
                          userId: r.author.userId!,
                          subject: `Re: ${r.title}`,
                        })
                      }
                    >
                      <MessageSquare className="mr-1 h-3.5 w-3.5" />
                      Reply to sender
                    </Button>
                  ) : (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                      No linked user account — pick recipient manually below.
                    </p>
                  )}
                </div>
              ))}
            </InboxScrollCard>

            <InboxScrollCard
              title="Weekly reports"
              description="Auto-generated department summaries with attendance and activity stats."
              count={weeklyReports.length}
              emptyMessage="No weekly reports match your filters."
              testId="reports-weekly-inbox"
            >
              {weeklyReports.map((r) => (
                <WeeklyReportItem key={r.id} report={r} />
              ))}
            </InboxScrollCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2 xl:items-stretch">
            <InboxScrollCard
              title="Queue alerts"
              description="Automation queue items — failed sends and pending pastoral alerts."
              count={queueItems.length}
              emptyMessage="No queue alerts match your filters."
              testId="reports-queue-inbox"
            >
              {queueItems.map((q) => {
                const urgency = queueUrgency(q.status);
                const meta = URGENCY_META[urgency];
                return (
                  <div key={q.id} className={cn('rounded-lg border px-3 py-2.5 text-sm', meta.card)}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{q.title}</p>
                      <Badge className={cn('text-[10px]', meta.badge)}>
                        {meta.label} · {q.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {q.kind} · {new Date(q.createdAt).toLocaleString()}
                      {q.serviceUnit?.name ? ` · ${q.serviceUnit.name}` : ''}
                    </p>
                    <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {q.body}
                    </p>
                    {q.targetUserId ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() =>
                          pickReply({
                            userId: q.targetUserId!,
                            subject: `Re: ${q.title}`,
                          })
                        }
                      >
                        <MessageSquare className="mr-1 h-3.5 w-3.5" />
                        Reply
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </InboxScrollCard>

            <InboxScrollCard
              title="Notifications"
              description="In-app alerts sent to administrators and pastoral staff."
              count={notifications.length}
              emptyMessage="No notifications match your filters."
              testId="reports-notifications-inbox"
            >
              {notifications.map((n) => (
                <div key={n.id} className="rounded-lg border bg-card px-3 py-2.5 text-sm">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.type} · {new Date(n.sentAt).toLocaleString()}
                  </p>
                  <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {n.body}
                  </p>
                </div>
              ))}
            </InboxScrollCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
            <Card id={replyFormId} className="xl:sticky xl:top-4">
              <CardHeader>
                <CardTitle className="text-base">Reply</CardTitle>
                <CardDescription className="text-xs">
                  Respond to a report author, queue target, or staff member.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitReply} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor={`${replyFormId}-target`} className="text-xs text-muted-foreground">
                      Recipient (member, leader, or pastor)
                    </Label>
                    <select
                      id={`${replyFormId}-target`}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={reply.recipientId}
                      onChange={(e) => setReply((p) => ({ ...p, recipientId: e.target.value }))}
                    >
                      <option value="">Select recipient…</option>
                      {(data?.replyTargets ?? []).map((t) => (
                        <option key={t.userId} value={t.userId}>
                          {t.label} — {t.source}
                        </option>
                      ))}
                    </select>
                    {selectedTarget && (
                      <p className="text-xs text-muted-foreground">{selectedTarget.source}</p>
                    )}
                  </div>
                  <Input
                    placeholder="Subject"
                    value={reply.subject}
                    onChange={(e) => setReply((p) => ({ ...p, subject: e.target.value }))}
                  />
                  <textarea
                    className="min-h-[120px] w-full rounded-md border border-input px-3 py-2 text-sm"
                    placeholder="Write reply..."
                    value={reply.body}
                    onChange={(e) => setReply((p) => ({ ...p, body: e.target.value }))}
                  />
                  <Button type="submit" disabled={busy} className="gap-1">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send reply
                  </Button>
                </form>
              </CardContent>
            </Card>

            {messages.length > 0 ? (
              <InboxScrollCard
                title="In-app messages"
                description="Church-wide direct messages between members and leadership."
                count={messages.length}
                emptyMessage="No messages match your filters."
                testId="reports-messages-inbox"
                className="min-h-0 xl:min-h-[22rem]"
              >
                {messages.map((m) => (
                  <div key={m.id} className="rounded-lg border bg-card px-3 py-2.5 text-sm">
                    <p className="font-medium">{m.subject ?? '(no subject)'}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.sender.firstName} {m.sender.lastName} → {m.recipient.firstName}{' '}
                      {m.recipient.lastName} · {new Date(m.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          pickReply({
                            userId: m.sender.id,
                            subject: m.subject ? `Re: ${m.subject}` : 'Re: Your message',
                          })
                        }
                      >
                        <MessageSquare className="mr-1 h-3.5 w-3.5" />
                        Reply to {m.sender.firstName}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          pickReply({
                            userId: m.recipient.id,
                            subject: m.subject ? `Re: ${m.subject}` : 'Follow-up',
                          })
                        }
                      >
                        Message {m.recipient.firstName}
                      </Button>
                    </div>
                  </div>
                ))}
              </InboxScrollCard>
            ) : null}
          </div>
        </div>
      )}
    </DashboardModuleShell>
  );
}
