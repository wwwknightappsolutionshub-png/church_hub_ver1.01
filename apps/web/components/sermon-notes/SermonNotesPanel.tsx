'use client';

import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, FileText, Loader2, Mic, Plus, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { VoiceToTextarea } from '@/components/sermon-notes/VoiceToTextarea';

type SourceType = 'AUDIO' | 'TEXT' | 'PDF';

interface DevotionalPlanDay {
  dayNumber: number;
  title: string;
  scriptureRef: string | null;
  scriptureText: string | null;
  reflection: string | null;
}

interface SermonNoteRow {
  id: string;
  title: string;
  speakerName: string | null;
  sundayDate: string | null;
  sourceType: SourceType;
  sourceUrl: string | null;
  pastorContext: string | null;
  status: 'DRAFT' | 'PROCESSING' | 'READY' | 'PUBLISHED';
  summary: string | null;
  devotionalPlan?: {
    id: string;
    title: string;
    status: string;
    days?: DevotionalPlanDay[];
  } | null;
}

const STATUS_LABEL: Record<SermonNoteRow['status'], string> = {
  DRAFT: 'Draft',
  PROCESSING: 'Processing',
  READY: 'Ready to publish',
  PUBLISHED: 'Published',
};

async function uploadSermonNoteFile(
  endpoint: 'audio' | 'pdf',
  file: File,
): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<{ url: string }>(`/sermon-notes/upload/${endpoint}`, form);
  return data;
}

function ButtonLabel({
  pending,
  icon: Icon,
  children,
}: {
  pending?: boolean;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
      {children}
    </span>
  );
}

