'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ThreadRow {
  id: string;
  subject: string;
  status: string;
  lastMessageAt: string;
  messages: Array<{ body: string; senderSide: string }>;
  _count: { messages: number };
}

interface ThreadDetail {
  id: string;
  subject: string;
  status: string;
  messages: Array<{
    id: string;
    body: string;
    senderSide: string;
    createdAt: string;
    sender: { firstName: string; lastName: string };
  }>;
}

function TenantSupportInner() {
  const search = useSearchParams();
  const threadFromUrl = search.get('thread');
  const [selectedId, setSelectedId] = useState<string | null>(threadFromUrl);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [compose, setCompose] = useState({ subject: '', body: '' });
  const [showCompose, setShowCompose] = useState(false);

  const { data: threads, refetch } = useApiQuery<ThreadRow[]>(['support-threads'], '/support/threads');
  const { data: detail, refetch: refetchDetail } = useApiQuery<ThreadDetail>(
    ['support-thread', selectedId ?? ''],
    `/support/threads/${selectedId}`,
    { enabled: !!selectedId },
  );

  useEffect(() => {
    if (threadFromUrl) setSelectedId(threadFromUrl);
  }, [threadFromUrl]);

  const create = async () => {
    if (!compose.subject.trim() || !compose.body.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post<ThreadDetail>('/support/threads', compose);
      setCompose({ subject: '', body: '' });
      setShowCompose(false);
      setSelectedId(data.id);
      void refetch();
      toast.success('Support request sent');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create support thread'));
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!selectedId || !reply.trim()) return;
    setBusy(true);
    try {
      await api.post(`/support/threads/${selectedId}/messages`, { body: reply.trim() });
      setReply('');
      void refetchDetail();
      void refetch();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not send message'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardModuleShell
      eyebrow="Support"
      title="Church_Hub support"
      description="Chat directly with the Church_Hub platform team about your tenant — human support, no bots."
      actions={
        <Button size="sm" onClick={() => setShowCompose((v) => !v)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New request
        </Button>
      }
    >
      {showCompose ? (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">New support request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Subject"
              value={compose.subject}
              onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
            />
            <Textarea
              rows={4}
              placeholder="How can we help?"
              value={compose.body}
              onChange={(e) => setCompose({ ...compose, body: e.target.value })}
            />
            <Button disabled={busy} onClick={() => void create()}>
              Send to Church_Hub
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your threads</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[28rem] space-y-1 overflow-y-auto p-2">
            {(threads ?? []).length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No threads yet.</p>
            ) : (
              (threads ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-left text-sm',
                    selectedId === t.id ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:bg-muted/60',
                  )}
                >
                  <p className="truncate font-medium">{t.subject}</p>
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    {t.status.replace(/_/g, ' ')}
                  </Badge>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-[28rem] flex-col">
          {!selectedId ? (
            <CardContent className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a thread or start a new request
            </CardContent>
          ) : !detail ? (
            <CardContent className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-base">{detail.subject}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 overflow-y-auto py-4">
                {detail.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                      m.senderSide === 'TENANT'
                        ? 'ml-auto bg-primary text-primary-foreground'
                        : 'bg-muted',
                    )}
                  >
                    <p className="text-[10px] opacity-80">
                      {m.senderSide === 'PLATFORM'
                        ? 'Church_Hub'
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
                    placeholder="Write a reply…"
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
    </DashboardModuleShell>
  );
}

export default function TenantSupportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <TenantSupportInner />
    </Suspense>
  );
}
