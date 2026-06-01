'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Loader2, Plus, SkipForward, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DevotionalActionPointDto } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function DevotionalActionPointsPanel() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [frequency, setFrequency] = useState<'HOURLY' | 'DAILY'>('DAILY');
  const [hourLocal, setHourLocal] = useState(9);
  const [minuteLocal, setMinuteLocal] = useState(0);
  const [busy, setBusy] = useState(false);

  const list = useApiQuery<DevotionalActionPointDto[]>(
    ['devotional-action-points'],
    '/devotional-hub/action-points',
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['devotional-action-points'] });

  const create = async () => {
    if (!title.trim()) {
      toast.error('Enter an action point');
      return;
    }
    setBusy(true);
    try {
      await api.post('/devotional-hub/action-points', {
        title,
        notes: notes || undefined,
        remindersEnabled,
        reminderFrequency: remindersEnabled ? frequency : undefined,
        reminderChannels: remindersEnabled ? ['IN_APP', 'EMAIL'] : undefined,
        reminderHourLocal: hourLocal,
        reminderMinuteLocal: minuteLocal,
        reminderTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      toast.success('Action point added');
      setTitle('');
      setNotes('');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create action point'));
    } finally {
      setBusy(false);
    }
  };

  const complete = async (id: string) => {
    try {
      await api.post(`/devotional-hub/action-points/${id}/complete`);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['devotional-weekly-review'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not mark complete'));
    }
  };

  const skip = async (id: string) => {
    try {
      await api.post(`/devotional-hub/action-points/${id}/skip`);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['devotional-weekly-review'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not skip'));
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/devotional-hub/action-points/${id}`);
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete'));
    }
  };

  const pending = (list.data ?? []).filter((a) => a.status === 'PENDING');
  const done = (list.data ?? []).filter((a) => a.status !== 'PENDING');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your action points</CardTitle>
          <p className="text-sm text-muted-foreground">
            Personal steps from your devotional — with optional hourly or daily reminders.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>What will you do?</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Text my accountability partner" />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={remindersEnabled}
              onChange={(e) => setRemindersEnabled(e.target.checked)}
            />
            <Bell className="h-4 w-4" />
            Remind me (in-app + email)
          </label>
          {remindersEnabled && (
            <div className="grid gap-2 sm:grid-cols-3">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'HOURLY' | 'DAILY')}
              >
                <option value="DAILY">Daily</option>
                <option value="HOURLY">Hourly</option>
              </select>
              <Input
                type="number"
                min={0}
                max={23}
                value={hourLocal}
                onChange={(e) => setHourLocal(Number(e.target.value))}
                title="Hour (daily)"
              />
              <Input
                type="number"
                min={0}
                max={59}
                value={minuteLocal}
                onChange={(e) => setMinuteLocal(Number(e.target.value))}
                title="Minute"
              />
            </div>
          )}
          <Button onClick={create} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add action point
          </Button>
        </CardContent>
      </Card>

      {list.isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">To do</h3>
          {pending.map((a) => (
            <ActionRow key={a.id} item={a} onComplete={complete} onSkip={skip} onDelete={remove} />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Done / skipped</h3>
          {done.map((a) => (
            <ActionRow key={a.id} item={a} onComplete={complete} onSkip={skip} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionRow({
  item,
  onComplete,
  onSkip,
  onDelete,
}: {
  item: DevotionalActionPointDto;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm',
        item.status === 'COMPLETED' && 'border-emerald-200/60 bg-emerald-50/20',
        item.status === 'SKIPPED' && 'opacity-70',
      )}
    >
      <div>
        <p className="font-medium">{item.title}</p>
        {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
        <div className="mt-1 flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[10px]">
            {item.status}
          </Badge>
          {item.remindersEnabled && (
            <Badge variant="secondary" className="text-[10px]">
              {item.reminderFrequency} reminders
            </Badge>
          )}
        </div>
      </div>
      {item.status === 'PENDING' && (
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="outline" onClick={() => onComplete(item.id)}>
            <Check className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onSkip(item.id)}>
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(item.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
}
