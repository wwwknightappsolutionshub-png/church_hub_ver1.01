'use client';

import { useState } from 'react';
import { Bell, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ReminderRow {
  id: string;
  title: string;
  body: string | null;
  remindAt: string;
  sentAt: string | null;
  branchId: string | null;
  userId: string | null;
}

interface BranchOption {
  id: string;
  name: string;
}

interface CellRemindersPanelProps {
  branches: BranchOption[];
}

export function CellRemindersPanel({ branches }: CellRemindersPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [branchId, setBranchId] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: reminders = [], isLoading, refetch } = useApiQuery<ReminderRow[]>(
    ['ministry-cells', 'reminders-all'],
    '/ministry-cells/reminders',
  );

  const branchName = (id: string | null) =>
    id ? branches.find((b) => b.id === id)?.name ?? 'Branch' : 'All branches';

  const createReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !remindAt) {
      toast.error('Title and date/time are required');
      return;
    }
    setBusy(true);
    try {
      await api.post('/ministry-cells/reminders', {
        title: title.trim(),
        body: body.trim() || undefined,
        remindAt: new Date(remindAt).toISOString(),
        branchId: branchId || undefined,
      });
      toast.success('Reminder scheduled');
      setTitle('');
      setBody('');
      setRemindAt('');
      setBranchId('');
      setShowForm(false);
      refetch();
    } catch {
      toast.error('Failed to schedule reminder');
    } finally {
      setBusy(false);
    }
  };

  const upcoming = reminders.filter((r) => !r.sentAt);
  const past = reminders.filter((r) => r.sentAt);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Bell className="h-4 w-4" />
          Reminders
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          Schedule
        </Button>
      </div>

      {showForm && (
        <form onSubmit={createReminder} className="space-y-3 rounded-md border border-border p-4">
          <div>
            <Label htmlFor="rem-title">Title</Label>
            <Input
              id="rem-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Weekly report due"
              required
            />
          </div>
          <div>
            <Label htmlFor="rem-body">Message (optional)</Label>
            <Textarea
              id="rem-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="rem-at">Remind at</Label>
              <Input
                id="rem-at"
                type="datetime-local"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="rem-branch">Branch (optional)</Label>
              <select
                id="rem-branch"
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">Church-wide</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              Schedule reminder
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Upcoming
            </p>
            <ul className="space-y-2">
              {upcoming.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border/60 p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{r.title}</p>
                    {r.body && <p className="text-muted-foreground">{r.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {branchName(r.branchId)} · {new Date(r.remindAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline">Scheduled</Badge>
                </li>
              ))}
              {upcoming.length === 0 && (
                <li className="text-sm text-muted-foreground">No upcoming reminders.</li>
              )}
            </ul>
          </div>
          {past.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sent
              </p>
              <ul className="space-y-2">
                {past.slice(0, 10).map((r) => (
                  <li
                    key={r.id}
                    className="rounded-md border border-border/40 p-2 text-sm text-muted-foreground"
                  >
                    {r.title} · {new Date(r.sentAt!).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
