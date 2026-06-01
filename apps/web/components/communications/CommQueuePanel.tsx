'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface QueueItem {
  id: string;
  kind: string;
  status: string;
  title: string;
  body: string;
  channels: string[];
  scheduledAt: string;
  sentAt?: string | null;
  serviceUnit?: { name: string } | null;
}

export function CommQueuePanel() {
  const queryClient = useQueryClient();
  const { data: queue, isLoading } = useApiQuery<QueueItem[]>(
    ['comm-queue'],
    '/communications/queue',
  );
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: '',
    body: '',
    channels: { inApp: true, email: false, whatsapp: false },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    const channels: string[] = [];
    if (form.channels.inApp) channels.push('IN_APP');
    if (form.channels.email) channels.push('EMAIL');
    if (form.channels.whatsapp) channels.push('WHATSAPP');
    if (!channels.length) {
      toast.error('Select at least one channel');
      return;
    }
    setBusy(true);
    try {
      await api.post('/communications/queue', {
        title: form.title,
        body: form.body,
        channels,
        kind: 'BROADCAST',
      });
      toast.success('Queued for delivery');
      setForm({ title: '', body: '', channels: { inApp: true, email: false, whatsapp: false } });
      queryClient.invalidateQueries({ queryKey: ['comm-queue'] });
      queryClient.invalidateQueries({ queryKey: ['comm-stats'] });
    } catch {
      toast.error('Could not enqueue');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enqueue notification</CardTitle>
          <CardDescription>
            Durable queue delivers in-app alerts, email, and WhatsApp (phone channel is WhatsApp-only).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <Input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <textarea
              className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Message body"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              required
            />
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.channels.inApp}
                  onChange={(e) =>
                    setForm({ ...form, channels: { ...form.channels, inApp: e.target.checked } })
                  }
                />
                In-app
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.channels.email}
                  onChange={(e) =>
                    setForm({ ...form, channels: { ...form.channels, email: e.target.checked } })
                  }
                />
                Email
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.channels.whatsapp}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      channels: { ...form.channels, whatsapp: e.target.checked },
                    })
                  }
                />
                WhatsApp
              </label>
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              Add to queue
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row justify-between">
          <CardTitle className="text-base">Delivery queue</CardTitle>
          <Badge variant="outline">{queue?.length ?? 0}</Badge>
        </CardHeader>
        <CardContent className="max-h-96 space-y-2 overflow-y-auto">
          {isLoading && <Loader2 className="mx-auto h-6 w-6 animate-spin" />}
          {(queue ?? []).map((item) => (
            <div key={item.id} className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between gap-2">
                <p className="font-medium">{item.title}</p>
                <Badge variant={item.status === 'SENT' ? 'success' : 'outline'}>{item.status}</Badge>
              </div>
              <p className="mt-1 text-muted-foreground line-clamp-2">{item.body}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {item.kind}
                {item.serviceUnit ? ` · ${item.serviceUnit.name}` : ''} · {item.channels.join(', ')}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
