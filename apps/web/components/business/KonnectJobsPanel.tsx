'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Briefcase, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { JOB_TYPES } from '@/lib/konnect';
import { ListPagination } from '@/components/ui/list-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const JOBS_PAGE_SIZE = 20;

interface JobPosting {
  id: string;
  title: string;
  description: string;
  location?: string | null;
  jobType?: string | null;
  salaryRange?: string | null;
  contactEmail?: string | null;
  isActive?: boolean;
  source?: 'posting' | 'community';
  business?: { businessName: string; email?: string | null } | null;
}

interface PaginatedJobs {
  items: JobPosting[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface BusinessProfile {
  id: string;
  businessName: string;
}

export function KonnectJobsPanel() {
  const queryClient = useQueryClient();
  const { isChurchStaff } = useModuleAccess();
  const [page, setPage] = useState(1);
  const jobs = useApiQuery<PaginatedJobs>(
    ['konnect-jobs', String(page)],
    `/business/jobs?page=${page}&limit=${JOBS_PAGE_SIZE}`,
  );
  const profiles = useApiQuery<BusinessProfile[]>(['konnect-verified-biz'], '/business/profiles?verified=true');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    businessId: string;
    location: string;
    jobType: string;
    salaryRange: string;
    contactEmail: string;
  }>({
    title: '',
    description: '',
    businessId: '',
    location: '',
    jobType: JOB_TYPES[0],
    salaryRange: '',
    contactEmail: '',
  });

  const jobItems = jobs.data?.items ?? [];

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      await api.post('/business/jobs', {
        title: form.title.trim(),
        description: form.description.trim(),
        businessId: form.businessId || undefined,
        location: form.location || undefined,
        jobType: form.jobType,
        salaryRange: form.salaryRange || undefined,
        contactEmail: form.contactEmail || undefined,
      });
      toast.success('Job posted');
      setShowForm(false);
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['konnect-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['konnect-stats'] });
      queryClient.invalidateQueries({ queryKey: ['lounge-jobs'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not post job'));
    } finally {
      setSaving(false);
    }
  };

  const closeJob = async (id: string) => {
    try {
      if (isChurchStaff) {
        await api.delete(`/business/jobs/${id}`);
      } else {
        await api.patch(`/business/jobs/${id}`, { isActive: false });
      }
      toast.success('Job closed');
      queryClient.invalidateQueries({ queryKey: ['konnect-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['lounge-jobs'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not close job'));
    }
  };

  return (
    <div className="space-y-6" data-testid="konnect-jobs-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {jobs.data?.total ?? 0} opening{(jobs.data?.total ?? 0) === 1 ? '' : 's'} · church postings and
          approved community requests
        </p>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Post job
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
            <form onSubmit={createJob} className="contents">
              <Input className="sm:col-span-2" placeholder="Job title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.businessId}
                onChange={(e) => setForm({ ...form, businessId: e.target.value })}
              >
                <option value="">Church-wide (no business)</option>
                {(profiles.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.businessName}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.jobType}
                onChange={(e) => setForm({ ...form, jobType: e.target.value })}
              >
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <Input placeholder="Salary range" value={form.salaryRange} onChange={(e) => setForm({ ...form, salaryRange: e.target.value })} />
              <Input placeholder="Contact email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              <textarea
                className="min-h-[100px] rounded-md border border-input px-3 py-2 text-sm sm:col-span-2"
                placeholder="Description *"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
              <Button type="submit" disabled={saving} className="sm:col-span-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish job'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {jobs.isLoading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
      ) : jobItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No job openings on this page.</p>
      ) : (
        <div className="space-y-4">
          {jobItems.map((j) => (
            <Card key={j.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Briefcase className="h-4 w-4" />
                    {j.title}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {j.source === 'community' && (
                      <Badge variant="secondary">Community member</Badge>
                    )}
                    {j.jobType && <Badge variant="outline">{j.jobType}</Badge>}
                  </div>
                </div>
                {j.business && <p className="text-xs text-muted-foreground">{j.business.businessName}</p>}
                {j.source === 'community' && (
                  <p className="text-xs text-muted-foreground">Approved community support listing</p>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{j.description}</p>
                <p className="text-xs">
                  {[j.location, j.salaryRange, j.contactEmail ?? j.business?.email].filter(Boolean).join(' · ')}
                </p>
                {j.source !== 'community' && j.isActive && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => closeJob(j.id)}>
                    <Trash2 className="mr-1 h-3 w-3" />
                    Mark filled / close
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ListPagination
        page={jobs.data?.page ?? page}
        totalPages={jobs.data?.totalPages ?? 1}
        total={jobs.data?.total}
        pageSize={jobs.data?.limit ?? JOBS_PAGE_SIZE}
        onPage={setPage}
      />
    </div>
  );
}
