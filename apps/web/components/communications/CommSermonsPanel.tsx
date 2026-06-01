'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Disc3, ExternalLink, Loader2, Mic, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SermonAudioField } from '@/components/communications/SermonAudioField';

interface Sermon {
  id: string;
  title: string;
  speaker?: string | null;
  seriesName?: string | null;
  preachedAt?: string | null;
  durationSec?: number | null;
  audioUrl?: string | null;
  description?: string | null;
}

export function CommSermonsPanel() {
  const { canManageCommunications } = useModuleAccess();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const url = search ? `/communications/sermons?search=${encodeURIComponent(search)}` : '/communications/sermons';
  const sermons = useApiQuery<Sermon[]>(['sermons', search], url);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    speaker: '',
    seriesName: '',
    audioUrl: '',
    preachedAt: '',
    durationSec: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/communications/sermons', {
        title: form.title.trim(),
        speaker: form.speaker || undefined,
        seriesName: form.seriesName || undefined,
        audioUrl: form.audioUrl || undefined,
        preachedAt: form.preachedAt ? new Date(form.preachedAt).toISOString() : undefined,
        durationSec: form.durationSec ? parseInt(form.durationSec, 10) : undefined,
        description: form.description || undefined,
      });
      toast.success('Sermon added to archive');
      setShowForm(false);
      setForm({
        title: '',
        speaker: '',
        seriesName: '',
        audioUrl: '',
        preachedAt: '',
        durationSec: '',
        description: '',
      });
      queryClient.invalidateQueries({ queryKey: ['sermons'] });
      queryClient.invalidateQueries({ queryKey: ['comm-stats'] });
    } catch {
      toast.error('Could not add sermon');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Input className="max-w-xs" placeholder="Search archive…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/communications/sermons">
            <Disc3 className="mr-1.5 h-4 w-4" />
            Open Spirify player
          </Link>
        </Button>
        {canManageCommunications && (
          <Button size="sm" className="ml-auto" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add sermon
          </Button>
        )}
      </div>

      {canManageCommunications && showForm && (
        <Card>
          <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
            <form onSubmit={create} className="contents">
              <Input className="sm:col-span-2" placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <Input placeholder="Speaker" value={form.speaker} onChange={(e) => setForm({ ...form, speaker: e.target.value })} />
              <Input placeholder="Series" value={form.seriesName} onChange={(e) => setForm({ ...form, seriesName: e.target.value })} />
              <SermonAudioField
                audioUrl={form.audioUrl}
                disabled={saving}
                onAudioUrlChange={(audioUrl) => setForm((f) => ({ ...f, audioUrl }))}
                onDurationSec={(durationSec) =>
                  setForm((f) => ({
                    ...f,
                    durationSec: durationSec != null ? String(durationSec) : f.durationSec,
                  }))
                }
              />
              <Input type="date" value={form.preachedAt} onChange={(e) => setForm({ ...form, preachedAt: e.target.value })} />
              <Input placeholder="Duration (sec)" type="number" value={form.durationSec} onChange={(e) => setForm({ ...form, durationSec: e.target.value })} />
              <Button type="submit" disabled={saving} className="sm:col-span-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save to archive'}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {sermons.isLoading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(sermons.data ?? []).map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mic className="h-4 w-4" />
                  {s.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {s.speaker}{s.seriesName ? ` · ${s.seriesName}` : ''}
                  {s.preachedAt ? ` · ${new Date(s.preachedAt).toLocaleDateString()}` : ''}
                </p>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 text-sm">
                {s.audioUrl && <Badge variant="success">Audio</Badge>}
                {s.durationSec && <span className="text-xs text-muted-foreground">{Math.round(s.durationSec / 60)} min</span>}
                {s.audioUrl && (
                  <a href={s.audioUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    Source <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