export function SermonNotesPanel() {
  const qc = useQueryClient();
  const audioRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [sundayDate, setSundayDate] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('TEXT');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [pastorContext, setPastorContext] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editPastorContext, setEditPastorContext] = useState('');

  const { data: notes = [], isLoading } = useApiQuery<SermonNoteRow[]>(
    ['sermon-notes'],
    '/sermon-notes',
  );

  const selectedListRow = notes.find((n) => n.id === selectedId) ?? notes[0] ?? null;
  const detailId = selectedId ?? selectedListRow?.id ?? null;

  const { data: detail } = useApiQuery<SermonNoteRow>(
    ['sermon-notes', detailId ?? ''],
    detailId ? `/sermon-notes/${detailId}` : '/sermon-notes',
    { enabled: !!detailId },
  );

  const selected = detail ?? selectedListRow;

  useEffect(() => {
    setEditPastorContext(selected?.pastorContext ?? '');
  }, [selected?.id, selected?.pastorContext]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['sermon-notes'] });
    if (detailId) qc.invalidateQueries({ queryKey: ['sermon-notes', detailId] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<SermonNoteRow>('/sermon-notes', {
        title: title.trim(),
        speakerName: speaker.trim() || undefined,
        sundayDate: sundayDate || undefined,
        sourceType,
        sourceUrl: sourceUrl.trim() || undefined,
        sourceText: sourceText.trim() || undefined,
        pastorContext: pastorContext.trim() || undefined,
      });
      return data;
    },
    onSuccess: (row) => {
      toast.success('Sermon note created');
      setSelectedId(row.id);
      setTitle('');
      setSpeaker('');
      setSundayDate('');
      setSourceText('');
      setSourceUrl('');
      setPastorContext('');
      invalidate();
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not create sermon note')),
  });

  const saveContextMutation = useMutation({
    mutationFn: async ({ id, pastorContext: ctx }: { id: string; pastorContext: string }) => {
      const { data } = await api.patch<SermonNoteRow>(`/sermon-notes/${id}`, {
        pastorContext: ctx.trim() || undefined,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Pastor context saved');
      invalidate();
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not save context')),
  });

  const processMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/sermon-notes/${id}/process`);
      return data;
    },
    onSuccess: () => {
      toast.success('Weekly devotional draft is ready — review each day below');
      invalidate();
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not generate devotional')),
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/sermon-notes/${id}/publish`);
      return data;
    },
    onSuccess: () => {
      toast.success('Published — all members notified in-app');
      invalidate();
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not publish devotional')),
  });

  const onFilePick = useCallback(async (kind: 'audio' | 'pdf', file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadSermonNoteFile(kind, file);
      setSourceUrl(url);
      setSourceType(kind === 'audio' ? 'AUDIO' : 'PDF');
      toast.success('File uploaded');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  }, []);

  const planDays = selected?.devotionalPlan?.days ?? [];

  return (
    <DashboardModuleShell
      title="Sermon Note"
      description={MODULE_DESCRIPTIONS.sermonNotes}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-primary" />
              New sermon note
            </CardTitle>
            <CardDescription>
              Upload audio, PDF, or paste text. Use voice to text for extra pastor context before generating.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Sermon title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Faith that moves mountains"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Speaker</Label>
                <Input value={speaker} onChange={(e) => setSpeaker(e.target.value)} placeholder="Pastor name" />
              </div>
              <div className="space-y-2">
                <Label>Sunday date</Label>
                <Input type="date" value={sundayDate} onChange={(e) => setSundayDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">Text / notes</SelectItem>
                  <SelectItem value="AUDIO">Audio (MP3, M4A, WAV)</SelectItem>
                  <SelectItem value="PDF">PDF manuscript</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sourceType === 'TEXT' ? (
              <div className="space-y-2">
                <Label>Paste transcript or notes</Label>
                <Textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  rows={6}
                  placeholder="Paste sermon text, outline, or bullet points…"
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <input
                  ref={audioRef}
                  type="file"
                  accept="audio/*,.mp3,.m4a,.wav"
                  className="hidden"
                  onChange={(e) => onFilePick('audio', e.target.files?.[0])}
                />
                <input
                  ref={pdfRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => onFilePick('pdf', e.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => (sourceType === 'PDF' ? pdfRef : audioRef).current?.click()}
                >
                  <ButtonLabel
                    pending={uploading}
                    icon={sourceType === 'PDF' ? FileText : Mic}
                  >
                    Upload from device
                  </ButtonLabel>
                </Button>
                {sourceUrl ? (
                  <span className="max-w-[200px] self-center truncate text-xs text-muted-foreground">
                    File ready
                  </span>
                ) : null}
              </div>
            )}

            <div className="space-y-2">
              <Label>Pastor context (voice or text)</Label>
              <VoiceToTextarea
                value={pastorContext}
                onChange={setPastorContext}
                rows={5}
                placeholder="Clarify main points, applications, illustrations, or corrections for the AI devotional…"
              />
            </div>

            <Button
              className="w-full"
              disabled={!title.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              <ButtonLabel pending={createMutation.isPending} icon={Plus}>
                Save draft
              </ButtonLabel>
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your sermon notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sermon notes yet.</p>
              ) : (
                notes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSelectedId(n.id)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                      (selected?.id === n.id || (!selectedId && n.id === notes[0]?.id)) &&
                        'border-primary bg-primary/5',
                    )}
                  >
                    <span className="truncate font-medium">{n.title}</span>
                    <Badge variant="secondary">{STATUS_LABEL[n.status]}</Badge>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {selected ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5" />
                  {selected.title}
                </CardTitle>
                <CardDescription>
                  {selected.speakerName ? `${selected.speakerName} · ` : ''}
                  {STATUS_LABEL[selected.status]}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selected.summary ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">{selected.summary}</p>
                ) : null}

                {selected.status !== 'PUBLISHED' ? (
                  <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                    <Label>Pastor context for this note</Label>
                    <VoiceToTextarea
                      value={editPastorContext}
                      onChange={setEditPastorContext}
                      rows={4}
                      disabled={selected.status === 'PROCESSING'}
                      placeholder="Add or update context before generating the devotional…"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={saveContextMutation.isPending || selected.status === 'PROCESSING'}
                      onClick={() =>
                        saveContextMutation.mutate({
                          id: selected.id,
                          pastorContext: editPastorContext,
                        })
                      }
                    >
                      {saveContextMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Save context
                    </Button>
                  </div>
                ) : null}

                {selected.devotionalPlan ? (
                  <p className="text-sm">
                    Devotional plan: <strong>{selected.devotionalPlan.title}</strong> (
                    {selected.devotionalPlan.status})
                  </p>
                ) : null}

                {planDays.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">7-day devotional preview</p>
                    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                      {planDays.map((day) => (
                        <div key={day.dayNumber} className="space-y-2 rounded-lg border bg-card p-3 text-sm">
                          <p className="font-semibold">
                            Day {day.dayNumber}: {day.title}
                          </p>
                          {day.scriptureRef ? (
                            <p className="text-xs font-medium text-primary">Scripture: {day.scriptureRef}</p>
                          ) : null}
                          {day.scriptureText ? (
                            <p className="text-xs leading-relaxed text-muted-foreground">{day.scriptureText}</p>
                          ) : null}
                          {day.reflection ? (
                            <p className="whitespace-pre-wrap text-xs leading-relaxed">{day.reflection}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {selected.status !== 'PUBLISHED' && selected.status !== 'PROCESSING' ? (
                    <Button
                      variant="secondary"
                      disabled={processMutation.isPending}
                      onClick={() => processMutation.mutate(selected.id)}
                    >
                      <ButtonLabel pending={processMutation.isPending} icon={Sparkles}>
                        Generate weekly devotional
                      </ButtonLabel>
                    </Button>
                  ) : null}
                  {selected.status === 'READY' ? (
                    <Button disabled={publishMutation.isPending} onClick={() => publishMutation.mutate(selected.id)}>
                      <ButtonLabel pending={publishMutation.isPending} icon={Send}>
                        Publish to all members
                      </ButtonLabel>
                    </Button>
                  ) : null}
                  {selected.devotionalPlan?.id ? (
                    <Button variant="outline" asChild>
                      <Link href={`/dashboard/devotional-hub/plans/${selected.devotionalPlan.id}/edit`}>
                        Edit in Devotional Hub
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </DashboardModuleShell>
  );
}
