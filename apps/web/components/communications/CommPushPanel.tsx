'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Loader2, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt?: string | null;
  sentAt: string;
}

export function CommPushPanel() {
  const { canManageCommunications } = useModuleAccess();
  const queryClient = useQueryClient();
  const notificationsUrl = canManageCommunications
    ? '/communications/notifications'
    : '/communications/notifications?mine=true';
  const notifications = useApiQuery<NotificationRecord[]>(
    ['comm-notifications', canManageCommunications ? 'all' : 'mine'],
    notificationsUrl,
  );
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    title: '',
    body: '',
    sendPush: true,
    sendEmail: false,
    sendWhatsApp: false,
    type: 'BROADCAST',
  });

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    if (!form.sendPush && !form.sendEmail && !form.sendWhatsApp) {
      toast.error('Select at least one channel');
      return;
    }
    setSending(true);
    try {
      if (form.sendWhatsApp) {
        const channels: string[] = [];
        if (form.sendPush) channels.push('IN_APP');
        if (form.sendEmail) channels.push('EMAIL');
        channels.push('WHATSAPP');
        await api.post('/communications/queue', {
          title: form.title,
          body: form.body,
          channels,
          kind: form.type,
        });
        toast.success('Broadcast queued (in-app, email, WhatsApp)');
        setForm({ title: '', body: '', sendPush: true, sendEmail: false, sendWhatsApp: false, type: 'BROADCAST' });
        queryClient.invalidateQueries({ queryKey: ['comm-queue'] });
        queryClient.invalidateQueries({ queryKey: ['comm-stats'] });
        return;
      }
      const { data } = await api.post<{ pushCount: number; emailCount: number }>('/communications/notifications', form);
      const parts: string[] = [];
      if (data.pushCount) parts.push(`${data.pushCount} push`);
      if (data.emailCount) parts.push(`${data.emailCount} email`);
      toast.success(`Sent: ${parts.join(' · ')}`);
      setForm({ title: '', body: '', sendPush: true, sendEmail: false, sendWhatsApp: false, type: 'BROADCAST' });
      queryClient.invalidateQueries({ queryKey: ['comm-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['comm-stats'] });
    } catch {
      toast.error('Could not send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {canManageCommunications ? (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Push notification composer</CardTitle>
          <CardDescription>Broadcast in-app push and optional email to all church members.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={sendNotification} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="push-title">Title</Label>
              <Input id="push-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="push-body">Message</Label>
              <textarea
                id="push-body"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                required
              />
            </div>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="BROADCAST">Broadcast</option>
              <option value="REMINDER">Reminder</option>
              <option value="EVENT">Event</option>
              <option value="PASTORAL">Pastoral</option>
            </select>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.sendPush} onChange={(e) => setForm({ ...form, sendPush: e.target.checked })} />
                <Bell className="h-4 w-4" /> In-app push
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.sendEmail} onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })} />
                <Mail className="h-4 w-4" /> Email
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.sendWhatsApp}
                  onChange={(e) => setForm({ ...form, sendWhatsApp: e.target.checked })}
                />
                WhatsApp (queued)
              </label>
            </div>
            <Button type="submit" disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              Send notification
            </Button>
          </form>
        </CardContent>
      </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Push broadcasts are managed by your church admin or pastor. Below are notifications sent to you.
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-row justify-between">
          <CardTitle className="text-base">{canManageCommunications ? 'Delivery log' : 'Your notifications'}</CardTitle>
          <Badge variant="outline">{notifications.data?.length ?? 0}</Badge>
        </CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-y-auto">
          {(notifications.data ?? []).slice(0, 20).map((n) => (
            <div key={n.id} className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between gap-2">
                <p className="font-medium">{n.title}</p>
                <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
              </div>
              <p className="mt-1 text-muted-foreground line-clamp-2">{n.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(n.sentAt).toLocaleString()}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
