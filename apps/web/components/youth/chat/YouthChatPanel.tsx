'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Hash,
  ImagePlus,
  Loader2,
  MessageCircle,
  Send,
  Shield,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  YouthChatChannel,
  YouthChatMessage,
  YouthChatReactionType,
  YouthDirectMessage,
  YouthDmThread,
} from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useYouthChatRealtime } from '@/lib/hooks/use-youth-chat-realtime';
import { YOUTH_ROUTES } from '@/lib/youth/routes';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const REACTIONS: YouthChatReactionType[] = ['LIKE', 'LOVE', 'AMEN', 'FIRE'];

interface MemberRow {
  id: string;
  firstName: string;
  lastName: string;
}

type Tab = 'channels' | 'dm';

export function YouthChatPanel() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('channels');
  const [activeChannel, setActiveChannel] = useState('');
  const [activePeer, setActivePeer] = useState('');
  const [dmThreadKey, setDmThreadKey] = useState('');
  const [messages, setMessages] = useState<YouthChatMessage[]>([]);
  const [dmMessages, setDmMessages] = useState<YouthDirectMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [moderatorView, setModeratorView] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const channels = useApiQuery<YouthChatChannel[]>(['youth-chat-channels'], '/youth/chat/channels');
  const flagged = useApiQuery<YouthChatMessage[]>(
    ['youth-chat-flagged'],
    '/youth/chat/messages/flagged',
    { retry: false },
  );
  const members = useApiQuery<MemberRow[]>(['youth-members-chat'], '/youth/members');
  const dmThreads = useApiQuery<YouthDmThread[]>(['youth-dm-threads'], '/youth/chat/dm/threads', {
    enabled: tab === 'dm',
  });

  const onChannelMessage = useCallback((msg: YouthChatMessage) => {
    if (msg.channelId !== activeChannel || msg.isHidden) return;
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }, [activeChannel]);

  const onDm = useCallback((msg: YouthDirectMessage) => {
    setDmMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  const { connected, emitTyping } = useYouthChatRealtime({
    channelId: tab === 'channels' ? activeChannel : undefined,
    dmThreadKey: tab === 'dm' ? dmThreadKey : undefined,
    onChannelMessage,
    onDm,
    onReaction: () => loadChannelMessages(),
  });

  const loadChannelMessages = async () => {
    if (!activeChannel) return;
    setLoadingMessages(true);
    try {
      const { data } = await api.get<YouthChatMessage[]>(
        `/youth/chat/channels/${activeChannel}/messages${moderatorView ? '?moderator=true' : ''}`,
      );
      setMessages(data);
      await api.post(`/youth/chat/channels/${activeChannel}/read`, {});
    } catch {
      toast.error('Could not load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadDmMessages = async (peerId: string) => {
    setLoadingMessages(true);
    try {
      const { data } = await api.get<{ threadKey: string; messages: YouthDirectMessage[] }>(
        `/youth/chat/dm/${peerId}/messages`,
      );
      setDmThreadKey(data.threadKey);
      setDmMessages(data.messages);
    } catch {
      toast.error('Could not load direct messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (tab === 'channels' && activeChannel) loadChannelMessages();
  }, [activeChannel, moderatorView, tab]);

  useEffect(() => {
    if (tab === 'dm' && activePeer) loadDmMessages(activePeer);
  }, [activePeer, tab]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, dmMessages]);

  const sendChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChannel || (!draft.trim() && !attachmentUrl)) return;
    setSending(true);
    try {
      const { data } = await api.post<YouthChatMessage>(
        `/youth/chat/channels/${activeChannel}/messages`,
        {
          content: draft.trim(),
          attachmentUrl: attachmentUrl || undefined,
        },
      );
      if (data.isFlagged) {
        toast.warning('Message flagged by moderation');
      }
      setDraft('');
      setAttachmentUrl('');
      if (!data.isHidden) {
        setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
      }
      queryClient.invalidateQueries({ queryKey: ['youth-chat-flagged'] });
    } catch {
      toast.error('Could not send message');
    } finally {
      setSending(false);
    }
  };

  const sendDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePeer || (!draft.trim() && !attachmentUrl)) return;
    setSending(true);
    try {
      const { data } = await api.post<YouthDirectMessage>(
        `/youth/chat/dm/${activePeer}/messages`,
        { content: draft.trim(), attachmentUrl: attachmentUrl || undefined },
      );
      setDraft('');
      setAttachmentUrl('');
      setDmMessages((prev) => [...prev, data]);
      queryClient.invalidateQueries({ queryKey: ['youth-dm-threads'] });
    } catch {
      toast.error('Could not send DM');
    } finally {
      setSending(false);
    }
  };

  const toggleReaction = async (messageId: string, reactionType: YouthChatReactionType) => {
    try {
      await api.post(`/youth/chat/messages/${messageId}/reactions`, { reactionType });
      loadChannelMessages();
    } catch {
      toast.error('Reaction failed');
    }
  };

  const moderate = async (messageId: string, isHidden: boolean) => {
    try {
      await api.patch(`/youth/chat/messages/${messageId}/moderate`, { isHidden });
      toast.success(isHidden ? 'Hidden' : 'Restored');
      loadChannelMessages();
      queryClient.invalidateQueries({ queryKey: ['youth-chat-flagged'] });
    } catch {
      toast.error('Moderation failed');
    }
  };

  const selectChannel = async (id: string) => {
    setActiveChannel(id);
    try {
      await api.post(`/youth/chat/channels/${id}/join`);
    } catch {
      /* non-fatal */
    }
  };

  const activeChannelMeta = channels.data?.find((c) => c.id === activeChannel);

  return (
    <>
      <PageHeader
        title="Youth Chat"
        description="Real-time group channels and direct messages with moderation."
        badge={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {connected ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <Wifi className="h-3.5 w-3.5" /> Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <WifiOff className="h-3.5 w-3.5" /> Connecting…
              </span>
            )}
            <Link href={YOUTH_ROUTES.hub} className="hover:text-foreground">
              ← Youth hub
            </Link>
          </div>
        }
      />
      <div className="flex flex-wrap gap-2 border-b px-6 md:px-8">
        <Button
          type="button"
          variant={tab === 'channels' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('channels')}
        >
          <Hash className="mr-1 h-4 w-4" />
          Channels
        </Button>
        <Button
          type="button"
          variant={tab === 'dm' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('dm')}
        >
          <User className="mr-1 h-4 w-4" />
          Direct messages
        </Button>
        {tab === 'channels' && (
          <Button
            type="button"
            variant={moderatorView ? 'default' : 'outline'}
            size="sm"
            onClick={() => setModeratorView((v) => !v)}
          >
            <Shield className="mr-1 h-3.5 w-3.5" />
            Moderator
          </Button>
        )}
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-12 md:p-8">
        <aside className="space-y-4 md:col-span-3">
          {tab === 'channels' ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Channels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {channels.isLoading && <Loader2 className="mx-auto h-5 w-5 animate-spin" />}
                {(channels.data ?? []).map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => selectChannel(ch.id)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-left text-sm transition',
                      activeChannel === ch.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50',
                    )}
                  >
                    <p className="font-medium">{ch.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ch.youthGroup?.name ?? 'Youth'} · {ch._count?.messages ?? 0} msgs
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Conversations</CardTitle>
              </CardHeader>
              <CardContent className="max-h-64 space-y-1 overflow-y-auto">
                {(dmThreads.data ?? []).map((t) => (
                  <button
                    key={t.threadKey}
                    type="button"
                    onClick={() => setActivePeer(t.peerMemberId)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-left text-sm',
                      activePeer === t.peerMemberId && 'border-primary bg-primary/5',
                    )}
                  >
                    <p className="font-medium">
                      {t.peer.firstName} {t.peer.lastName}
                      {t.unread && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          new
                        </Badge>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{t.lastMessage.content}</p>
                  </button>
                ))}
                {!dmThreads.data?.length && (
                  <p className="text-xs text-muted-foreground">No DMs yet — start below.</p>
                )}
              </CardContent>
            </Card>
          )}

          {tab === 'dm' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">New DM</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  className="w-full rounded-md border px-2 py-2 text-sm"
                  value={activePeer}
                  onChange={(e) => setActivePeer(e.target.value)}
                >
                  <option value="">Select member…</option>
                  {(members.data ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          )}

          {!flagged.isError && (flagged.data?.length ?? 0) > 0 && (
            <Card className="border-amber-200/60">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Flagged ({flagged.data?.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {(flagged.data ?? []).slice(0, 3).map((m) => (
                  <div key={m.id} className="rounded border p-2">
                    <p className="line-clamp-2">{m.content}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-1 h-7"
                      onClick={() => moderate(m.id, true)}
                    >
                      Hide
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </aside>

        <section className="flex min-h-[420px] flex-col md:col-span-6">
          <Card className="flex flex-1 flex-col">
            <CardHeader className="border-b py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="h-4 w-4" />
                {tab === 'channels'
                  ? activeChannelMeta?.name ?? 'Select a channel'
                  : activePeer
                    ? `DM · ${members.data?.find((m) => m.id === activePeer)?.firstName ?? ''}`
                    : 'Select a conversation'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col p-0">
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {loadingMessages && (
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                )}
                {tab === 'channels' &&
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        'rounded-lg px-3 py-2 text-sm',
                        m.isFlagged ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-muted/40',
                      )}
                    >
                      <p className="font-medium text-xs text-muted-foreground">
                        {m.sender.firstName} {m.sender.lastName} ·{' '}
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </p>
                      {m.replyTo && (
                        <p className="mt-1 border-l-2 pl-2 text-xs text-muted-foreground">
                          ↳ {m.replyTo.sender.firstName}: {m.replyTo.content}
                        </p>
                      )}
                      <p className="mt-1">{m.content}</p>
                      {m.attachmentUrl && (
                        <img
                          src={m.attachmentUrl}
                          alt=""
                          className="mt-2 max-h-48 rounded border object-cover"
                        />
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {REACTIONS.map((r) => (
                          <Button
                            key={r}
                            type="button"
                            size="sm"
                            variant={m.myReactions?.includes(r) ? 'default' : 'ghost'}
                            className="h-7 px-2 text-[10px]"
                            onClick={() => toggleReaction(m.id, r)}
                          >
                            {r} {m.reactionSummary?.[r] ?? ''}
                          </Button>
                        ))}
                        {moderatorView && m.isFlagged && (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="h-7"
                            onClick={() => moderate(m.id, true)}
                          >
                            Hide
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                {tab === 'dm' &&
                  dmMessages.map((m) => (
                    <div key={m.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                      <p className="text-xs text-muted-foreground">
                        {m.sender.firstName} · {new Date(m.createdAt).toLocaleTimeString()}
                      </p>
                      <p>{m.content}</p>
                    </div>
                  ))}
              </div>
              {(activeChannel || activePeer) && (
                <form
                  onSubmit={tab === 'channels' ? sendChannel : sendDm}
                  className="flex flex-col gap-2 border-t p-3"
                >
                  <Input
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="Image URL (optional)"
                    className="h-8 text-xs"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        emitTyping('You');
                      }}
                      placeholder="Message… use @userId to mention"
                      className="flex-1"
                    />
                    <Button type="submit" disabled={sending} size="sm">
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <ImagePlus className="h-3 w-3" />
                    Attach via image URL · auto-moderation on
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}
