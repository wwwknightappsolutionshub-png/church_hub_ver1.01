'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Conversation {
  id: string;
  participantAId: string;
  participantBId: string;
  subject?: string | null;
  lastMessageAt?: string | null;
  messages: Array<{ body: string; createdAt: string }>;
}

interface ConvMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export function CommConversationsPanel() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [newParticipant, setNewParticipant] = useState('');
  const [sending, setSending] = useState(false);

  const { data: conversations } = useApiQuery<Conversation[]>(
    ['comm-conversations'],
    '/communications/conversations',
  );

  const { data: messages, isLoading: msgsLoading } = useApiQuery<ConvMessage[]>(
    ['comm-conv-msgs', activeId ?? ''],
    `/communications/conversations/${activeId}/messages`,
    { enabled: !!activeId },
  );

  const startConversation = async () => {
    if (!newParticipant.trim()) return;
    try {
      const { data } = await api.post<{ id: string }>('/communications/conversations', {
        participantId: newParticipant.trim(),
      });
      setActiveId(data.id);
      setNewParticipant('');
      queryClient.invalidateQueries({ queryKey: ['comm-conversations'] });
    } catch {
      toast.error('Could not start conversation');
    }
  };

  const send = async () => {
    if (!activeId || !draft.trim()) return;
    setSending(true);
    try {
      await api.post(`/communications/conversations/${activeId}/messages`, { body: draft });
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['comm-conv-msgs', activeId] });
      queryClient.invalidateQueries({ queryKey: ['comm-conversations'] });
    } catch {
      toast.error('Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Conversations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="User ID to message"
              value={newParticipant}
              onChange={(e) => setNewParticipant(e.target.value)}
            />
            <Button type="button" size="sm" onClick={startConversation}>
              New
            </Button>
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {(conversations ?? []).map((c) => {
              const preview = c.messages[0]?.body ?? 'No messages yet';
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={`w-full rounded-lg border p-2 text-left text-sm ${
                    activeId === c.id ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <p className="font-medium truncate">{c.subject ?? `Chat`}</p>
                  <p className="text-xs text-muted-foreground truncate">{preview}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Thread
            {activeId && <Badge variant="outline">Live</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!activeId ? (
            <p className="text-sm text-muted-foreground">Select or start a conversation.</p>
          ) : (
            <>
              <div className="mb-3 max-h-72 space-y-2 overflow-y-auto rounded-lg border p-3">
                {msgsLoading && <Loader2 className="mx-auto h-6 w-6 animate-spin" />}
                {(messages ?? []).map((m) => (
                  <div key={m.id} className="text-sm">
                    <p>{m.body}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                />
                <Button onClick={send} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
