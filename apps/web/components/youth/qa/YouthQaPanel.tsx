'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  Lock,
  MessageCircleQuestion,
  Send,
  Shield,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import type { YouthQuestionDto } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { QA_CATEGORIES, QA_STATUS_LABELS } from '@/lib/youth';
import { YOUTH_ROUTES } from '@/lib/youth/routes';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useYouthContext } from '@/components/youth/YouthProvider';

type TabId = 'ask' | 'board' | 'mine' | 'leader';

export function YouthQaPanel() {
  const ctx = useYouthContext();
  const leaderMode = ctx?.permissions.qaLeaderQueue ?? false;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>('ask');
  const [boardCategory, setBoardCategory] = useState('');
  const [queueStatus, setQueueStatus] = useState('');

  const board = useApiQuery<YouthQuestionDto[]>(
    ['youth-qa-board', boardCategory],
    boardCategory ? `/youth/qa/board?category=${boardCategory}` : '/youth/qa/board',
  );
  const mine = useApiQuery<YouthQuestionDto[]>(['youth-qa-my'], '/youth/qa/my');
  const queue = useApiQuery<YouthQuestionDto[]>(
    ['youth-qa-queue', queueStatus],
    queueStatus ? `/youth/qa/queue?status=${queueStatus}` : '/youth/qa/queue',
    { enabled: leaderMode },
  );
  const hidden = useApiQuery<YouthQuestionDto[]>(
    ['youth-qa-hidden'],
    '/youth/qa/moderation/hidden',
    { enabled: leaderMode && tab === 'leader' },
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [privateReply, setPrivateReply] = useState('');
  const [publicAnswer, setPublicAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    question: '',
    category: 'FAITH',
    alias: 'Anonymous',
  });

  const queueItems = queue.data ?? [];
  const selected =
    queueItems.find((q) => q.id === selectedId) ?? queueItems[0] ?? null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['youth-qa-board'] });
    queryClient.invalidateQueries({ queryKey: ['youth-qa-my'] });
    queryClient.invalidateQueries({ queryKey: ['youth-qa-queue'] });
    queryClient.invalidateQueries({ queryKey: ['youth-qa-hidden'] });
  };

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.question.trim().length < 10) {
      toast.error('Question must be at least 10 characters');
      return;
    }
    setSubmitting(true);
    try {
      const { data: res } = await api.post<YouthQuestionDto>('/youth/qa/questions', {
        question: form.question.trim(),
        category: form.category,
        isAnonymous: true,
        alias: form.alias || 'Anonymous',
      });
      if (res.moderationWarning) {
        toast.warning('Submitted — held for moderation review');
      } else {
        toast.success('Question submitted — a leader will respond');
      }
      setForm({ question: '', category: 'FAITH', alias: 'Anonymous' });
      invalidate();
      setTab('mine');
    } catch {
      toast.error('Could not submit question');
    } finally {
      setSubmitting(false);
    }
  };

  const sendPrivateReply = async () => {
    if (!selected?.id || !privateReply.trim()) return;
    try {
      await api.post(`/youth/qa/questions/${selected.id}/reply`, {
        body: privateReply.trim(),
      });
      toast.success('Private reply sent');
      setPrivateReply('');
      invalidate();
    } catch {
      toast.error('Could not send reply');
    }
  };

  const publishAnswer = async () => {
    if (!selected?.id || !publicAnswer.trim()) return;
    try {
      await api.post(`/youth/qa/questions/${selected.id}/publish`, {
        body: publicAnswer.trim(),
      });
      toast.success('Published on public board');
      setPublicAnswer('');
      invalidate();
    } catch {
      toast.error('Could not publish');
    }
  };

  const hideQuestion = async (id: string) => {
    try {
      await api.patch(`/youth/qa/questions/${id}/hide`, {});
      toast.success('Question hidden');
      invalidate();
    } catch {
      toast.error('Could not hide');
    }
  };

  const restoreQuestion = async (id: string) => {
    try {
      await api.patch(`/youth/qa/questions/${id}/restore`, {});
      toast.success('Question restored');
      invalidate();
    } catch {
      toast.error('Could not restore');
    }
  };

  const tabs: { id: TabId; label: string; icon: typeof HelpCircle }[] = [
    { id: 'ask', label: 'Ask', icon: MessageCircleQuestion },
    { id: 'board', label: 'Public board', icon: Users },
    { id: 'mine', label: 'My questions', icon: Lock },
  ];
  if (leaderMode) {
    tabs.push({ id: 'leader', label: 'Leader queue', icon: Shield });
  }

  return (
    <>
      <PageHeader
        title="Anonymous Q&A"
        description="Ask faith and life questions safely. Leaders reply privately; approved answers appear on the public board."
        badge={
          <Link
            href={YOUTH_ROUTES.hub}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Youth hub
            </span>
          </Link>
        }
      />
      <div className="space-y-6 p-6 md:p-8">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={tab === t.id ? 'default' : 'outline'}
              onClick={() => setTab(t.id)}
            >
              <t.icon className="mr-1.5 h-3.5 w-3.5" />
              {t.label}
            </Button>
          ))}
        </div>

        {tab === 'ask' && (
          <Card className="border-indigo-200/50 bg-gradient-to-br from-indigo-50/40 to-background dark:from-indigo-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4 text-indigo-600" />
                Submit a question
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Your identity stays private on the public board. Leaders may reply only to you first.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitQuestion} className="space-y-3">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {QA_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Display alias (e.g. Anonymous)"
                  value={form.alias}
                  onChange={(e) => setForm({ ...form, alias: e.target.value })}
                />
                <textarea
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="What would you like to ask? (min 10 characters)"
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                />
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Submit anonymously
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {tab === 'board' && (
          <div className="space-y-4">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={boardCategory}
              onChange={(e) => setBoardCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {QA_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {board.isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {(board.data ?? []).map((q) => (
              <Card key={q.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{q.alias}</Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {QA_CATEGORIES.find((c) => c.value === q.category)?.label ?? q.category}
                    </Badge>
                  </div>
                  <p className="mt-2 font-medium">{q.question}</p>
                  {q.publicAnswer && (
                    <div className="mt-3 rounded-lg border border-emerald-200/50 bg-emerald-50/30 p-3 text-sm dark:bg-emerald-950/20">
                      <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Leader answer</p>
                      <p className="mt-1">{q.publicAnswer.body}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {!board.isLoading && !board.data?.length && (
              <p className="text-sm text-muted-foreground">No published answers yet.</p>
            )}
          </div>
        )}

        {tab === 'mine' && (
          <div className="space-y-3">
            {mine.isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {(mine.data ?? []).map((q) => (
              <Card key={q.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{QA_STATUS_LABELS[q.status] ?? q.status}</Badge>
                    {q.moderationFlag && <Badge variant="outline" className="border-destructive text-destructive">Moderation</Badge>}
                  </div>
                  <p className="mt-2 font-medium">{q.question}</p>
                  {q.answers
                    .filter((a) => !a.isPublic)
                    .map((a) => (
                      <div
                        key={a.id}
                        className="mt-3 rounded-lg border border-violet-200/50 bg-violet-50/30 p-3 text-sm dark:bg-violet-950/20"
                      >
                        <p className="text-xs font-medium text-violet-800 dark:text-violet-300">
                          Private reply from {a.author.firstName}
                        </p>
                        <p className="mt-1">{a.body}</p>
                      </div>
                    ))}
                  {q.status === 'PUBLIC' && q.publicAnswer && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Also published on the public board.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
            {!mine.isLoading && !mine.data?.length && (
              <p className="text-sm text-muted-foreground">
                No questions yet — use the Ask tab to submit one.
              </p>
            )}
          </div>
        )}

        {tab === 'leader' && leaderMode && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <select
                  className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                  value={queueStatus}
                  onChange={(e) => setQueueStatus(e.target.value)}
                >
                  <option value="">All open statuses</option>
                  {Object.entries(QA_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              {queue.isLoading && (
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
              )}
              {(queue.data ?? []).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(q.id);
                    setPublicAnswer(q.publicAnswer?.body ?? '');
                  }}
                  className={cn(
                    'w-full rounded-lg border px-3 py-3 text-left text-sm transition',
                    selected?.id === q.id && 'border-primary bg-primary/5',
                  )}
                >
                  <div className="flex justify-between gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {QA_STATUS_LABELS[q.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{q.alias}</span>
                  </div>
                  <p className="mt-1 line-clamp-2">{q.question}</p>
                </button>
              ))}
              {!queue.data?.length && (
                <p className="text-sm text-muted-foreground">Queue is empty.</p>
              )}

              {(hidden.data ?? []).length > 0 && (
                <Card className="border-destructive/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Moderation — hidden</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {hidden.data?.map((q) => (
                      <div key={q.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="line-clamp-1">{q.question}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 shrink-0"
                          onClick={() => restoreQuestion(q.id)}
                        >
                          Restore
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Respond</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selected ? (
                  <>
                    <p className="text-sm font-medium">{selected.question}</p>
                    <div>
                      <label className="text-xs text-muted-foreground">Private reply (asker only)</label>
                      <textarea
                        className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={privateReply}
                        onChange={(e) => setPrivateReply(e.target.value)}
                        placeholder="Encourage and guide privately…"
                      />
                      <Button type="button" size="sm" className="mt-2" onClick={sendPrivateReply}>
                        <Lock className="mr-1 h-3.5 w-3.5" />
                        Send private reply
                      </Button>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Public board answer</label>
                      <textarea
                        className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={publicAnswer}
                        onChange={(e) => setPublicAnswer(e.target.value)}
                        placeholder="Shareable answer (no private details)…"
                      />
                      <Button type="button" size="sm" variant="outline" className="mt-2" onClick={publishAnswer}>
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Publish to board
                      </Button>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => hideQuestion(selected.id)}
                    >
                      <EyeOff className="mr-1 h-3.5 w-3.5" />
                      Hide / moderate
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a question from the queue.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
