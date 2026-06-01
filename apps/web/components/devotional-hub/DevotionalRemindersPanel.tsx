'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlarmClock, Bell, Check, Clock, Loader2, Mail, Moon } from 'lucide-react';
import { toast } from 'sonner';
import type {
  DevotionalPlanDto,
  DevotionalReminderChannel,
  DevotionalReminderDeliveryDto,
  DevotionalReminderFrequency,
  DevotionalReminderSyncDto,
} from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDevotionalReminderSync } from '@/lib/hooks/use-devotional-reminder-sync';
import {
  ensureNotificationPermission,
  isAlarmEnabled,
  setAlarmEnabled,
} from '@/lib/devotional-reminder-alarm';
import { DEVOTIONAL_QUERY_KEYS } from '@/lib/devotional-hub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PaginatedPlans {
  items: DevotionalPlanDto[];
}

const CHANNELS: Array<{
  channel: DevotionalReminderChannel;
  label: string;
  icon: typeof Bell;
}> = [
  { channel: 'IN_APP', label: 'In-app', icon: Bell },
  { channel: 'EMAIL', label: 'Email', icon: Mail },
  { channel: 'ALARM', label: 'Device alarm', icon: AlarmClock },
];

export function DevotionalRemindersPanel() {
  const queryClient = useQueryClient();
  const { refresh } = useDevotionalReminderSync(true);
  const [saving, setSaving] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [frequency, setFrequency] = useState<DevotionalReminderFrequency>('DAILY');
  const [hourLocal, setHourLocal] = useState(7);
  const [minuteLocal, setMinuteLocal] = useState(0);
  const [timezone, setTimezone] = useState(
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  );
  const [quietStart, setQuietStart] = useState(22);
  const [quietEnd, setQuietEnd] = useState(7);
  const [channelEnabled, setChannelEnabled] = useState<Record<DevotionalReminderChannel, boolean>>({
    IN_APP: true,
    EMAIL: false,
    PUSH: false,
    ALARM: true,
  });

  const plans = useApiQuery<PaginatedPlans>(
    DEVOTIONAL_QUERY_KEYS.plans(),
    '/devotional-hub/plans?limit=30&activeOnly=true',
  );

  const sync = useApiQuery<DevotionalReminderSyncDto>(
    ['devotional-reminder-sync'],
    '/devotional-hub/reminders/sync',
    { refetchInterval: 60_000 },
  );

  useEffect(() => {
    if (sync.data?.preferences) {
      setTimezone(sync.data.preferences.timezone);
      setQuietStart(sync.data.preferences.quietStartHour);
      setQuietEnd(sync.data.preferences.quietEndHour);
    }
    if (!selectedPlanId && plans.data?.items?.[0]?.id) {
      setSelectedPlanId(plans.data.items[0].id);
    }
  }, [sync.data, plans.data, selectedPlanId]);

  const pending = sync.data?.pendingDeliveries ?? [];
  const snoozePresets = sync.data?.snoozePresets ?? [10, 30, 60];

  const savePreferences = async () => {
    setSaving(true);
    try {
      await api.put('/devotional-hub/reminders/preferences', {
        timezone,
        quietStartHour: quietStart,
        quietEndHour: quietEnd,
      });
      toast.success('Quiet hours & timezone saved');
      queryClient.invalidateQueries({ queryKey: ['devotional-reminder-sync'] });
      void refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save preferences'));
    } finally {
      setSaving(false);
    }
  };

  const savePlanReminders = async () => {
    if (!selectedPlanId) {
      toast.error('Select a plan');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/devotional-hub/reminders/plans/${selectedPlanId}`, {
        frequency,
        timezone,
        channels: CHANNELS.filter((c) => channelEnabled[c.channel]).map((c) => ({
          channel: c.channel,
          isEnabled: true,
          hourLocal,
          minuteLocal,
        })),
      });
      toast.success('Plan reminders updated');
      queryClient.invalidateQueries({ queryKey: ['devotional-reminder-sync'] });
      void refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save plan reminders'));
    } finally {
      setSaving(false);
    }
  };

  const snoozeDelivery = async (deliveryId: string, minutes: number) => {
    try {
      await api.post(`/devotional-hub/reminders/deliveries/${deliveryId}/snooze`, { minutes });
      toast.success(`Snoozed ${minutes} min`);
      queryClient.invalidateQueries({ queryKey: ['devotional-reminder-sync'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Snooze failed'));
    }
  };

  const markDone = async (delivery: DevotionalReminderDeliveryDto) => {
    try {
      await api.post(`/devotional-hub/reminders/deliveries/${delivery.id}/done`);
      toast.success('Marked as done');
      queryClient.invalidateQueries({ queryKey: ['devotional-reminder-sync'] });
      if (delivery.planId) {
        queryClient.invalidateQueries({
          queryKey: DEVOTIONAL_QUERY_KEYS.progress(delivery.planId),
        });
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not mark done'));
    }
  };

  const enableAlarms = async () => {
    const ok = await ensureNotificationPermission();
    if (ok) toast.success('Notifications enabled for device alarms');
    else toast.error('Enable notifications in browser settings');
  };

  const planTitle = useMemo(
    () => plans.data?.items.find((p) => p.id === selectedPlanId)?.title ?? 'Plan',
    [plans.data, selectedPlanId],
  );

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <Card className="border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Active reminders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((d) => (
              <div
                key={d.id}
                className="flex flex-col gap-2 rounded-md border bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-sm">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.body}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {d.channel.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {snoozePresets.map((m) => (
                    <Button
                      key={m}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => snoozeDelivery(d.id, m)}
                    >
                      {m}m
                    </Button>
                  ))}
                  <Button type="button" size="sm" onClick={() => markDone(d)}>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Done
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Moon className="h-4 w-4" />
            Quiet hours & timezone
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Timezone</Label>
            <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Quiet from (hour 0–23)</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={quietStart}
              onChange={(e) => setQuietStart(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="space-y-2">
            <Label>Quiet until (hour)</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={quietEnd}
              onChange={(e) => setQuietEnd(parseInt(e.target.value, 10))}
            />
          </div>
          <Button variant="outline" onClick={savePreferences} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save global settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Per-plan reminders — {planTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Devotional plan</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              {(plans.data?.items ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={frequency === 'DAILY'}
                onChange={() => setFrequency('DAILY')}
              />
              Daily
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={frequency === 'HOURLY'}
                onChange={() => setFrequency('HOURLY')}
              />
              Hourly
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{frequency === 'HOURLY' ? 'Minute each hour' : 'Hour (0–23)'}</Label>
              <Input
                type="number"
                min={frequency === 'HOURLY' ? 0 : 0}
                max={frequency === 'HOURLY' ? 59 : 23}
                value={frequency === 'HOURLY' ? minuteLocal : hourLocal}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (frequency === 'HOURLY') setMinuteLocal(v);
                  else setHourLocal(v);
                }}
              />
            </div>
            {frequency === 'DAILY' && (
              <div className="space-y-2">
                <Label>Minute</Label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={minuteLocal}
                  onChange={(e) => setMinuteLocal(parseInt(e.target.value, 10))}
                />
              </div>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {CHANNELS.map(({ channel, label, icon: Icon }) => (
              <button
                key={channel}
                type="button"
                onClick={() =>
                  setChannelEnabled((prev) => ({ ...prev, [channel]: !prev[channel] }))
                }
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition',
                  channelEnabled[channel]
                    ? 'border-primary bg-primary/5'
                    : 'border-border opacity-60',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={savePlanReminders} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save plan reminders
            </Button>
            <Button type="button" variant="outline" onClick={enableAlarms}>
              Enable browser notifications
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = !isAlarmEnabled();
                setAlarmEnabled(next);
                toast.message(next ? 'Alarm sound on' : 'Alarm sound off');
              }}
            >
              Alarm sound: {isAlarmEnabled() ? 'On' : 'Off'}
            </Button>
          </div>

          {sync.data && (
            <p className="text-xs text-muted-foreground">
              Synced across devices · version {sync.data.syncVersion} ·{' '}
              {sync.data.reminders.filter((r) => r.isEnabled).length} active channel(s)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
