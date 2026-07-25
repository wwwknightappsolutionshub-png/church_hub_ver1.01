'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, Megaphone, MessageSquare, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import {
  enterpriseHeroBadgeGoldClass,
  enterpriseHeroChipClass,
} from '@/components/layout/EnterpriseModuleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Tab = 'support' | 'broadcasts';

interface ChurchRow {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

interface BroadcastRow {
  id: string;
  title: string;
  body: string;
  audience: string;
  sendEmail: boolean;
  notificationCount: number;
  createdAt: string;
  createdBy: { firstName: string; lastName: string };
  deliveries: Array<{ church: { id: string; name: string } }>;
}

interface ThreadRow {
  id: string;
  subject: string;
  status: string;
  lastMessageAt: string;
  church: { id: string; name: string; slug: string };
  messages: Array<{ body: string; senderSide: string }>;
  _count: { messages: number };
}

interface ThreadDetail {
  id: string;
  subject: string;
  status: string;
  church: { id: string; name: string };
  messages: Array<{
    id: string;
    body: string;
    senderSide: string;
    createdAt: string;
    sender: { firstName: string; lastName: string };
  }>;
}

export default function PlatformInboxInner() {
  const search = useSearchParams();
  const tabParam = search.get('tab');
  const threadFromUrl = search.get('thread');

  const initialTab: Tab = tabParam === 'broadcasts' ? 'broadcasts' : 'support';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [selectedId, setSelectedId] = useState<string | null>(threadFromUrl);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [compose, setCompose] = useState({ subject: '', body: '', churchId: '' });
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    body: '',
    sendEmail: false,
    churchIds: [] as string[],
  });
  const [showBroadcast, setShowBroadcast] = useState(false);

  useEffect(() => {
    if (tabParam === 'broadcasts') setTab('broadcasts');
    else if (tabParam === 'support') setTab('support');
  }, [tabParam]);

  useEffect(() => {
    if (threadFromUrl) {
      setSelectedId(threadFromUrl);
      setTab('support');
    }
  }, [threadFromUrl]);

  const { data: threads, refetch: refetchThreads } = useApiQuery<ThreadRow[]>(
    ['platform-support-threads'],
    '/platform/messaging/support/threads',
  );
  const { data: detail, refetch: refetchDetail } = useApiQuery<ThreadDetail>(
    ['platform-support-thread', selectedId ?? ''],
    `/platform/messaging/support/threads/${selectedId}`,
    { enabled: !!selectedId },
  );
  const { data: broadcasts, refetch: refetchBroadcasts } = useApiQuery<BroadcastRow[]>(
    ['platform-broadcasts'],
    '/platform/messaging/broadcasts',
  );
  const { data: churches } = useApiQuery<ChurchRow[]>(['platform-churches'], '/platform/churches');

  const pendingCount = useMemo(
    () => (threads ?? []).filter((t) => t.status === 'PENDING_PLATFORM').length,
    [threads],
  );

  const createThread = async () => {
    if (!compose.subject.trim() || !compose.body.trim() || !compose.churchId) {
      toast.error('Church, subject, and message are required');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post<ThreadDetail>('/platform/messaging/support/threads', compose);
      setCompose({ subject: '', body: '', churchId: '' });
      setShowCompose(false);
      setSelectedId(data.id);
      void refetchThreads();
      toast.success('Thread started');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create thread'));
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!selectedId || !reply.trim()) return;
    setBusy(true);
    try {
      await api.post(`/platform/messaging/support/threads/${selectedId}/messages`, {
        body: reply.trim(),
      });
      setReply('');
      void refetchDetail();
      void refetchThreads();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not send reply'));
    } finally {
      setBusy(false);
    }
  };

  const closeThread = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      await api.post(`/platform/messaging/support/threads/${selectedId}/close`);
      void refetchDetail();
      void refetchThreads();
      toast.success('Thread closed');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not close thread'));
    } finally {
      setBusy(false);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastForm.title.trim() || !broadcastForm.body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    setBusy(true);
    try {
      await api.post('/platform/messaging/broadcasts', {
        title: broadcastForm.title.trim(),
        body: broadcastForm.body.trim(),
        sendEmail: broadcastForm.sendEmail,
        churchIds: broadcastForm.churchIds.length ? broadcastForm.churchIds : undefined,
      });
      setBroadcastForm({ title: '', body: '', sendEmail: false, churchIds: [] });
      setShowBroadcast(false);
      void refetchBroadcasts();
      toast.success('Broadcast sent to tenant staff');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not send broadcast'));
    } finally {
      setBusy(false);
    }
  };

  const toggleChurch = (id: string) => {
    setBroadcastForm((prev) => ({
      ...prev,
      churchIds: prev.churchIds.includes(id)
        ? prev.churchIds.filter((c) => c !== id)
        : [...prev.churchIds, id],
    }));
  };

  return (
    <DashboardModuleShell
      eyebrow="Platform"
      title="Messaging"
      description="Support chat with tenants and SaaS broadcasts — no AI. Human replies only."
      badge={<span className={enterpriseHeroBadgeGoldClass}>SaaS Owner</span>}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/platform" className={enterpriseHeroChipClass}>
            Tenant console
          </Link>
          {tab === 'support' ? (
            <Button size="sm" onClick={() => setShowCompose((v) => !v)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Message tenant
            </Button>
          ) : (
            <Button size="sm" onClick={() => setShowBroadcast((v) => !v)}>
              <Megaphone className="mr-1.5 h-3.5 w-3.5" />
              New broadcast
            </Button>
          )}
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={tab === 'support' ? 'default' : 'outline'}
          onClick={() => setTab('support')}
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          Support
          {pendingCount > 0 ? (
            <Badge className="ml-2" variant="secondary">
              {pendingCount}
            </Badge>
          ) : null}
        </Button>
        <Button
          size="sm"
          variant={tab === 'broadcasts' ? 'default' : 'outline'}
          onClick={() => setTab('broadcasts')}
        >
          <Megaphone className="mr-1.5 h-3.5 w-3.5" />
          Broadcasts
        </Button>
      </div>

      {tab === 'support' ? (
        <>
          {showCompose ? (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Start support thread</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={compose.churchId}
                  onChange={(e) => setCompose({ ...compose, churchId: e.target.value })}
                >
                  <option value="">Select church…</option>
                  {(churches ?? [])
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <Input
                  placeholder="Subject"
                  value={compose.subject}
                  onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
                />
                <Textarea
                  rows={4}
                  placeholder="Message to tenant staff…"
                  value={compose.body}
                  onChange={(e) => setCompose({ ...compose, body: e.target.value })}
                />
                <Button disabled={busy} onClick={() => void createThread()}>
                  Send
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Threads</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[32rem] space-y-1 overflow-y-auto p-2">
                {(threads ?? []).length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                    No support threads yet.
                  </p>
                ) : (
                  (threads ?? []).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className={cn(
                        'w-full rounded-lg border px-3 py-2 text-left text-sm',
                        selectedId === t.id
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-transparent hover:bg-muted/60',
                      )}
                    >
                      <p className="truncate font-medium">{t.subject}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{t.church.name}</p>
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        {t.status.replace(/_/g, ' ')}
                      </Badge>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="flex min-h-[32rem] flex-col">
              {!selectedId ? (
                <CardContent className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  Select a thread
                </CardContent>
              ) : !detail ? (
                <CardContent className="flex flex-1 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
              ) : (
                <>
                  <CardHeader className="flex flex-row items-start justify-between gap-2 border-b pb-3">
                    <div>
                      <CardTitle className="text-base">{detail.subject}</CardTitle>
                      <p className="text-xs text-muted-foreground">{detail.church.name}</p>
                    </div>
                    {detail.status !== 'CLOSED' ? (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void closeThread()}>
                        Close
                      </Button>
                    ) : (
                      <Badge variant="secondary">Closed</Badge>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3 overflow-y-auto py-4">
                    {detail.messages.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                          m.senderSide === 'PLATFORM'
                            ? 'ml-auto bg-primary text-primary-foreground'
                            : 'bg-muted',
                        )}
                      >
                        <p className="text-[10px] opacity-80">
                          {m.senderSide === 'PLATFORM'
                            ? 'You (Church_Hub)'
                            : `${m.sender.firstName} ${m.sender.lastName}`}
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
                      </div>
                    ))}
                  </CardContent>
                  {detail.status !== 'CLOSED' ? (
                    <div className="flex gap-2 border-t p-3">
                      <Textarea
                        rows={2}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Reply to tenant…"
                      />
                      <Button disabled={busy || !reply.trim()} onClick={() => void sendReply()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </Card>
          </div>
        </>
      ) : (
        <>
          {showBroadcast ? (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Broadcast to tenants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Title"
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                />
                <Textarea
                  rows={5}
                  placeholder="Announcement for church admins and pastors…"
                  value={broadcastForm.body}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, body: e.target.value })}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={broadcastForm.sendEmail}
                    onChange={(e) =>
                      setBroadcastForm({ ...broadcastForm, sendEmail: e.target.checked })
                    }
                  />
                  Also send email
                </label>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    Leave all unchecked to reach every active tenant. Or pick specific churches:
                  </p>
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                    {(churches ?? [])
                      .filter((c) => c.isActive)
                      .map((c) => (
                        <label key={c.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={broadcastForm.churchIds.includes(c.id)}
                            onChange={() => toggleChurch(c.id)}
                          />
                          {c.name}
                        </label>
                      ))}
                  </div>
                </div>
                <Button disabled={busy} onClick={() => void sendBroadcast()}>
                  <Send className="mr-1.5 h-4 w-4" />
                  Send broadcast
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent broadcasts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(broadcasts ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No broadcasts yet.
                </p>
              ) : (
                (broadcasts ?? []).map((b) => (
                  <div key={b.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{b.title}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                          {b.body}
                        </p>
                      </div>
                      <Badge variant="secondary">{b.audience}</Badge>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {new Date(b.createdAt).toLocaleString()} · {b.notificationCount} in-app
                      {b.sendEmail ? ' · email' : ''} ·{' '}
                      {b.createdBy.firstName} {b.createdBy.lastName}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </DashboardModuleShell>
  );
}
