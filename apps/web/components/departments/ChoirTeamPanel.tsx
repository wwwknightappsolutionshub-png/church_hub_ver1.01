'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import {
  Bell,
  Calendar,
  ClipboardList,
  Clock,
  Download,
  Mic2,
  Music,
  Pencil,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { deptToolsApiBase } from '@/lib/dept-module-catalog';
import { formatMemberName } from '@/lib/service-unit-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type MemberRef = { id: string; firstName: string; lastName: string };

const VOICE_PARTS = [
  { value: 'SOPRANO', label: 'Soprano (S)' },
  { value: 'TENOR', label: 'Tenor (T)' },
  { value: 'ALTO', label: 'Alto (A)' },
  { value: 'BASS', label: 'Bass (B)' },
] as const;

const ROSTER_EVENTS = [
  { value: 'SUNDAY_MINISTRY', label: 'Sunday ministration' },
  { value: 'MIDWEEK_REHEARSAL', label: 'Midweek rehearsal' },
] as const;

const ATTENDANCE_EVENTS = [
  { value: 'REHEARSAL', label: 'Rehearsal' },
  { value: 'SUNDAY_MINISTRY', label: 'Sunday ministration' },
] as const;

const AUDITION_STATUSES = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'PASSED', label: 'Passed' },
  { value: 'DEFERRED', label: 'Deferred' },
  { value: 'DECLINED', label: 'Declined' },
] as const;

export type ChoirSection = 'roster' | 'library' | 'planning' | 'attendance' | 'talent';

