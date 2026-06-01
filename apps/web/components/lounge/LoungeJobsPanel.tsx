'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Building2,
  ChevronRight,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { JOB_TYPES } from '@/lib/konnect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface JobPosting {
  id: string;
  title: string;
  description: string;
  location?: string | null;
  jobType?: string | null;
  isActive: boolean;
}

interface LoungeJobsPanelProps {
  canManage: boolean;
}

const LOUNGE_JOB_LIMIT = 5;

export function LoungeJobsPanel({ canManage }: LoungeJobsPanelProps) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useApiQuery<JobPosting[]>(['lounge-jobs'], '/business/jobs');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    location: string;
    jobType: string;
  }>({
    title: '',
    description: '',
    location: '',
    jobType: JOB_TYPES[0],
  });

  const activeJobs = useMemo(() => (data ?? []).filter((j) => j.isActive), [data]);
  const previewJobs = activeJobs.slice(0, LOUNGE_JOB_LIMIT);
  const hasMoreJobs = activeJobs.length > LOUNGE_JOB_LIMIT;

  const resetForm = () => {
    setForm({ title: '', description: '', location: '', jobType: JOB_TYPES[0] });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (j: JobPosting) => {
    setForm({
      title: j.title,
      description: j.description,
      location: j.location ?? '',
      jobType: j.jobType ?? JOB_TYPES[0],
    });
    setEditingId(j.id);
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location || undefined,
        jobType: form.jobType,
      };
      if (editingId) {
        await api.patch(`/business/jobs/${editingId}`, payload);
        toast.success('Job updated');
      } else {
        await api.post('/business/jobs', payload);
        toast.success('Job posted');
      }
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['lounge-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['konnect-jobs'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save job'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this job opening?')) return;
    try {
      await api.delete(`/business/jobs/${id}`);
      toast.success('Job removed');
      queryClient.invalidateQueries({ queryKey: ['lounge-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['konnect-jobs'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not remove job'));
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-card shadow-sm dark:border-slate-800">
      <header className="relative shrink-0 overflow-hidden border-b border-slate-700/50 bg-slate-900 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(6,78,59,0.75) 50%, rgba(15,23,42,0.98) 100%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-6 top-0 h-28 w-28 rounded-full bg-emerald-400/15 blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-3 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200/90">
                <Users className="h-3 w-3" aria-hidden />
                Kingdom Konnect
              </p>
              <h2 className="mt-1.5 font-heading text-lg font-bold tracking-tight sm:text-xl">
                Job openings
              </h2>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-300 sm:text-sm">
                Opportunities shared with members in the lounge—connect your community to meaningful
                work inside and beyond the church.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/10 shadow-inner">
                <Briefcase className="h-5 w-5 text-emerald-200" aria-hidden />
              </span>
              {!isLoading && (
                <Badge
                  variant="outline"
                  className="border-white/20 bg-white/10 text-[10px] font-medium text-slate-100"
                >
                  {activeJobs.length} active
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
              {showForm && !editingId ? 'Close composer' : 'Post opening'}
            </Button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/90 via-background to-background p-4 dark:from-slate-900/40">
        {canManage && showForm && (
          <form
            onSubmit={save}
            className="mb-4 space-y-3 rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
              {editingId ? 'Edit opening' : 'Compose job posting'}
            </p>
            <Input
              className="h-9 text-sm"
              placeholder="Role title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              value={form.jobType}
              onChange={(e) => setForm({ ...form, jobType: e.target.value })}
            >
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <Input
              className="h-9 text-sm"
              placeholder="Location (optional)"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <textarea
              className="min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed shadow-sm"
              placeholder="Role description and how to apply *"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
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
            <p className="text-xs text-muted-foreground">Loading opportunities…</p>
          </div>
        ) : activeJobs.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300/80 bg-white/60 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/30">
            <Building2 className="mb-3 h-8 w-8 text-slate-400" aria-hidden />
            <p className="text-sm font-semibold text-foreground">No openings posted yet</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Share roles and volunteer opportunities here so members can discover them while in the
              lounge.
            </p>
          </div>
        ) : (
          <>
            {previewJobs.length < activeJobs.length && (
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Featured in lounge · {previewJobs.length} of {activeJobs.length}
              </p>
            )}
            <ul className="space-y-3">
              {previewJobs.map((j) => (
                <li
                  key={j.id}
                  className="group relative overflow-hidden rounded-lg border border-slate-200/80 bg-white/90 transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900/50"
                >
                  <div
                    className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600"
                    aria-hidden
                  />
                  <article className="px-4 py-3.5 pl-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {j.jobType && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-semibold uppercase tracking-wide"
                            >
                              {j.jobType}
                            </Badge>
                          )}
                          <Badge
                            variant="success"
                            className="text-[10px] font-semibold uppercase tracking-wide"
                          >
                            Open
                          </Badge>
                        </div>
                        <h3 className="mt-1.5 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                          {j.title}
                        </h3>
                      </div>
                      {canManage && (
                        <div className="flex shrink-0 gap-0.5 opacity-80 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                            onClick={() => startEdit(j)}
                            aria-label="Edit job opening"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                            onClick={() => remove(j.id)}
                            aria-label="Remove job opening"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-4">
                      {j.description}
                    </p>
                    {j.location && (
                      <p className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden />
                        {j.location}
                      </p>
                    )}
                  </article>
                </li>
              ))}
            </ul>
          </>
        )}

        {hasMoreJobs && (
          <Link
            href="/dashboard/business?tab=jobs"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:border-emerald-500/40 hover:from-emerald-500/15 dark:text-emerald-200"
          >
            View all {activeJobs.length} openings in Kingdom Konnect
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </section>
  );
}
