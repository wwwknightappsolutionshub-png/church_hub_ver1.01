'use client';

import { useState } from 'react';
import { Bell, Bus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ServiceUnit {
  id: string;
  name: string;
}

export function CommAutomationsPanel() {
  const [busy, setBusy] = useState<string | null>(null);
  const units = useApiQuery<ServiceUnit[]>(['service-units-list'], '/service-units');
  const [deptForm, setDeptForm] = useState({
    serviceUnitId: '',
    title: '',
    body: '',
    whatsapp: false,
  });

  const runAbsentee = async () => {
    setBusy('absentee');
    try {
      const { data } = await api.post<{ enqueued: number }>(
        '/communications/automation/absentee-followup',
      );
      toast.success(`Queued ${data.enqueued} absentee follow-up message(s)`);
    } catch {
      toast.error('Automation failed');
    } finally {
      setBusy(null);
    }
  };

  const runReminders = async () => {
    setBusy('reminders');
    try {
      const { data } = await api.post<{ enqueued: number; services: string[] }>(
        '/communications/automation/service-reminders',
      );
      toast.success(
        data.enqueued
          ? `Service reminders queued for: ${data.services?.join(', ') ?? 'services'}`
          : 'No services scheduled for tomorrow',
      );
    } catch {
      toast.error('Could not run reminders');
    } finally {
      setBusy(null);
    }
  };

  const deptBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.serviceUnitId || !deptForm.title.trim()) return;
    setBusy('dept');
    try {
      await api.post('/communications/broadcast/department', {
        serviceUnitId: deptForm.serviceUnitId,
        title: deptForm.title,
        body: deptForm.body,
        channels: deptForm.whatsapp
          ? ['IN_APP', 'EMAIL', 'WHATSAPP']
          : ['IN_APP', 'EMAIL'],
      });
      toast.success('Department broadcast queued');
      setDeptForm({ serviceUnitId: '', title: '', body: '', whatsapp: false });
    } catch {
      toast.error('Broadcast failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Absentee follow-up</CardTitle>
          <CardDescription>
            Auto-message members who attended last week but were absent this week (in-app, email,
            WhatsApp).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runAbsentee} disabled={busy === 'absentee'}>
            {busy === 'absentee' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="mr-1.5 h-4 w-4" />}
            Run absentee detection
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service reminders</CardTitle>
          <CardDescription>
            Queue reminders for church services scheduled tomorrow (from service catalog).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runReminders} disabled={busy === 'reminders'}>
            {busy === 'reminders' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="mr-1.5 h-4 w-4" />}
            Send tomorrow&apos;s service reminders
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Department-wide broadcast</CardTitle>
          <CardDescription>
            Message all members of a service unit via the notification queue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={deptBroadcast} className="space-y-3">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={deptForm.serviceUnitId}
              onChange={(e) => setDeptForm({ ...deptForm, serviceUnitId: e.target.value })}
              required
            >
              <option value="">Select department / service unit</option>
              {(units.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Title"
              value={deptForm.title}
              onChange={(e) => setDeptForm({ ...deptForm, title: e.target.value })}
              required
            />
            <Textarea
              placeholder="Message"
              value={deptForm.body}
              onChange={(e) => setDeptForm({ ...deptForm, body: e.target.value })}
              required
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={deptForm.whatsapp}
                onChange={(e) => setDeptForm({ ...deptForm, whatsapp: e.target.checked })}
              />
              Include WhatsApp
            </label>
            <Button type="submit" disabled={busy === 'dept'}>
              {busy === 'dept' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bus className="mr-1.5 h-4 w-4" />}
              Queue department broadcast
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
