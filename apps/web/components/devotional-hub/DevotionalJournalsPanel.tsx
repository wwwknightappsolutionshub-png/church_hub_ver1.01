'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Loader2,
  Mic,
  MicOff,
  Pin,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  DevotionalGroupListDto,
  DevotionalJournalEntryDto,
  DevotionalJournalRecapPrompt,
  DevotionalJournalScriptureRef,
  DevotionalJournalSummaryDto,
} from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { DEVOTIONAL_QUERY_KEYS } from '@/lib/devotional-hub';
import {
  createSpeechRecognition,
  isSpeechRecognitionSupported,
} from '@/lib/devotional-journal-voice';
import { DevotionalJournalRichEditor } from './DevotionalJournalRichEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const MOOD_TAGS = [
  'grateful',
  'peaceful',
  'hopeful',
  'struggling',
  'joyful',
  'anxious',
  'renewed',
  'curious',
];

const REACTION_EMOJIS = ['🙏', '❤️', '👍', '✨', '🕊️', '😊', '💡', '🎉'];

type JournalMode = 'private' | 'team';

interface PaginatedJournals {
  items: DevotionalJournalSummaryDto[];
  total: number;
}

function stripPreview(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function DevotionalJournalsPanel() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<JournalMode>('private');
  const [groupId, setGroupId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [moods, setMoods] = useState<string[]>([]);
  const [scriptureRef, setScriptureRef] = useState('');
  const [scriptureText, setScriptureText] = useState('');
  const [scriptureRefs, setScriptureRefs] = useState<DevotionalJournalScriptureRef[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachments, setAttachments] = useState<Array<{ url: string; caption?: string }>>([]);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [recapPromptId, setRecapPromptId] = useState<string | undefined>();
  const [commentBody, setCommentBody] = useState('');
  const [replyParentId, setReplyParentId] = useState<string | null>(null);

  const groups = useApiQuery<DevotionalGroupListDto>(
    DEVOTIONAL_QUERY_KEYS.groups(),
    '/devotional-hub/groups',
  );

  const activeGroups = useMemo(
    () =>
      (groups.data?.myGroups ?? []).filter(
        (g) => g.myMembership?.status === 'ACTIVE',
      ),
    [groups.data],
  );

  useEffect(() => {
    if (!groupId && activeGroups[0]) setGroupId(activeGroups[0].id);
  }, [activeGroups, groupId]);

  const listUrl =
    mode === 'private'
      ? '/devotional-hub/journals?limit=30'
      : groupId
        ? `/devotional-hub/journals/group/${groupId}?limit=30`
        : null;

  const list = useApiQuery<PaginatedJournals>(
    [...DEVOTIONAL_QUERY_KEYS.journals(), mode, groupId],
    listUrl ?? '',
    { enabled: !!listUrl },
  );

  const detail = useApiQuery<DevotionalJournalEntryDto>(
    ['devotional-journal', selectedId ?? ''],
    selectedId ? `/devotional-hub/journals/${selectedId}` : '',
    { enabled: !!selectedId && !composing },
  );

  const recapPrompts = useApiQuery<DevotionalJournalRecapPrompt[]>(
    ['devotional-journal-recap'],
    '/devotional-hub/journals/recap-prompts',
  );

  const resetComposer = () => {
    setTitle('');
    setBody('');
    setMoods([]);
    setScriptureRefs([]);
    setScriptureRef('');
    setScriptureText('');
    setAttachments([]);
    setAttachmentUrl('');
    setVoiceTranscript('');
    setRecapPromptId(undefined);
    setComposing(false);
    setSelectedId(null);
  };

  const loadIntoComposer = (entry: DevotionalJournalEntryDto) => {
    setTitle(entry.title ?? '');
    setBody(entry.body);
    setMoods(entry.moods ?? []);
    setScriptureRefs(entry.scriptureRefs ?? []);
    setAttachments(entry.attachments ?? []);
    setVoiceTranscript(entry.voiceTranscript ?? '');
    setRecapPromptId(entry.recapPromptId ?? undefined);
    setComposing(true);
    setSelectedId(entry.id);
  };

  const toggleMood = (tag: string) => {
    setMoods((prev) => (prev.includes(tag) ? prev.filter((m) => m !== tag) : [...prev, tag]));
  };

  const addScriptureRef = () => {
    if (!scriptureRef.trim()) return;
    setScriptureRefs((prev) => [
      ...prev,
      { reference: scriptureRef.trim(), text: scriptureText.trim() || undefined },
    ]);
    setScriptureRef('');
    setScriptureText('');
  };

  const addAttachment = () => {
    if (!attachmentUrl.trim()) return;
    try {
      new URL(attachmentUrl);
    } catch {
      toast.error('Enter a valid image URL');
      return;
    }
    setAttachments((prev) => [...prev, { url: attachmentUrl.trim() }]);
    setAttachmentUrl('');
  };

  const startVoice = () => {
    if (!isSpeechRecognitionSupported()) {
      toast.error('Voice input is not supported in this browser');
      return;
    }
    const recognition = createSpeechRecognition((text, isFinal) => {
      setVoiceTranscript((prev) => (isFinal ? `${prev} ${text}`.trim() : prev || text));
      if (isFinal) setBody((b) => `${b}<p>${text}</p>`);
    });
    if (!recognition) return;
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.start();
    setListening(true);
    toast.message('Listening… speak your journal entry');
  };

  const stopVoice = () => {
    setListening(false);
  };

  const saveEntry = async () => {
    const plain = stripPreview(body);
    if (!plain && !voiceTranscript.trim()) {
      toast.error('Write something in your journal first');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim() || undefined,
        body: body || `<p>${voiceTranscript}</p>`,
        moods,
        scriptureRefs,
        attachments,
        voiceTranscript: voiceTranscript.trim() || undefined,
        recapPromptId,
        visibility: mode === 'team' ? ('GROUP' as const) : ('PRIVATE' as const),
        groupId: mode === 'team' ? groupId : undefined,
      };

      if (selectedId && composing) {
        await api.patch(`/devotional-hub/journals/${selectedId}`, payload);
        toast.success('Journal updated');
      } else {
        const { data } = await api.post<DevotionalJournalEntryDto>('/devotional-hub/journals', payload);
        setSelectedId(data.id);
        toast.success(mode === 'team' ? 'Team journal posted' : 'Private journal saved');
      }
      resetComposer();
      queryClient.invalidateQueries({ queryKey: DEVOTIONAL_QUERY_KEYS.journals() });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save journal'));
    } finally {
      setSaving(false);
    }
  };

  const exportEntry = async (entryId: string) => {
    try {
      const { data } = await api.get<{ content: string }>(
        `/devotional-hub/journals/${entryId}/export?format=markdown`,
      );
      const blob = new Blob([data.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journal-${entryId.slice(0, 8)}.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Export failed'));
    }
  };

  const shareEntry = async (entryId: string) => {
    try {
      const { data } = await api.post<{ path: string; shareToken: string }>(
        `/devotional-hub/journals/${entryId}/share`,
      );
      const url =
        typeof window !== 'undefined'
          ? `${window.location.origin}${data.path}`
          : data.path;
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create share link'));
    }
  };

  const toggleReaction = async (entryId: string, emoji: string) => {
    try {
      await api.post(`/devotional-hub/journals/${entryId}/reactions`, { emoji });
      queryClient.invalidateQueries({ queryKey: ['devotional-journal', entryId] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Reaction failed'));
    }
  };

  const postComment = async (entryId: string) => {
    if (!commentBody.trim()) return;
    try {
      await api.post(`/devotional-hub/journals/${entryId}/comments`, {
        body: commentBody,
        parentId: replyParentId ?? undefined,
      });
      setCommentBody('');
      setReplyParentId(null);
      queryClient.invalidateQueries({ queryKey: ['devotional-journal', entryId] });
      toast.success('Comment added');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not post comment'));
    }
  };

  const togglePin = async (entry: DevotionalJournalEntryDto) => {
    try {
      if (entry.isPinned) {
        await api.delete(`/devotional-hub/journals/${entry.id}/pin`);
      } else {
        await api.post(`/devotional-hub/journals/${entry.id}/pin`);
      }
      queryClient.invalidateQueries({ queryKey: DEVOTIONAL_QUERY_KEYS.journals() });
      queryClient.invalidateQueries({ queryKey: ['devotional-journal', entry.id] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Pin action failed'));
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!confirm('Delete this journal entry?')) return;
    try {
      await api.delete(`/devotional-hub/journals/${entryId}`);
      if (selectedId === entryId) resetComposer();
      queryClient.invalidateQueries({ queryKey: DEVOTIONAL_QUERY_KEYS.journals() });
      toast.success('Deleted');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Delete failed'));
    }
  };

  const applyRecapPrompt = (p: DevotionalJournalRecapPrompt) => {
    setRecapPromptId(p.id);
    setTitle((t) => t || 'Daily recap');
    setBody((b) => b || `<p><strong>${p.text}</strong></p><p><br></p>`);
    setComposing(true);
  };

  const renderComments = useCallback(
    (
      comments: DevotionalJournalEntryDto['comments'],
      entryId: string,
      depth = 0,
    ) => (
      <ul className={cn('space-y-2', depth > 0 && 'ml-4 border-l pl-3')}>
        {comments.map((c) => (
          <li key={c.id} className="text-sm">
            <p className="font-medium text-foreground">{c.authorName}</p>
            <p className="text-muted-foreground">{c.body}</p>
            {depth < 2 && (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setReplyParentId(c.id)}
              >
                Reply
              </button>
            )}
            {c.replies?.length > 0 && renderComments(c.replies, entryId, depth + 1)}
          </li>
        ))}
      </ul>
    ),
    [],
  );

  const entry = detail.data;
  const isGroupAdmin = activeGroups.find((g) => g.id === groupId)?.myMembership?.role === 'ADMIN' ||
    activeGroups.find((g) => g.id === groupId)?.myMembership?.role === 'CO_ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'private' ? 'default' : 'outline'}
          onClick={() => {
            setMode('private');
            resetComposer();
          }}
        >
          Private journal
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'team' ? 'default' : 'outline'}
          onClick={() => {
            setMode('team');
            resetComposer();
          }}
        >
          Team journal
        </Button>
      </div>

      {mode === 'team' && (
        <div>
          <Label>Devotional group</Label>
          <select
            className="mt-1 h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value);
              setSelectedId(null);
            }}
          >
            {activeGroups.length === 0 && <option value="">No groups yet</option>}
            {activeGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Team journals are automatically linked to your selected group.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div className="space-y-2">
          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={() => {
              resetComposer();
              setComposing(true);
            }}
            disabled={mode === 'team' && !groupId}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New entry
          </Button>

          {list.isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {(list.data?.items ?? []).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedId(item.id);
                setComposing(false);
              }}
              className={cn(
                'w-full rounded-lg border p-3 text-left text-sm transition hover:border-primary/40',
                selectedId === item.id && !composing && 'border-primary bg-primary/5',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium line-clamp-1">
                  {item.title || stripPreview(item.preview).slice(0, 40) || 'Untitled'}
                </span>
                {item.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 text-amber-600" />}
              </div>
              {item.authorName && (
                <p className="text-xs text-muted-foreground">{item.authorName}</p>
              )}
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {stripPreview(item.preview)}
              </p>
              {item.moods?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.moods.slice(0, 3).map((m) => (
                    <Badge key={m} variant="secondary" className="text-[10px]">
                      {m}
                    </Badge>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {(composing || !selectedId) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedId && composing ? 'Edit entry' : mode === 'team' ? 'New team entry' : 'New private entry'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-2 block">Daily recap prompt</Label>
                  <div className="flex flex-wrap gap-2">
                    {(recapPrompts.data ?? []).map((p) => (
                      <Button
                        key={p.id}
                        type="button"
                        size="sm"
                        variant={recapPromptId === p.id ? 'default' : 'outline'}
                        onClick={() => applyRecapPrompt(p)}
                      >
                        {p.text.slice(0, 42)}…
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Title (optional)</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div>
                  <Label>Mood tags</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {MOOD_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleMood(tag)}
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-xs capitalize',
                          moods.includes(tag)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border',
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Rich text</Label>
                  <DevotionalJournalRichEditor value={body} onChange={setBody} className="mt-1" />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={listening ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={listening ? stopVoice : startVoice}
                  >
                    {listening ? (
                      <MicOff className="mr-1.5 h-4 w-4" />
                    ) : (
                      <Mic className="mr-1.5 h-4 w-4" />
                    )}
                    {listening ? 'Stop voice' : 'Voice to text'}
                  </Button>
                  {voiceTranscript && (
                    <p className="text-xs text-muted-foreground">Transcript: {voiceTranscript}</p>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Scripture reference (e.g. Romans 8:28)"
                    value={scriptureRef}
                    onChange={(e) => setScriptureRef(e.target.value)}
                  />
                  <Input
                    placeholder="Verse text (optional)"
                    value={scriptureText}
                    onChange={(e) => setScriptureText(e.target.value)}
                  />
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={addScriptureRef}>
                  Add scripture
                </Button>
                {scriptureRefs.length > 0 && (
                  <ul className="text-sm text-muted-foreground">
                    {scriptureRefs.map((r) => (
                      <li key={r.reference}>
                        <strong>{r.reference}</strong>
                        {r.text ? ` — ${r.text}` : ''}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Image URL attachment"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={addAttachment}>
                    Add image
                  </Button>
                </div>
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((a) => (
                      <img
                        key={a.url}
                        src={a.url}
                        alt=""
                        className="h-16 w-16 rounded object-cover border"
                      />
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={saveEntry} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetComposer}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedId && !composing && entry && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {entry.title || 'Journal entry'}
                    {entry.isPinned && (
                      <Badge variant="outline" className="gap-1">
                        <Pin className="h-3 w-3" /> Pinned
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {entry.authorName}
                    {entry.lastEditedByName && entry.lastEditedByName !== entry.authorName
                      ? ` · edited by ${entry.lastEditedByName}`
                      : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {entry.canEdit && (
                    <Button type="button" size="sm" variant="outline" onClick={() => loadIntoComposer(entry)}>
                      Edit
                    </Button>
                  )}
                  <Button type="button" size="icon" variant="ghost" onClick={() => exportEntry(entry.id)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => shareEntry(entry.id)}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                  {mode === 'team' && isGroupAdmin && (
                    <Button type="button" size="icon" variant="ghost" onClick={() => togglePin(entry)}>
                      <Pin className={cn('h-4 w-4', entry.isPinned && 'fill-amber-500 text-amber-600')} />
                    </Button>
                  )}
                  <Button type="button" size="icon" variant="ghost" onClick={() => deleteEntry(entry.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {entry.recapPrompt && (
                  <p className="rounded-md bg-muted/50 p-2 italic">{entry.recapPrompt}</p>
                )}
                {entry.moods.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.moods.map((m) => (
                      <Badge key={m} variant="secondary">
                        {m}
                      </Badge>
                    ))}
                  </div>
                )}
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: entry.body }}
                />
                {entry.voiceTranscript && (
                  <p className="text-muted-foreground">
                    <strong>Voice:</strong> {entry.voiceTranscript}
                  </p>
                )}
                {entry.scriptureRefs?.map((r) => (
                  <p key={r.reference}>
                    <strong>{r.reference}</strong>
                    {r.text ? ` — ${r.text}` : ''}
                  </p>
                ))}
                {entry.attachments?.map((a) => (
                  <img key={a.url} src={a.url} alt={a.caption ?? ''} className="max-h-48 rounded border" />
                ))}

                <div className="flex flex-wrap gap-2 border-t pt-3">
                  {REACTION_EMOJIS.map((emoji) => {
                    const r = entry.reactions.find((x) => x.emoji === emoji);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => toggleReaction(entry.id, emoji)}
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-sm',
                          r?.mine && 'border-primary bg-primary/10',
                        )}
                      >
                        {emoji} {r?.count ? r.count : ''}
                      </button>
                    );
                  })}
                </div>

                {mode === 'team' && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold">Comments</h4>
                    {renderComments(entry.comments, entry.id)}
                    <div className="mt-3 space-y-2">
                      {replyParentId && (
                        <p className="text-xs text-muted-foreground">Replying to thread…</p>
                      )}
                      <Input
                        placeholder="Add a comment…"
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                      />
                      <Button type="button" size="sm" onClick={() => postComment(entry.id)}>
                        Post comment
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!composing && !selectedId && !list.data?.items?.length && (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Start a {mode === 'team' ? 'team' : 'private'} journal entry to reflect on today&apos;s reading.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
