'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FilePlus2, Loader2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { PlatformConsoleShell } from '@/components/platform/PlatformConsoleShell';
import { HtmlRichEditor } from '@/components/ui/HtmlRichEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type CmsPage = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  htmlBody: string;
  status: 'DRAFT' | 'PUBLISHED';
  kind: string;
  isSystem: boolean;
  version: number;
  publishedAt: string | null;
  updatedAt: string;
};

const KIND_ORDER = ['PRIVACY', 'TERMS', 'COOKIE', 'DPA', 'CUSTOM'];

export default function PlatformContentPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { isPlatformOperator, hasPlatformPermission, isLoading: accessLoading } = useModuleAccess();
  const canAccess = isPlatformOperator && hasPlatformPermission('platform.content:read');
  const canWrite = hasPlatformPermission('platform.content:write');

  const { data: pages = [], isLoading } = useApiQuery<CmsPage[]>(
    ['platform-cms-pages'],
    '/platform/content/pages',
    { enabled: canAccess },
  );

  const [selectedId, setSelectedId] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const active = useMemo(
    () => pages.find((p) => p.id === selectedId) ?? pages[0],
    [pages, selectedId],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, CmsPage[]>();
    for (const p of pages) {
      const list = map.get(p.kind) ?? [];
      list.push(p);
      map.set(p.kind, list);
    }
    return KIND_ORDER.filter((k) => map.has(k)).map((k) => ({
      kind: k,
      items: map.get(k) ?? [],
    }));
  }, [pages]);

  useEffect(() => {
    if (!accessLoading && !canAccess) router.replace('/dashboard/platform');
  }, [accessLoading, canAccess, router]);

  useEffect(() => {
    if (!active) return;
    setSelectedId(active.id);
    setTitle(active.title);
    setSummary(active.summary ?? '');
    setHtmlBody(active.htmlBody);
    setStatus(active.status);
  }, [active?.id]);

  const seedMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<CmsPage[]>('/platform/content/seed');
      return data;
    },
    onSuccess: () => {
      toast.success('Default legal pages loaded');
      qc.invalidateQueries({ queryKey: ['platform-cms-pages'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not seed pages')),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!active) return;
      const { data } = await api.patch<CmsPage>(`/platform/content/pages/${active.id}`, {
        title,
        summary: summary || null,
        htmlBody,
        status,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Page saved');
      qc.invalidateQueries({ queryKey: ['platform-cms-pages'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not save page')),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<CmsPage>('/platform/content/pages', {
        slug: newSlug,
        title: newTitle,
        htmlBody: `<h2>${newTitle}</h2><p>Start writing…</p>`,
        kind: 'CUSTOM',
        status: 'DRAFT',
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success('Page created');
      setCreating(false);
      setNewSlug('');
      setNewTitle('');
      qc.invalidateQueries({ queryKey: ['platform-cms-pages'] });
      setSelectedId(data.id);
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not create page')),
  });

  if (accessLoading || !canAccess) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <PlatformConsoleShell
      title="Legal & CMS"
      description={MODULE_DESCRIPTIONS.platformContent}
      actions={
        canWrite ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={seedMutation.isPending}
              onClick={() => seedMutation.mutate()}
            >
              {seedMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Seed defaults
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setCreating((v) => !v)}>
              <FilePlus2 className="mr-2 h-4 w-4" />
              New page
            </Button>
          </div>
        ) : undefined
      }
    >
      {creating && canWrite ? (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Create custom page</CardTitle>
            <CardDescription>System legal slugs are seeded separately and cannot be deleted.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px] flex-1">
              <Label>Slug</Label>
              <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="about-us" />
            </div>
            <div className="min-w-[180px] flex-1">
              <Label>Title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="About us" />
            </div>
            <Button
              disabled={!newSlug.trim() || !newTitle.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Create
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pages</CardTitle>
            <CardDescription>{isLoading ? 'Loading…' : `${pages.length} pages`}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {grouped.map((g) => (
              <div key={g.kind}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.kind}
                </p>
                <ul className="space-y-1">
                  {g.items.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition',
                          active?.id === p.id
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800',
                        )}
                      >
                        <span className="truncate font-medium">{p.title}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'ml-2 shrink-0 text-[10px]',
                            active?.id === p.id && 'border-white/40 text-white dark:border-slate-700 dark:text-slate-900',
                          )}
                        >
                          {p.status === 'PUBLISHED' ? 'Live' : 'Draft'}
                        </Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!pages.length && !isLoading ? (
              <p className="text-sm text-muted-foreground">
                No pages yet. Click <strong>Seed defaults</strong> to load Privacy, Terms, Cookie, and DPA drafts.
                Seeded pages start as <strong>Draft</strong> — review with counsel, then set Status to Published.
              </p>
            ) : null}
          </CardContent>
        </Card>

        {active ? (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{active.title}</CardTitle>
                  <CardDescription>
                    /legal/{active.slug} · v{active.version}
                    {active.isSystem ? ' · system' : ''}
                  </CardDescription>
                </div>
                {canWrite ? (
                  <Button
                    size="sm"
                    disabled={saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={!canWrite}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={status}
                    disabled={!canWrite}
                    onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Summary</Label>
                <Input
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  disabled={!canWrite}
                  placeholder="Short description for listings"
                />
              </div>
              <div>
                <Label className="mb-2 block">Body</Label>
                {canWrite ? (
                  <HtmlRichEditor value={htmlBody} onChange={setHtmlBody} />
                ) : (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none rounded-md border p-4"
                    dangerouslySetInnerHTML={{ __html: htmlBody }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PlatformConsoleShell>
  );
}
