'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Devotional {
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  entries: Array<{ day?: number; title?: string; scripture?: string; reflection?: string }>;
  isActive: boolean;
}

export function CommDevotionalsPanel() {
  const { canManageCommunications } = useModuleAccess();
  const queryClient = useQueryClient();
  const devotionals = useApiQuery<Devotional[]>(['devotionals'], '/communications/devotionals');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    day1Title: '',
    day1Scripture: '',
    day1Reflection: '',
  });
  const [saving, setSaving] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate) return;
    setSaving(true);
    try {
      await api.post('/communications/devotionals', {
        title: form.title.trim(),
        description: form.description || undefined,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        entries: [
          {
            day: 1,
            title: form.day1Title || 'Day 1',
            scripture: form.day1Scripture,
            reflection: form.day1Reflection,
          },
        ],
      });
      toast.success('Devotional plan created');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['devotionals'] });
      queryClient.invalidateQueries({ queryKey: ['comm-stats'] });
    } catch {
      toast.error('Could not create plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {canManageCommunications && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New plan
          </Button>
        </div>
      )}

      {canManageCommunications && showForm && (
        <Card>
          <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
            <form onSubmit={create} className="contents">
              <Input className="sm:col-span-2" placeholder="Plan title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              <Input type="date" placeholder="End date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              <Input className="sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="Day 1 title" value={form.day1Title} onChange={(e) => setForm({ ...form, day1Title: e.target.value })} />
              <Input placeholder="Day 1 scripture" value={form.day1Scripture} onChange={(e) => setForm({ ...form, day1Scripture: e.target.value })} />
              <textarea
                className="min-h-[80px] rounded-md border border-input px-3 py-2 text-sm sm:col-span-2"
                placeholder="Day 1 reflection"
                value={form.day1Reflection}
                onChange={(e) => setForm({ ...form, day1Reflection: e.target.value })}
              />
              <Button type="submit" disabled={saving} className="sm:col-span-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create plan'}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {devotionals.isLoading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(devotionals.data ?? []).map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  {d.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {new Date(d.startDate).toLocaleDateString()}
                  {d.endDate ? ` – ${new Date(d.endDate).toLocaleDateString()}` : ''}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {d.description && <p className="text-muted-foreground">{d.description}</p>}
                <Badge variant="outline">{Array.isArray(d.entries) ? d.entries.length : 0} day entries</Badge>
                {Array.isArray(d.entries) && d.entries.slice(0, 2).map((e, i) => (
                  <div key={i} className="rounded border p-2 text-xs">
                    <p className="font-medium">{e.title ?? `Day ${e.day ?? i + 1}`}</p>
                    {e.scripture && <p className="text-muted-foreground">{e.scripture}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
