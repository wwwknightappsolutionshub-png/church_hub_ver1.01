'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface InAppMessage {
  id: string;
  subject?: string | null;
  body: string;
  readAt?: string | null;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string };
  recipient: { id: string; firstName: string; lastName: string };
}

interface Recipient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function CommInboxPanel() {
  const { canManageCommunications } = useModuleAccess();
  const queryClient = useQueryClient();
  const [box, setBox] = useState<'inbox' | 'sent'>('inbox');
  const messages = useApiQuery<InAppMessage[]>(['comm-inbox', box], `/communications/messages?box=${box}`);
  const recipients = useApiQuery<Recipient[]>(
    ['comm-recipients'],
    '/communications/messages/recipients',
    { enabled: canManageCommunications },
  );
  const [form, setForm] = useState({ recipientId: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recipientId || !form.body.trim()) return;
    setSending(true);
    try {
      await api.post('/communications/messages', form);
      toast.success('Message sent');
      setForm({ recipientId: '', subject: '', body: '' });
      setShowCompose(false);
      queryClient.invalidateQueries({ queryKey: ['comm-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['comm-stats'] });
    } catch {
      toast.error('Could not send message');
    } finally {
      setSending(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/communications/messages/${id}/read`);
      queryClient.invalidateQueries({ queryKey: ['comm-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['comm-stats'] });
    } catch {
      toast.error('Could not mark as read');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={box === 'inbox' ? 'default' : 'outline'} onClick={() => setBox('inbox')}>
          Inbox
        </Button>
        <Button size="sm" variant={box === 'sent' ? 'default' : 'outline'} onClick={() => setBox('sent')}>
          Sent
        </Button>
        {canManageCommunications && (
          <Button size="sm" className="ml-auto" onClick={() => setShowCompose((v) => !v)}>
            <Send className="mr-1.5 h-4 w-4" />
            Compose
          </Button>
        )}
      </div>

      {canManageCommunications && showCompose && (
        <Card>
          <CardContent className="grid gap-3 pt-6">
            <form onSubmit={send} className="space-y-3">
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.recipientId}
                onChange={(e) => setForm({ ...form, recipientId: e.target.value })}
                required
              >
                <option value="">Recipient…</option>
                {(recipients.data ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.firstName} {r.lastName} ({r.email})
                  </option>
                ))}
              </select>
              <Input placeholder="Subject (optional)" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              <textarea
                className="min-h-[100px] w-full rounded-md border border-input px-3 py-2 text-sm"
                placeholder="Message…"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                required
              />
              <Button type="submit" disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {messages.isLoading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
      ) : (
        <div className="space-y-3">
          {(messages.data ?? []).map((m) => {
            const other = box === 'inbox' ? m.sender : m.recipient;
            return (
              <Card key={m.id} className={!m.readAt && box === 'inbox' ? 'border-primary/40' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4" />
                      {m.subject || '(No subject)'}
                    </CardTitle>
                    {!m.readAt && box === 'inbox' && <Badge variant="gold">Unread</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {box === 'inbox' ? 'From' : 'To'} {other.firstName} {other.lastName} · {new Date(m.createdAt).toLocaleString()}
                  </p>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>{m.body}</p>
                  {!m.readAt && box === 'inbox' && (
                    <Button size="sm" variant="outline" className="mt-3 h-7 text-xs" onClick={() => markRead(m.id)}>
                      Mark read
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {!messages.data?.length && <p className="text-center text-sm text-muted-foreground">No messages.</p>}
        </div>
      )}
    </div>
  );
}
