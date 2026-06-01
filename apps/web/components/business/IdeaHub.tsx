'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Lightbulb, Loader2, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface IdeaMessage {
  id: string;
  body: string;
  isStaff: boolean;
  createdAt: string;
  author: { firstName: string; lastName: string };
}

interface HubIdea {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  status: string;
  createdAt: string;
  member: { firstName: string; lastName: string };
  messages: IdeaMessage[];
}

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In review',
  ADVISING: 'Advising',
  RESOLVED: 'Resolved',
};

const STATUS_VARIANT: Record<string, 'outline' | 'gold' | 'success'> = {
  SUBMITTED: 'outline',
  IN_REVIEW: 'gold',
  ADVISING: 'gold',
  RESOLVED: 'success',
};

const CATEGORIES = ['Ministry', 'Business', 'Community', 'Technology', 'Education', 'Other'];

const IDEA_STATUSES = ['SUBMITTED', 'IN_REVIEW', 'ADVISING', 'RESOLVED'] as const;

export function IdeaHub() {
  const queryClient = useQueryClient();
  const { isChurchStaff } = useModuleAccess();
  const ideas = useApiQuery<HubIdea[]>(['hub-ideas'], '/business/ideas');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [replying, setReplying] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', category: 'Business' });
  const [replyById, setReplyById] = useState<Record<string, string>>({});

  const submitIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/business/ideas', form);
      toast.success('Idea submitted — a mentor will respond soon');
      setForm({ title: '', description: '', category: 'Business' });
      queryClient.invalidateQueries({ queryKey: ['hub-ideas'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not submit idea'));
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async (ideaId: string) => {
    const text = replyById[ideaId]?.trim();
    if (!text) return;
    setReplying(ideaId);
    try {
      await api.post(`/business/ideas/${ideaId}/messages`, { body: text });
      setReplyById((prev) => ({ ...prev, [ideaId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['hub-ideas'] });
      toast.success('Message sent');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not send message'));
    } finally {
      setReplying(null);
    }
  };

  return (
    <Card className="shadow-sm lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-secondary/15 p-2 text-secondary">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Idea Hub</CardTitle>
            <CardDescription>
              Share a vision or project idea and receive advice and support from church mentors and members.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={submitIdea} className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium">Submit your idea</p>
          <Input
            placeholder="Idea title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <textarea
            className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Describe your idea, goals, and what kind of support you need…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" disabled={submitting} className="shadow-brand">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
            Submit for advice
          </Button>
        </form>

        {ideas.isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {ideas.isError && (
          <p className="text-sm text-destructive">Could not load ideas — ensure the API is running.</p>
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Community ideas</p>
          {!ideas.isLoading && (ideas.data ?? []).length === 0 && !ideas.isError ? (
            <p className="text-sm text-muted-foreground">No ideas yet. Be the first to share one above.</p>
          ) : null}
          {!ideas.isLoading &&
            (ideas.data ?? []).map((idea) => {
              const open = expandedId === idea.id;
              return (
                <div key={idea.id} className="rounded-lg border border-border">
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-2 p-3 text-left"
                    onClick={() => setExpandedId(open ? null : idea.id)}
                  >
                    <div>
                      <p className="font-medium">{idea.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {idea.member.firstName} {idea.member.lastName}
                        {idea.category ? ` · ${idea.category}` : ''}
                      </p>
                    </div>
                    {isChurchStaff ? (
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        value={idea.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={async (e) => {
                          try {
                            await api.patch(`/business/ideas/${idea.id}/status`, { status: e.target.value });
                            queryClient.invalidateQueries({ queryKey: ['hub-ideas'] });
                            toast.success('Status updated');
                          } catch (err) {
                            toast.error(apiErrorMessage(err, 'Could not update status'));
                          }
                        }}
                      >
                        {IDEA_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s] ?? s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge variant={STATUS_VARIANT[idea.status] ?? 'outline'}>
                        {STATUS_LABELS[idea.status] ?? idea.status}
                      </Badge>
                    )}
                  </button>
                  {open && (
                    <div className="border-t border-border px-3 pb-3">
                      <p className="py-2 text-sm text-muted-foreground">{idea.description}</p>
                      <div className="space-y-2">
                        {idea.messages.map((m) => (
                          <div
                            key={m.id}
                            className={`rounded-md p-2 text-sm ${m.isStaff ? 'border border-primary/20 bg-primary/5' : 'bg-muted/40'}`}
                          >
                            <p className="text-xs font-medium text-muted-foreground">
                              {m.author.firstName} {m.author.lastName}
                              {m.isStaff ? ' · Mentor' : ''}
                            </p>
                            <p className="mt-0.5">{m.body}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Input
                          placeholder="Add encouragement or advice…"
                          value={replyById[idea.id] ?? ''}
                          onChange={(e) => setReplyById((prev) => ({ ...prev, [idea.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendReply(idea.id);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={replying === idea.id}
                          onClick={() => sendReply(idea.id)}
                        >
                          {replying === idea.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MessageSquare className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
