'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Megaphone, Pin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { ANNOUNCEMENT_CATEGORIES } from '@/lib/communications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category?: string | null;
  isPinned: boolean;
  publishedAt: string;
  expiresAt?: string | null;
}

export function CommAnnouncementsPanel() {
  const { canManageCommunications } = useModuleAccess();
  const queryClient = useQueryClient();
  const announcements = useApiQuery<Announcement[]>(['announcements'], '/communications/announcements');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'General', isPinned: false });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      await api.post('/communications/announcements', form);
      toast.success('Announcement published');
      setShowForm(false);
      setForm({ title: '', content: '', category: 'General', isPinned: false });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['comm-stats'] });
    } catch {
      toast.error('Could not publish');
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (a: Announcement) => {
    try {
      await api.patch(`/communications/announcements/${a.id}`, { isPinned: !a.isPinned });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    } catch {
      toast.error('Could not update');
    }
  };

  return (
    <div className="space-y-6">
      {canManageCommunications && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New announcement
          </Button>
        </div>
      )}

      {canManageCommunications && showForm && (
        <Card>
          <CardContent className="grid gap-3 pt-6">
            <form onSubmit={create} className="space-y-3">
              <Input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {ANNOUNCEMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <textarea
                className="min-h-[120px] w-full rounded-md border border-input px-3 py-2 text-sm"
                placeholder="Content *"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                required
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} />
                Pin to top of feed
              </label>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {announcements.isLoading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
      ) : (
        <div className="space-y-4">
          {(announcements.data ?? []).map((a) => (
            <Card key={a.id} className={a.isPinned ? 'border-amber-200/60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Megaphone className="h-4 w-4 text-primary" />
                    {a.title}
                  </CardTitle>
                  <div className="flex gap-1">
                    {a.isPinned && <Badge variant="gold"><Pin className="mr-1 h-3 w-3" />Pinned</Badge>}
                    {a.category && <Badge variant="outline">{a.category}</Badge>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(a.publishedAt).toLocaleString()}</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="whitespace-pre-wrap text-muted-foreground">{a.content}</p>
                {canManageCommunications && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => togglePin(a)}>
                    {a.isPinned ? 'Unpin' : 'Pin'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
