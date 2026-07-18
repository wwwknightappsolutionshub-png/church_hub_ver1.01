'use client';

import { useState } from 'react';
import { Lightbulb, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TOPICS = [
  { value: 'CHURCH_SERVICE', label: 'Church service' },
  { value: 'EVANGELISM', label: 'Evangelism' },
  { value: 'MEMBERSHIP', label: 'Membership' },
  { value: 'GRIEVANCE', label: 'Grievance' },
  { value: 'OTHER', label: 'Other' },
] as const;

type TopicValue = (typeof TOPICS)[number]['value'];

type SuggestionRow = {
  id: string;
  topic: TopicValue;
  topicLabel: string;
  subject: string | null;
  body: string;
  createdAt: string;
};

export default function SuggestionsPage() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState<TopicValue>('CHURCH_SERVICE');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const { data: mine = [], refetch } = useApiQuery<SuggestionRow[]>(
    ['suggestions-mine'],
    '/suggestions/mine',
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      toast.error('Please write your comment or suggestion');
      return;
    }
    setBusy(true);
    try {
      await api.post('/suggestions', {
        topic,
        subject: subject.trim() || undefined,
        body: body.trim(),
      });
      toast.success(
        "Thank you for your suggestion, this is well recieved and we'd work on the points raised",
      );
      setSubject('');
      setBody('');
      setTopic('CHURCH_SERVICE');
      setOpen(false);
      await refetch();
    } catch (err) {
      toast.error(apiErrorMessage(err as AxiosError, 'Could not submit suggestion'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardModuleShell
      eyebrow="Community"
      title="Suggestions"
      description={MODULE_DESCRIPTIONS.suggestions}
    >
      <div className="space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4" />
              Share a suggestion
            </CardTitle>
            <CardDescription>
              Use this module to share feedback on church service, evangelism, membership,
              grievances, or other church matters. Leadership reviews submissions and follows up on
              the points raised.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!open ? (
              <Button type="button" onClick={() => setOpen(true)} className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Suggestions
              </Button>
            ) : (
              <form onSubmit={submit} className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                <div>
                  <Label htmlFor="suggestion-topic">Topic</Label>
                  <select
                    id="suggestion-topic"
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value as TopicValue)}
                    required
                  >
                    {TOPICS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="suggestion-subject">Subject (optional)</Label>
                  <Input
                    id="suggestion-subject"
                    className="mt-1"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief headline"
                    maxLength={120}
                  />
                </div>
                <div>
                  <Label htmlFor="suggestion-body">Your comments</Label>
                  <textarea
                    id="suggestion-body"
                    className="mt-1 min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Share your thoughts, ideas, or concerns…"
                    required
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={busy} className="gap-2">
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Submit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your recent submissions</CardTitle>
            <CardDescription>A record of suggestions you have sent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mine.length === 0 ? (
              <p className="text-sm text-muted-foreground">No suggestions submitted yet.</p>
            ) : (
              mine.map((row) => (
                <article
                  key={row.id}
                  className="rounded-lg border border-border/60 px-3 py-2.5 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {row.topicLabel}
                    </Badge>
                    <p className="font-medium">{row.subject || row.topicLabel}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{row.body}</p>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardModuleShell>
  );
}
