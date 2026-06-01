'use client';

import { useMemo, useState } from 'react';
import { Loader2, Mail, MessageSquare, Search, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
      createdAt: string;
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
      <Card>
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
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Department reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {deptReports.map((r) => (
                <div key={r.id} className="rounded-lg border px-3 py-2 text-sm">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.serviceUnit.name} · {r.author.firstName} {r.author.lastName} ·{' '}
                    {new Date(r.submittedAt).toLocaleString()}
                  </p>
                  <p className="mt-1 line-clamp-3">{r.body}</p>
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
              {!deptReports.length && (
                <p className="text-xs text-muted-foreground">No department reports match your filters.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {weeklyReports.map((r) => (
                <div key={r.id} className="rounded-lg border px-3 py-2 text-sm">
                  <p className="font-medium">{r.serviceUnit.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</p>
                  <p className="mt-1 line-clamp-3">{r.body}</p>
                </div>
              ))}
              {!weeklyReports.length && (
                <p className="text-xs text-muted-foreground">No weekly reports match your filters.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Queue alerts & notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {queueItems.map((q) => (
                <div key={q.id} className="rounded border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{q.title}</p>
                    <Badge
                      variant={q.status === 'FAILED' ? 'outline' : 'secondary'}
                      className={q.status === 'FAILED' ? 'text-[10px] text-destructive' : 'text-[10px]'}
                    >
                      {q.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {q.kind} · {new Date(q.createdAt).toLocaleString()}
                    {q.serviceUnit?.name ? ` · ${q.serviceUnit.name}` : ''}
                  </p>
                  <p className="mt-1 line-clamp-2 text-muted-foreground">{q.body}</p>
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
              ))}
              {notifications.map((n) => (
                <div key={n.id} className="rounded border px-3 py-2 text-sm">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.type} · {new Date(n.sentAt).toLocaleString()}
                  </p>
                  <p className="mt-1 line-clamp-2 text-muted-foreground">{n.body}</p>
                </div>
              ))}
              {!queueItems.length && !notifications.length && (
                <p className="text-xs text-muted-foreground">No queue items or notifications match your filters.</p>
              )}
            </CardContent>
          </Card>

          <Card id={replyFormId}>
            <CardHeader>
              <CardTitle className="text-base">Reply</CardTitle>
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

          {messages.length > 0 && (
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">In-app messages (church-wide)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className="rounded border px-3 py-2 text-sm">
                    <p className="font-medium">{m.subject ?? '(no subject)'}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.sender.firstName} {m.sender.lastName} → {m.recipient.firstName} {m.recipient.lastName} ·{' '}
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 line-clamp-2">{m.body}</p>
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
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </DashboardModuleShell>
  );
}
