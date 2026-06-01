'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HeartHandshake, Loader2, Lock, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { HELP_CATEGORIES, HELP_STATUS_LABELS } from '@/lib/youth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface HelpResponse {
  id: string;
  body: string;
  createdAt: string;
  author: { firstName: string; lastName: string };
}

interface HelpRequest {
  id: string;
  message: string;
  category: string;
  status: string;
  isAnonymous: boolean;
  alias?: string | null;
  createdAt: string;
  assignedTo?: { firstName: string; lastName: string } | null;
  responses: HelpResponse[];
}

export function YouthHelpPanel() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const listUrl = statusFilter ? `/youth/help?status=${statusFilter}` : '/youth/help';
  const requests = useApiQuery<HelpRequest[]>(['youth-help', statusFilter], listUrl);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [submitForm, setSubmitForm] = useState({ message: '', category: 'OTHER', alias: 'Anonymous' });
  const [submitting, setSubmitting] = useState(false);

  const selected = (requests.data ?? []).find((r) => r.id === selectedId) ?? requests.data?.[0];

  const submitAnonymous = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitForm.message.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/youth/help', {
        message: submitForm.message.trim(),
        category: submitForm.category,
        isAnonymous: true,
        alias: submitForm.alias || 'Anonymous',
      });
      toast.success('Help request submitted — a leader will respond confidentially');
      setSubmitForm({ message: '', category: 'OTHER', alias: 'Anonymous' });
      queryClient.invalidateQueries({ queryKey: ['youth-help'] });
      queryClient.invalidateQueries({ queryKey: ['youth-stats'] });
    } catch {
      toast.error('Could not submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const respond = async () => {
    if (!selected?.id || !reply.trim()) return;
    try {
      await api.post(`/youth/help/${selected.id}/respond`, { body: reply.trim() });
      toast.success('Response sent');
      setReply('');
      queryClient.invalidateQueries({ queryKey: ['youth-help'] });
    } catch {
      toast.error('Could not send response');
    }
  };

  const resolve = async (id: string) => {
    try {
      await api.post(`/youth/help/${id}/resolve`);
      toast.success('Request resolved');
      queryClient.invalidateQueries({ queryKey: ['youth-help'] });
      queryClient.invalidateQueries({ queryKey: ['youth-stats'] });
    } catch {
      toast.error('Could not resolve');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-rose-100/80 bg-gradient-to-br from-rose-50/40 to-background dark:from-rose-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-rose-600" />
            Anonymous Help Zone
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Youth can request counsel without revealing identity. Leaders see requests in the queue.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitAnonymous} className="space-y-3">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={submitForm.category}
              onChange={(e) => setSubmitForm({ ...submitForm, category: e.target.value })}
            >
              {HELP_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <Input
              placeholder="Display alias (optional)"
              value={submitForm.alias}
              onChange={(e) => setSubmitForm({ ...submitForm, alias: e.target.value })}
            />
            <textarea
              className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="What would you like help with?"
              value={submitForm.message}
              onChange={(e) => setSubmitForm({ ...submitForm, message: e.target.value })}
              required
            />
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit anonymously
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {Object.entries(HELP_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {requests.isLoading ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="space-y-2 lg:col-span-2">
              {(requests.data ?? []).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    (selected?.id === r.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.isAnonymous ? r.alias ?? 'Anonymous' : 'Identified'}</span>
                    <Badge variant="outline" className="text-xs">
                      {HELP_STATUS_LABELS[r.status] ?? r.status}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.message}</p>
                </button>
              ))}
            </div>

            {selected && (
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HeartHandshake className="h-4 w-4" />
                    {selected.category.replace('_', ' ')}
                  </CardTitle>
                  <p className="text-sm">{selected.message}</p>
                  {selected.assignedTo && (
                    <p className="text-xs text-muted-foreground">
                      Assigned: {selected.assignedTo.firstName} {selected.assignedTo.lastName}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="max-h-40 space-y-2 overflow-y-auto text-sm">
                    {selected.responses.map((res) => (
                      <div key={res.id} className="rounded bg-muted/40 px-3 py-2">
                        <p className="text-xs font-medium">
                          {res.author.firstName} {res.author.lastName} · {new Date(res.createdAt).toLocaleString()}
                        </p>
                        <p>{res.body}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Pastoral response…" value={reply} onChange={(e) => setReply(e.target.value)} />
                    <Button onClick={respond}>Reply</Button>
                  </div>
                  {selected.status !== 'RESOLVED' && (
                    <Button variant="outline" size="sm" onClick={() => resolve(selected.id)}>
                      Mark resolved
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