function MemberMultiSelect({
  members,
  selected,
  onChange,
}: {
  members: Array<{ memberId: string; member: MemberRef }>;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Label className="text-xs">Members ({selected.length} selected)</Label>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onChange(members.map((m) => m.memberId))}>
            All
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onChange([])}>
            Clear
          </Button>
        </div>
      </div>
      <div className="grid max-h-40 gap-1 overflow-y-auto sm:grid-cols-2">
        {members.map((m) => (
          <label
            key={m.memberId}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
              selected.includes(m.memberId) ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted',
            )}
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border"
              checked={selected.includes(m.memberId)}
              onChange={() => toggle(m.memberId)}
            />
            <span className="truncate">{formatMemberName(m.member)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function ChoirTeamPanel({
  unitId,
  section,
  canEdit,
  canLead,
  canManage,
  members,
}: {
  unitId: string;
  section: ChoirSection;
  canEdit: boolean;
  canLead: boolean;
  canManage: boolean;
  members: Array<{ memberId: string; member: MemberRef }>;
}) {
  const base = deptToolsApiBase(unitId);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const sheetFileRef = useRef<HTMLInputElement>(null);
  const practiceFileRef = useRef<HTMLInputElement>(null);
  const auditionFileRef = useRef<HTMLInputElement>(null);

  const err = (e: unknown, fb: string) => toast.error(apiErrorMessage(e as AxiosError, fb));
  const refresh = () => {
    const keys = ['choir-roster', 'choir-songs', 'choir-setlists', 'choir-attendance', 'choir-auditions', 'choir-tasks', 'choir-notes'] as const;
    keys.forEach((k) => qc.invalidateQueries({ queryKey: [k, unitId] }));
  };

  const { data: roster } = useApiQuery<{
    entries: Array<{
      id: string;
      eventType: string;
      startsAt: string;
      voicePart: string;
      member: MemberRef;
      reminderSentAt?: string | null;
    }>;
  }>(['choir-roster', unitId], `${base}/choir/roster`);

  const { data: songs = [] } = useApiQuery<
    Array<{
      id: string;
      title: string;
      musicalKey?: string | null;
      tempoBpm?: number | null;
      lyrics?: string | null;
      audioSampleUrl?: string | null;
      sheetUrl?: string | null;
      chordChart?: string | null;
      practiceTrackUrl?: string | null;
    }>
  >(['choir-songs', unitId], `${base}/choir/songs`);

  const { data: setlists = [] } = useApiQuery<
    Array<{
      id: string;
      title: string;
      serviceDate: string;
      items: Array<{ id: string; musicalKey?: string; tempoBpm?: number; song: { id: string; title: string } }>;
    }>
  >(['choir-setlists', unitId], `${base}/choir/setlists`);

  const { data: attendance } = useApiQuery<{
    records: Array<{
      id: string;
      eventType: string;
      eventDate: string;
      attended: boolean;
      minutesLate: number;
      member: MemberRef;
    }>;
    metrics: { total: number; attended: number; late: number; avgMinutesLate: number };
  }>(['choir-attendance', unitId], `${base}/choir/attendance`);

  const { data: auditions = [] } = useApiQuery<
    Array<{
      id: string;
      status: string;
      voicePart?: string | null;
      auditionDate?: string | null;
      recordingUrl?: string | null;
      notes?: string | null;
      member: MemberRef;
    }>
  >(['choir-auditions', unitId], `${base}/choir/auditions`);

  const { data: voiceTasks = [] } = useApiQuery<
    Array<{
      id: string;
      title: string;
      dueDate?: string | null;
      completedAt?: string | null;
      member: MemberRef;
    }>
  >(['choir-tasks', unitId], `${base}/choir/voice-tasks`);

  const { data: vocalNotes = [] } = useApiQuery<
    Array<{
      id: string;
      body: string;
      improvementTag?: string | null;
      member: MemberRef;
      author: MemberRef;
    }>
  >(['choir-notes', unitId], `${base}/choir/vocal-notes`);

  const [rosterForm, setRosterForm] = useState({
    id: '' as string | undefined,
    eventType: 'MIDWEEK_REHEARSAL' as string,
    startsAt: '',
    voicePart: 'SOPRANO' as string,
    memberId: members[0]?.memberId ?? '',
    notes: '',
  });

  const emptySongForm = () => ({
    id: '' as string | undefined,
    title: '',
    musicalKey: 'C',
    tempoBpm: '120',
    lyrics: '',
    chordChart: '',
    audioSampleUrl: '',
    sheetUrl: '',
    practiceTrackUrl: '',
  });
  const [songForm, setSongForm] = useState(emptySongForm);
  const [transposeId, setTransposeId] = useState('');
  const [semitones, setSemitones] = useState('2');
  const [uploadSongId, setUploadSongId] = useState('');

  const [setlistForm, setSetlistForm] = useState({ title: '', serviceDate: '', songId: '', key: '', tempo: '' });
  const [feedbackForm, setFeedbackForm] = useState({ songId: '', setlistId: '', rating: '3', difficulty: '3', comment: '' });

  const [attForm, setAttForm] = useState({
    id: '' as string | undefined,
    eventType: 'REHEARSAL',
    eventDate: new Date().toISOString().slice(0, 10),
    memberIds: [] as string[],
    minutesLate: '0',
    attended: true,
  });

  const attendedMemberLabels = attForm.memberIds
    .map((id) => {
      const member = members.find((m) => m.memberId === id)?.member;
      return member ? formatMemberName(member) : null;
    })
    .filter(Boolean)
    .join(', ');

  const [auditionForm, setAuditionForm] = useState({
    id: '' as string | undefined,
    memberId: members[0]?.memberId ?? '',
    status: 'SCHEDULED',
    voicePart: 'SOPRANO',
    auditionDate: '',
    notes: '',
    recordingUrl: '',
  });
  const [taskForm, setTaskForm] = useState({
    id: '' as string | undefined,
    memberId: members[0]?.memberId ?? '',
    title: '',
    description: '',
    dueDate: '',
  });
  const [noteForm, setNoteForm] = useState({ memberId: members[0]?.memberId ?? '', body: '', improvementTag: '' });

  useEffect(() => {
    const id = members[0]?.memberId;
    if (!id) return;
    setRosterForm((f) => ({ ...f, memberId: f.memberId || id }));
    setAuditionForm((f) => ({ ...f, memberId: f.memberId || id }));
    setTaskForm((f) => ({ ...f, memberId: f.memberId || id }));
    setNoteForm((f) => ({ ...f, memberId: f.memberId || id }));
    setAttForm((f) => ({ ...f, memberIds: f.memberIds.length ? f.memberIds : [id] }));
  }, [members]);

  const uploadSongFile = async (file: File, assetType: 'audio' | 'sheet' | 'practice') => {
    const form = new FormData();
    form.append('file', file);
    form.append('assetType', assetType);
    if (uploadSongId) form.append('songId', uploadSongId);
    if (songForm.title.trim()) form.append('title', songForm.title.trim());
    setBusy(true);
    try {
      await api.post(`${base}/choir/songs/upload`, form);
      toast.success('File uploaded');
      refresh();
    } catch (e) {
      err(e, 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const uploadAuditionFile = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    if (auditionForm.id) form.append('auditionId', auditionForm.id);
    if (auditionForm.memberId) form.append('memberId', auditionForm.memberId);
    setBusy(true);
    try {
      const res = await api.post(`${base}/choir/auditions/upload`, form);
      const url = res.data?.recordingUrl as string | undefined;
      if (url) setAuditionForm((f) => ({ ...f, recordingUrl: url }));
      toast.success('Recording uploaded');
      refresh();
    } catch (e) {
      err(e, 'Recording upload failed');
    } finally {
      setBusy(false);
    }
  };

  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">Add choir members to this unit to use roster and attendance tools.</p>;
  }

  return (
    <>
      {!canLead && (
        <p className="mb-4 text-xs text-muted-foreground">
          Department leader access is required to add or edit songs, attendance, and talent records.
        </p>
      )}

      {section === 'roster' && (
        <section className="space-y-3">
          {canManage && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              className="gap-1"
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await api.post(`${base}/choir/send-reminders`, {});
                  toast.success(`Reminders sent (${res.data.remindersQueued})`);
                  refresh();
                } catch (e) {
                  err(e, 'Could not send reminders');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Bell className="h-4 w-4" /> Auto reminders
            </Button>
          )}
          <ul className="space-y-2">
            {(roster?.entries ?? []).map((e) => (
              <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{ROSTER_EVENTS.find((x) => x.value === e.eventType)?.label}</span>
                  {' · '}
                  {VOICE_PARTS.find((x) => x.value === e.voicePart)?.label}
                  <p className="text-muted-foreground">
                    {new Date(e.startsAt).toLocaleString()} — {formatMemberName(e.member)}
                  </p>
                </div>
                {canLead && (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() =>
                        setRosterForm({
                          id: e.id,
                          eventType: e.eventType,
                          startsAt: e.startsAt.slice(0, 16),
                          voicePart: e.voicePart,
                          memberId: e.member.id,
                          notes: '',
                        })
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      disabled={busy}
                      onClick={async () => {
                        if (!confirm('Remove this roster slot?')) return;
                        setBusy(true);
                        try {
                          await api.delete(`${base}/choir/roster/${e.id}`);
                          toast.success('Removed');
                          refresh();
                        } catch (ex) {
                          err(ex, 'Could not delete');
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {canLead && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{rosterForm.id ? 'Edit roster slot' : 'Add roster slot'}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={rosterForm.eventType}
                  onChange={(e) => setRosterForm({ ...rosterForm, eventType: e.target.value })}
                >
                  {ROSTER_EVENTS.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="datetime-local"
                  value={rosterForm.startsAt}
                  onChange={(e) => setRosterForm({ ...rosterForm, startsAt: e.target.value })}
                />
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={rosterForm.voicePart}
                  onChange={(e) => setRosterForm({ ...rosterForm, voicePart: e.target.value })}
                >
                  {VOICE_PARTS.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={rosterForm.memberId}
                  onChange={(e) => setRosterForm({ ...rosterForm, memberId: e.target.value })}
                >
                  {members.map((m) => (
                    <option key={m.memberId} value={m.memberId}>
                      {formatMemberName(m.member)}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  className="sm:col-span-2"
                  disabled={busy}
                  onClick={async () => {
                    if (!rosterForm.startsAt) {
                      toast.error('Pick date/time');
                      return;
                    }
                    setBusy(true);
                    try {
                      await api.post(`${base}/choir/roster`, {
                        ...rosterForm,
                        startsAt: new Date(rosterForm.startsAt).toISOString(),
                      });
                      toast.success('Roster saved');
                      setRosterForm({ id: undefined, eventType: 'MIDWEEK_REHEARSAL', startsAt: '', voicePart: 'SOPRANO', memberId: members[0]?.memberId ?? '', notes: '' });
                      refresh();
                    } catch (e) {
                      err(e, 'Could not save roster');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Save assignment
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {section === 'library' && (
        <section className="space-y-3">
          <ul className="space-y-2">
            {songs.map((s) => (
              <li key={s.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {s.title} {s.musicalKey ? `· ${s.musicalKey}` : ''} {s.tempoBpm ? `@ ${s.tempoBpm}bpm` : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {s.sheetUrl && (
                      <a href={s.sheetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-xs text-primary underline">
                        <Download className="h-3 w-3" /> Sheets
                      </a>
                    )}
                    {s.practiceTrackUrl && (
                      <a href={s.practiceTrackUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                        Practice
                      </a>
                    )}
                    {s.audioSampleUrl && (
                      <a href={s.audioSampleUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                        Audio
                      </a>
                    )}
                  </div>
                </div>
                {canLead && (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => {
                        setUploadSongId(s.id);
                        setSongForm({
                          id: s.id,
                          title: s.title,
                          musicalKey: s.musicalKey ?? 'C',
                          tempoBpm: String(s.tempoBpm ?? 120),
                          lyrics: s.lyrics ?? '',
                          chordChart: s.chordChart ?? '',
                          audioSampleUrl: s.audioSampleUrl ?? '',
                          sheetUrl: s.sheetUrl ?? '',
                          practiceTrackUrl: s.practiceTrackUrl ?? '',
                        });
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      disabled={busy}
                      onClick={async () => {
                        if (!confirm(`Delete “${s.title}”?`)) return;
                        setBusy(true);
                        try {
                          await api.delete(`${base}/choir/songs/${s.id}`);
                          toast.success('Song deleted');
                          refresh();
                        } catch (e) {
                          err(e, 'Could not delete song');
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {canLead && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{songForm.id ? 'Edit song' : 'Add song'}</CardTitle>
                  <CardDescription className="text-xs">Leaders can upload local audio, sheet PDFs, and practice tracks.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <Input placeholder="Title" value={songForm.title} onChange={(e) => setSongForm({ ...songForm, title: e.target.value })} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Key (e.g. Eb)" value={songForm.musicalKey} onChange={(e) => setSongForm({ ...songForm, musicalKey: e.target.value })} />
                    <Input type="number" placeholder="Tempo BPM" value={songForm.tempoBpm} onChange={(e) => setSongForm({ ...songForm, tempoBpm: e.target.value })} />
                  </div>
                  <Textarea placeholder="Lyrics" rows={3} value={songForm.lyrics} onChange={(e) => setSongForm({ ...songForm, lyrics: e.target.value })} />
                  <Textarea placeholder="Chord chart" rows={2} value={songForm.chordChart} onChange={(e) => setSongForm({ ...songForm, chordChart: e.target.value })} />
                  <Button
                    type="button"
                    disabled={busy || !songForm.title.trim()}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const payload = {
                          id: songForm.id,
                          title: songForm.title,
                          musicalKey: songForm.musicalKey,
                          tempoBpm: Number(songForm.tempoBpm) || undefined,
                          lyrics: songForm.lyrics || undefined,
                          chordChart: songForm.chordChart || undefined,
                          audioSampleUrl: songForm.audioSampleUrl || undefined,
                          sheetUrl: songForm.sheetUrl || undefined,
                          practiceTrackUrl: songForm.practiceTrackUrl || undefined,
                        };
                        if (songForm.id) {
                          await api.patch(`${base}/choir/songs/${songForm.id}`, payload);
                        } else {
                          await api.post(`${base}/choir/songs`, payload);
                        }
                        toast.success(songForm.id ? 'Song updated' : 'Song added');
                        setSongForm(emptySongForm());
                        setUploadSongId('');
                        refresh();
                      } catch (e) {
                        err(e, 'Could not save song');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {songForm.id ? 'Update song' : 'Add to library'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Upload files</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={uploadSongId}
                    onChange={(e) => setUploadSongId(e.target.value)}
                  >
                    <option value="">Attach to new song (use title above)</option>
                    {songs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                  <input ref={audioFileRef} type="file" accept="audio/*,.mp3,.wav,.m4a" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSongFile(f, 'audio'); e.target.value = ''; }} />
                  <input ref={sheetFileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSongFile(f, 'sheet'); e.target.value = ''; }} />
                  <input ref={practiceFileRef} type="file" accept="audio/*,.mp3,.wav,.m4a" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSongFile(f, 'practice'); e.target.value = ''; }} />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => audioFileRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5" /> Audio sample
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => sheetFileRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5" /> Sheet / PDF
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => practiceFileRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5" /> Practice track
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-1 text-sm">
                    <Sparkles className="h-4 w-4" /> AI transpose
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <select className="h-10 flex-1 rounded-md border bg-background px-3 text-sm" value={transposeId} onChange={(e) => setTransposeId(e.target.value)}>
                    <option value="">Select song…</option>
                    {songs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                  <Input type="number" className="w-24" value={semitones} onChange={(e) => setSemitones(e.target.value)} placeholder="± semitones" />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={async () => {
                      if (!transposeId) return;
                      setBusy(true);
                      try {
                        await api.post(`${base}/choir/songs/${transposeId}/transpose`, { semitones: Number(semitones), updateChordChart: true });
                        toast.success('Transposed');
                        refresh();
                      } catch (e) {
                        err(e, 'Transpose failed');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Transpose
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </section>
      )}

      {section === 'planning' && (
        <section className="space-y-3">
          {setlists.map((sl) => (
            <Card key={sl.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {sl.title} · {new Date(sl.serviceDate).toLocaleDateString()}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {sl.items.map((it) => (
                  <p key={it.id}>
                    {it.song.title}
                    {it.musicalKey ? ` (${it.musicalKey})` : ''}
                    {it.tempoBpm ? ` @ ${it.tempoBpm}` : ''}
                  </p>
                ))}
              </CardContent>
            </Card>
          ))}
          {canLead && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">New setlist & song</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Input placeholder="Setlist title" value={setlistForm.title} onChange={(e) => setSetlistForm({ ...setlistForm, title: e.target.value })} />
                <Input type="date" value={setlistForm.serviceDate} onChange={(e) => setSetlistForm({ ...setlistForm, serviceDate: e.target.value })} />
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    if (!setlistForm.title || !setlistForm.serviceDate) return;
                    setBusy(true);
                    try {
                      await api.post(`${base}/choir/setlists`, setlistForm);
                      toast.success('Setlist created');
                      refresh();
                    } catch (e) {
                      err(e, 'Could not create setlist');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Create setlist
                </Button>
                <select className="h-10 rounded-md border bg-background px-3 text-sm" value={setlistForm.songId} onChange={(e) => setSetlistForm({ ...setlistForm, songId: e.target.value })}>
                  <option value="">Add song to latest setlist…</option>
                  {songs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input placeholder="Key override" value={setlistForm.key} onChange={(e) => setSetlistForm({ ...setlistForm, key: e.target.value })} />
                  <Input type="number" placeholder="Tempo" value={setlistForm.tempo} onChange={(e) => setSetlistForm({ ...setlistForm, tempo: e.target.value })} />
                </div>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const sl = setlists[0];
                    if (!sl || !setlistForm.songId) return;
                    setBusy(true);
                    try {
                      await api.post(`${base}/choir/setlists/${sl.id}/items`, {
                        songId: setlistForm.songId,
                        musicalKey: setlistForm.key || undefined,
                        tempoBpm: Number(setlistForm.tempo) || undefined,
                      });
                      toast.success('Song added to setlist');
                      refresh();
                    } catch (e) {
                      err(e, 'Could not add to setlist');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Add song to setlist
                </Button>
                <hr />
                <p className="text-xs font-medium text-muted-foreground">Choir feedback (all members)</p>
                <select className="h-10 rounded-md border bg-background px-3 text-sm" value={feedbackForm.songId} onChange={(e) => setFeedbackForm({ ...feedbackForm, songId: e.target.value })}>
                  <option value="">Song…</option>
                  {songs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
                <Textarea placeholder="Comment" value={feedbackForm.comment} onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })} rows={2} />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || !canEdit}
                  className="gap-1"
                  onClick={async () => {
                    if (!feedbackForm.songId) return;
                    setBusy(true);
                    try {
                      await api.post(`${base}/choir/feedback`, {
                        songId: feedbackForm.songId,
                        setlistId: setlists[0]?.id,
                        rating: Number(feedbackForm.rating),
                        difficultyScore: Number(feedbackForm.difficulty),
                        comment: feedbackForm.comment,
                      });
                      toast.success('Feedback submitted');
                      refresh();
                    } catch (e) {
                      err(e, 'Could not submit feedback');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Star className="h-4 w-4" /> Submit feedback
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {section === 'attendance' && (
        <section className="space-y-3">
          {attendance?.metrics && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Badge variant="secondary">Records {attendance.metrics.total}</Badge>
              <Badge variant="secondary">Attended {attendance.metrics.attended}</Badge>
              <Badge variant="outline">Late {attendance.metrics.late}</Badge>
              <Badge variant="outline">Avg late {attendance.metrics.avgMinutesLate}m</Badge>
            </div>
          )}
          {canManage && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await api.post(`${base}/choir/attendance/send-follow-ups`, {});
                  toast.success(`Follow-ups queued (${res.data.followUpsQueued})`);
                  refresh();
                } catch (e) {
                  err(e, 'Follow-ups failed');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Automated follow-ups
            </Button>
          )}
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {(attendance?.records ?? []).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <span>
                  {formatMemberName(r.member)} · {ATTENDANCE_EVENTS.find((x) => x.value === r.eventType)?.label}
                  {r.attended ? (r.minutesLate > 0 ? ` · ${r.minutesLate}m late` : ' · on time') : ' · absent'}
                  <span className="ml-1 text-xs text-muted-foreground">{new Date(r.eventDate).toLocaleDateString()}</span>
                </span>
                {canLead && (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() =>
                        setAttForm({
                          id: r.id,
                          eventType: r.eventType,
                          eventDate: r.eventDate.slice(0, 10),
                          memberIds: [r.member.id],
                          minutesLate: String(r.minutesLate),
                          attended: r.attended,
                        })
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await api.delete(`${base}/choir/attendance/${r.id}`);
                          toast.success('Record removed');
                          refresh();
                        } catch (e) {
                          err(e, 'Could not delete');
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {canLead && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{attForm.id ? 'Edit attendance' : 'Log attendance (multi-select)'}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <select className="h-10 rounded-md border bg-background px-3 text-sm" value={attForm.eventType} onChange={(e) => setAttForm({ ...attForm, eventType: e.target.value })}>
                  {ATTENDANCE_EVENTS.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
                <Input type="date" value={attForm.eventDate} onChange={(e) => setAttForm({ ...attForm, eventDate: e.target.value })} />
                {!attForm.id && (
                  <>
                    <MemberMultiSelect
                      members={members}
                      selected={attForm.memberIds}
                      onChange={(ids) => setAttForm({ ...attForm, memberIds: ids, attended: true })}
                    />
                    <div className="grid gap-1.5">
                      <Label htmlFor="choir-attended-members" className="text-xs">
                        Attended
                      </Label>
                      <Input
                        id="choir-attended-members"
                        readOnly
                        value={attendedMemberLabels || 'Select members above to mark as attended'}
                        className="bg-muted/40 text-sm"
                        data-testid="choir-attendance-attended-summary"
                      />
                    </div>
                  </>
                )}
                {attForm.id && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={attForm.attended} onChange={(e) => setAttForm({ ...attForm, attended: e.target.checked })} />
                      Attended
                    </label>
                    <Input type="number" className="w-32" placeholder="Minutes late" value={attForm.minutesLate} onChange={(e) => setAttForm({ ...attForm, minutesLate: e.target.value })} />
                  </div>
                )}
                <Button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      if (attForm.id) {
                        await api.patch(`${base}/choir/attendance/${attForm.id}`, {
                          eventType: attForm.eventType,
                          eventDate: new Date(attForm.eventDate).toISOString(),
                          memberId: attForm.memberIds[0],
                          attended: attForm.attended,
                          minutesLate: Number(attForm.minutesLate) || 0,
                        });
                        toast.success('Attendance updated');
                      } else {
                        if (!attForm.memberIds.length) {
                          toast.error('Select at least one member');
                          return;
                        }
                        await api.post(`${base}/choir/attendance/bulk`, {
                          eventType: attForm.eventType,
                          eventDate: new Date(attForm.eventDate).toISOString(),
                          memberIds: attForm.memberIds,
                          attended: true,
                          minutesLate: Number(attForm.minutesLate) || 0,
                        });
                        toast.success(`Saved for ${attForm.memberIds.length} member(s)`);
                      }
                      setAttForm({
                        id: undefined,
                        eventType: 'REHEARSAL',
                        eventDate: new Date().toISOString().slice(0, 10),
                        memberIds: [],
                        minutesLate: '0',
                        attended: true,
                      });
                      refresh();
                    } catch (e) {
                      err(e, 'Could not save attendance');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {attForm.id ? 'Update record' : 'Save for selected members'}
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {section === 'talent' && (
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Auditions</h3>
            <ul className="mt-2 space-y-2">
              {auditions.map((a) => (
                <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                  <div>
                    {formatMemberName(a.member)} · <Badge>{a.status}</Badge>
                    {a.voicePart ? ` · ${a.voicePart}` : ''}
                    {a.recordingUrl && (
                      <a href={a.recordingUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-primary underline">
                        Listen to recording
                      </a>
                    )}
                  </div>
                  {canLead && (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() =>
                          setAuditionForm({
                            id: a.id,
                            memberId: a.member.id,
                            status: a.status,
                            voicePart: a.voicePart ?? 'SOPRANO',
                            auditionDate: a.auditionDate?.slice(0, 10) ?? '',
                            notes: a.notes ?? '',
                            recordingUrl: a.recordingUrl ?? '',
                          })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await api.delete(`${base}/choir/auditions/${a.id}`);
                            toast.success('Audition removed');
                            refresh();
                          } catch (e) {
                            err(e, 'Could not delete');
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Voice training tasks</h3>
            <ul className="mt-2 space-y-2">
              {voiceTasks.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                  <span>
                    {t.title} — {formatMemberName(t.member)}
                    {t.completedAt ? ' ✓' : t.dueDate ? ` (due ${new Date(t.dueDate).toLocaleDateString()})` : ''}
                  </span>
                  {canLead && (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() =>
                          setTaskForm({
                            id: t.id,
                            memberId: t.member.id,
                            title: t.title,
                            description: '',
                            dueDate: t.dueDate?.slice(0, 10) ?? '',
                          })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await api.delete(`${base}/choir/voice-tasks/${t.id}`);
                            toast.success('Task removed');
                            refresh();
                          } catch (e) {
                            err(e, 'Could not delete');
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Vocal notes</h3>
            <ul className="mt-2 space-y-2">
              {vocalNotes.map((n) => (
                <li key={n.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{formatMemberName(n.member)}</p>
                    <p className="text-muted-foreground">{n.body}</p>
                  </div>
                  {canLead && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await api.delete(`${base}/choir/vocal-notes/${n.id}`);
                          toast.success('Note removed');
                          refresh();
                        } catch (e) {
                          err(e, 'Could not delete');
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {canLead && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Leader tools</CardTitle>
                <CardDescription className="text-xs">Create, edit, and upload audition recordings.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="space-y-2 rounded-lg border p-3">
                  <Label className="text-xs font-semibold">{auditionForm.id ? 'Edit audition' : 'New audition'}</Label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={auditionForm.memberId} onChange={(e) => setAuditionForm({ ...auditionForm, memberId: e.target.value })}>
                    {members.map((m) => (
                      <option key={m.memberId} value={m.memberId}>
                        {formatMemberName(m.member)}
                      </option>
                    ))}
                  </select>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select className="h-10 rounded-md border bg-background px-3 text-sm" value={auditionForm.status} onChange={(e) => setAuditionForm({ ...auditionForm, status: e.target.value })}>
                      {AUDITION_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <select className="h-10 rounded-md border bg-background px-3 text-sm" value={auditionForm.voicePart} onChange={(e) => setAuditionForm({ ...auditionForm, voicePart: e.target.value })}>
                      {VOICE_PARTS.map((x) => (
                        <option key={x.value} value={x.value}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input type="date" value={auditionForm.auditionDate} onChange={(e) => setAuditionForm({ ...auditionForm, auditionDate: e.target.value })} />
                  <Textarea placeholder="Notes" rows={2} value={auditionForm.notes} onChange={(e) => setAuditionForm({ ...auditionForm, notes: e.target.value })} />
                  <input ref={auditionFileRef} type="file" accept="audio/*,.mp3,.wav,.m4a" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAuditionFile(f); e.target.value = ''; }} />
                  <Button type="button" size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => auditionFileRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" /> Upload recording
                  </Button>
                  {auditionForm.recordingUrl && (
                    <a href={auditionForm.recordingUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                      Current recording
                    </a>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const payload = { ...auditionForm, auditionDate: auditionForm.auditionDate || undefined };
                        if (auditionForm.id) {
                          await api.patch(`${base}/choir/auditions/${auditionForm.id}`, payload);
                        } else {
                          await api.post(`${base}/choir/auditions`, payload);
                        }
                        toast.success('Audition saved');
                        setAuditionForm({ id: undefined, memberId: members[0]?.memberId ?? '', status: 'SCHEDULED', voicePart: 'SOPRANO', auditionDate: '', notes: '', recordingUrl: '' });
                        refresh();
                      } catch (e) {
                        err(e, 'Could not save audition');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Save audition
                  </Button>
                </div>

                <div className="space-y-2 rounded-lg border p-3">
                  <Label className="text-xs font-semibold">{taskForm.id ? 'Edit voice task' : 'Voice training task'}</Label>
                  <Input placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
                  <Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        if (taskForm.id) {
                          await api.patch(`${base}/choir/voice-tasks/${taskForm.id}`, taskForm);
                        } else {
                          await api.post(`${base}/choir/voice-tasks`, taskForm);
                        }
                        toast.success('Task saved');
                        setTaskForm({ id: undefined, memberId: members[0]?.memberId ?? '', title: '', description: '', dueDate: '' });
                        refresh();
                      } catch (e) {
                        err(e, 'Could not save task');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Save task
                  </Button>
                </div>

                <div className="space-y-2 rounded-lg border p-3">
                  <Label className="text-xs font-semibold">Vocal improvement note</Label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={noteForm.memberId} onChange={(e) => setNoteForm({ ...noteForm, memberId: e.target.value })}>
                    {members.map((m) => (
                      <option key={m.memberId} value={m.memberId}>
                        {formatMemberName(m.member)}
                      </option>
                    ))}
                  </select>
                  <Textarea value={noteForm.body} onChange={(e) => setNoteForm({ ...noteForm, body: e.target.value })} rows={2} />
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await api.post(`${base}/choir/vocal-notes`, noteForm);
                        toast.success('Note saved');
                        setNoteForm({ memberId: members[0]?.memberId ?? '', body: '', improvementTag: '' });
                        refresh();
                      } catch (e) {
                        err(e, 'Could not save note');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Save vocal note
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </>
  );
}
