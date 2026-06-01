'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, MessageSquare, Plus, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Channel {
  id: string;
  name: string;
  description?: string | null;
  channelType: string;
  isModerated: boolean;
  youthGroup?: { name: string } | null;
  serviceUnit?: { name: string } | null;
  _count?: { messages: number };
}

interface ChatMessage {
  id: string;
  content: string;
  isHidden: boolean;
  isFlagged: boolean;
  flagReason?: string | null;
  createdAt: string;
  sender: { firstName: string; lastName: string };
}

interface FlaggedMessage extends ChatMessage {
  channel: { name: string; channelType: string };
}

export function CommChannelsPanel() {
  const { canManageCommunications } = useModuleAccess();
  const queryClient = useQueryClient();
  const channels = useApiQuery<Channel[]>(['comm-channels'], '/communications/channels');
  const flagged = useApiQuery<FlaggedMessage[]>(
    ['comm-flagged'],
    '/communications/messages/flagged',
    { enabled: canManageCommunications },
  );
  const [activeChannel, setActiveChannel] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [moderatorView, setModeratorView] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', channelType: 'CHURCH' });
  const [sending, setSending] = useState(false);

  const messages = useApiQuery<ChatMessage[]>(
    ['comm-channel-messages', activeChannel, String(moderatorView)],
    `/communications/channels/${activeChannel}/messages${moderatorView ? '?moderator=true' : ''}`,
    { enabled: !!activeChannel },
  );

  const createChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await api.post('/communications/channels', form);
      toast.success('Channel created');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['comm-channels'] });
      queryClient.invalidateQueries({ queryKey: ['comm-stats'] });
    } catch {
      toast.error('Could not create channel');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChannel || !newMessage.trim()) return;
    setSending(true);
    try {
      const res = await api.post<{ isFlagged?: boolean }>(`/communications/channels/${activeChannel}/messages`, {
        content: newMessage.trim(),
      });
      if (res.data?.isFlagged) toast.warning('Message auto-flagged');
      else toast.success('Posted');
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['comm-channel-messages', activeChannel] });
      queryClient.invalidateQueries({ queryKey: ['comm-flagged'] });
    } catch {
      toast.error('Could not post');
    } finally {
      setSending(false);
    }
  };

  const moderate = async (messageId: string, isHidden: boolean) => {
    try {
      await api.patch(`/communications/chat-messages/${messageId}/moderate`, { isHidden });
      queryClient.invalidateQueries({ queryKey: ['comm-channel-messages'] });
      queryClient.invalidateQueries({ queryKey: ['comm-flagged'] });
    } catch {
      toast.error('Moderation failed');
    }
  };

  const typeLabel: Record<string, string> = { CHURCH: 'Church', YOUTH: 'Youth', SERVICE_UNIT: 'Service unit' };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-1">
        {canManageCommunications && (
          <Button size="sm" className="w-full" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New channel
          </Button>
        )}
        {canManageCommunications && showForm && (
          <Card>
            <CardContent className="pt-4">
              <form onSubmit={createChannel} className="space-y-2">
                <Input placeholder="Channel name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.channelType}
                  onChange={(e) => setForm({ ...form, channelType: e.target.value })}
                >
                  <option value="CHURCH">Church-wide</option>
                  <option value="SERVICE_UNIT">Service unit (link via API)</option>
                </select>
                <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <Button type="submit" size="sm" className="w-full">Create</Button>
              </form>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Channels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(channels.data ?? []).map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${activeChannel === ch.id ? 'border-primary bg-primary/5' : ''}`}
              >
                <p className="font-medium">{ch.name}</p>
                <p className="text-xs text-muted-foreground">
                  {typeLabel[ch.channelType] ?? ch.channelType} · {ch._count?.messages ?? 0} msgs
                  {ch.youthGroup ? ` · ${ch.youthGroup.name}` : ''}
                  {ch.serviceUnit ? ` · ${ch.serviceUnit.name}` : ''}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
        {canManageCommunications && (
          <Card className="border-amber-200/60">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs">
                <AlertTriangle className="h-4 w-4" />
                Flagged ({flagged.data?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-32 space-y-2 overflow-y-auto text-xs">
              {(flagged.data ?? []).map((m) => (
                <div key={m.id} className="rounded border p-2">
                  <p className="font-medium">{m.channel.name}</p>
                  <Button size="sm" variant="outline" className="mt-1 h-6 text-[10px]" onClick={() => moderate(m.id, false)}>
                    Approve
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            {activeChannel ? 'Group chat' : 'Select a channel'}
          </CardTitle>
          {activeChannel && canManageCommunications && (
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={moderatorView} onChange={(e) => setModeratorView(e.target.checked)} />
              Show hidden
            </label>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-4">
            {(messages.data ?? []).map((m) => (
              <div key={m.id} className={`rounded-lg px-3 py-2 text-sm ${m.isHidden ? 'border border-dashed opacity-70' : 'bg-background'}`}>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{m.sender.firstName} {m.sender.lastName}</span>
                  <span>{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1">{m.content}</p>
                {canManageCommunications && (m.isFlagged || m.isHidden) && (
                  <div className="mt-2 flex gap-2">
                    <Badge variant="destructive" className="text-xs">{m.flagReason ?? 'Flagged'}</Badge>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => moderate(m.id, !m.isHidden)}>
                      {m.isHidden ? 'Unhide' : 'Hide'}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {activeChannel && canManageCommunications && (
            <form onSubmit={sendMessage} className="flex gap-2">
              <Input placeholder="Message…" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
              <Button type="submit" disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              </Button>
            </form>
          )}
          {activeChannel && !canManageCommunications && (
            <p className="text-xs text-muted-foreground">Read-only: channel posting is limited to admin and pastor.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
