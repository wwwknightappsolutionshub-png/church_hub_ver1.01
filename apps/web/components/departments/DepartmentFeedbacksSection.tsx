'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { deptToolsApiBase } from '@/lib/dept-module-catalog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface FeedbackReply {
  id: string;
  body: string;
  authorRole: string;
  authorName: string;
  createdAt: string;
}

interface FeedbackThread {
  id: string;
  subject: string | null;
  body: string;
  authorRole: string;
  authorName: string;
  createdAt: string;
  replies: FeedbackReply[];
}

const ROLE_LABEL: Record<string, string> = {
  PASTOR: 'Pastor',
  ADMIN: 'Church admin',
  UNIT_LEADER: 'Unit leadership',
};

export function DepartmentFeedbacksSection({
  unitId,
  canReply,
}: {
  unitId: string;
  canReply: boolean;
}) {
  const qc = useQueryClient();
  const base = deptToolsApiBase(unitId);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: threads = [], refetch, isLoading } = useApiQuery<FeedbackThread[]>(
    ['dept-feedbacks', unitId],
    `${base}/feedbacks`,
  );

  const sendReply = async (parentId: string) => {
    if (!replyBody.trim()) return;
    setBusy(true);
    try {
      await api.post(`${base}/feedbacks`, { parentId, body: replyBody.trim() });
      toast.success('Reply sent');
      setReplyBody('');
      setReplyTo(null);
      await refetch();
      qc.invalidateQueries({ queryKey: ['dept-feedbacks', unitId] });
    } catch (e) {
      toast.error(apiErrorMessage(e as AxiosError, 'Could not send reply'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Feedbacks
          </CardTitle>
          <CardDescription>
            Messages from your pastor and church admin, plus your unit leadership replies. All
            correspondence is stored here for your team.
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading messages…</p>
      ) : threads.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No messages yet. When pastor or admin sends guidance, it will appear here.
        </p>
      ) : (
        <div className="space-y-4">
          {threads.map((thread) => (
            <Card key={thread.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-sm">
                    {thread.subject?.trim() || 'Message from leadership'}
                  </CardTitle>
                  <Badge variant="outline">{ROLE_LABEL[thread.authorRole] ?? thread.authorRole}</Badge>
                </div>
                <CardDescription>
                  {thread.authorName} · {new Date(thread.createdAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{thread.body}</p>

                {thread.replies.length > 0 ? (
                  <div className="space-y-2 border-l-2 border-muted pl-3">
                    {thread.replies.map((r) => (
                      <div key={r.id} className="text-sm">
                        <p className="text-xs text-muted-foreground">
                          {r.authorName} ({ROLE_LABEL[r.authorRole] ?? r.authorRole}) ·{' '}
                          {new Date(r.createdAt).toLocaleString()}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap leading-relaxed">{r.body}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {canReply ? (
                  <div className="space-y-2 pt-2">
                    {replyTo === thread.id ? (
                      <>
                        <Textarea
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          rows={3}
                          placeholder="Write a reply to pastor / admin…"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={busy || !replyBody.trim()}
                            onClick={() => sendReply(thread.id)}
                          >
                            {busy ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="mr-2 h-4 w-4" />
                            )}
                            Send reply
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setReplyTo(null);
                              setReplyBody('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setReplyTo(thread.id)}>
                        Reply
                      </Button>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** Pastor / church admin compose (unit admin tab or staff tools). */
export function StaffUnitFeedbackCompose({
  unitId,
  unitName,
}: {
  unitId: string;
  unitName: string;
}) {
  const qc = useQueryClient();
  const base = deptToolsApiBase(unitId);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!body.trim()) {
      toast.error('Enter a message');
      return;
    }
    setBusy(true);
    try {
      await api.post(`${base}/feedbacks`, {
        subject: subject.trim() || undefined,
        body: body.trim(),
      });
      toast.success(`Message sent to ${unitName} leadership`);
      setSubject('');
      setBody('');
      qc.invalidateQueries({ queryKey: ['dept-feedbacks', unitId] });
    } catch (e) {
      toast.error(apiErrorMessage(e as AxiosError, 'Could not send message'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={cn('border-primary/20')}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Message unit leadership (Feedbacks)</CardTitle>
        <CardDescription>
          Sends to the unit Feedbacks hub (visible to service unit leaders and unit admins only).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (optional)"
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Instructions, encouragement, or questions for the unit team…"
        />
        <Button size="sm" disabled={busy} onClick={send}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Send to Feedbacks hub
        </Button>
      </CardContent>
    </Card>
  );
}
