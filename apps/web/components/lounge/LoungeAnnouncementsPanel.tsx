'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Megaphone,
  Pin,
  Pencil,
  Plus,
  Radio,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const CATEGORY = 'Church Service';

interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  publishedAt: string;
}

interface LoungeAnnouncementsPanelProps {
  canManage: boolean;
}

function formatPublished(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

export function LoungeAnnouncementsPanel({ canManage }: LoungeAnnouncementsPanelProps) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useApiQuery<Announcement[]>(
    ['lounge-service-announcements'],
    `/communications/announcements?category=${encodeURIComponent(CATEGORY)}`,
  );
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', isPinned: false });

  const announcements = useMemo(() => {
    const list = data ?? [];
    return [...list].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [data]);

  const pinnedCount = announcements.filter((a) => a.isPinned).length;

  const resetForm = () => {
    setForm({ title: '', content: '', isPinned: false });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (a: Announcement) => {
    setForm({ title: a.title, content: a.content, isPinned: a.isPinned });
    setEditingId(a.id);
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: CATEGORY,
        isPinned: form.isPinned,
      };
      if (editingId) {
        await api.patch(`/communications/announcements/${editingId}`, payload);
        toast.success('Announcement updated');
      } else {
        await api.post('/communications/announcements', payload);
        toast.success('Announcement published');
      }
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['lounge-service-announcements'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save announcement'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/communications/announcements/${id}`);
      toast.success('Announcement removed');
      queryClient.invalidateQueries({ queryKey: ['lounge-service-announcements'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete'));
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-card shadow-sm dark:border-slate-800">
      <header className="relative shrink-0 overflow-hidden border-b border-slate-700/50 bg-slate-900 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,64,110,0.92) 55%, rgba(15,23,42,0.98) 100%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-3 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/90">
                <Radio className="h-3 w-3" aria-hidden />
                Lounge briefing
              </p>
              <h2 className="mt-1.5 font-heading text-lg font-bold tracking-tight sm:text-xl">
                Service announcements
              </h2>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-300 sm:text-sm">
                Official updates from worship and church services—pinned items stay at the top for
                every member in the lounge.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/10 shadow-inner">
                <Megaphone className="h-5 w-5 text-amber-200" aria-hidden />
              </span>
              {!isLoading && (
                <Badge
                  variant="outline"
                  className="border-white/20 bg-white/10 text-[10px] font-medium text-slate-100"
                >
                  {announcements.length} live
                </Badge>
              )}
            </div>
          </div>
          {canManage && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-fit border-white/25 bg-white/10 text-xs text-white hover:bg-white/20 hover:text-white"
              onClick={() => {
                if (showForm && !editingId) setShowForm(false);
                else {
                  resetForm();
                  setShowForm(true);
                }
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {showForm && !editingId ? 'Close composer' : 'New announcement'}
            </Button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/90 via-background to-background p-4 dark:from-slate-900/40">
        {canManage && showForm && (
          <form
            onSubmit={save}
            className="mb-4 space-y-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 shadow-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              {editingId ? 'Edit announcement' : 'Compose announcement'}
            </p>
            <Input
              className="h-9 text-sm"
              placeholder="Headline *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <textarea
              className="min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed shadow-sm"
              placeholder="Message for the congregation *"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border/80 bg-background/80 px-3 py-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="rounded border-input"
                checked={form.isPinned}
                onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
              />
              <Pin className="h-3.5 w-3.5 text-amber-600" />
              Feature at top of the briefing feed
            </label>
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="flex-1" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  'Save changes'
                ) : (
                  'Publish to lounge'
                )}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Loading briefing feed…</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300/80 bg-white/60 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/30">
            <Sparkles className="mb-3 h-8 w-8 text-slate-400" aria-hidden />
            <p className="text-sm font-semibold text-foreground">No announcements yet</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
              When leadership publishes service updates, they appear here for everyone visiting the
              lounge.
            </p>
          </div>
        ) : (
          <>
            {pinnedCount > 0 && (
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Featured · {pinnedCount}
              </p>
            )}
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li
                  key={a.id}
                  className={cn(
                    'group relative overflow-hidden rounded-lg border transition-shadow hover:shadow-md',
                    a.isPinned
                      ? 'border-amber-300/70 bg-gradient-to-br from-amber-50/90 via-white to-white shadow-sm dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900'
                      : 'border-slate-200/80 bg-white/90 dark:border-slate-700 dark:bg-slate-900/50',
                  )}
                >
                  {a.isPinned && (
                    <div
                      className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600"
                      aria-hidden
                    />
                  )}
                  <article className={cn('px-4 py-3.5', a.isPinned && 'pl-5')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {a.isPinned && (
                            <Badge
                              variant="gold"
                              className="gap-0.5 px-2 py-0 text-[10px] font-semibold uppercase tracking-wide"
                            >
                              <Pin className="h-2.5 w-2.5" />
                              Featured
                            </Badge>
                          )}
                          <time
                            dateTime={a.publishedAt}
                            className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                          >
                            {formatPublished(a.publishedAt)}
                          </time>
                        </div>
                        <h3 className="mt-1.5 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                          {a.title}
                        </h3>
                      </div>
                      {canManage && (
                        <div className="flex shrink-0 gap-0.5 opacity-80 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                            onClick={() => startEdit(a)}
                            aria-label="Edit announcement"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                            onClick={() => remove(a.id)}
                            aria-label="Delete announcement"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-5">
                      {a.content}
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
