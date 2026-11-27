'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PlatformConsoleShell } from '@/components/platform/PlatformConsoleShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';

type GuideListItem = {
  id: string;
  kind: 'ABOUT' | 'POST';
  slug: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  showOnHomepage: boolean;
};

type GuideFaq = { question: string; answer: string };

type GuideDetail = GuideListItem & {
  summary: string;
  seoTitle: string;
  seoDescription: string;
  coverImagePath: string;
  coverImageAlt: string;
  bodyHtml: string;
  faqs: GuideFaq[];
  sortOrder: number;
};

const COVERS = [
  '/images/blog/about-church-hub.svg',
  '/images/blog/church-management-software.svg',
  '/images/blog/church-membership-software.svg',
  '/images/blog/first-time-guest-follow-up.svg',
  '/images/blog/church-discipleship-tracking.svg',
  '/images/blog/church-evangelism-tracking.svg',
];

function htmlToPlain(html: string): string {
  return html
    .replace(/<h2>/gi, '\n## ')
    .replace(/<\/h2>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function plainToHtml(text: string): string {
  const escape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line.startsWith('## ') ? `<h2>${escape(line.slice(3))}</h2>` : `<p>${escape(line)}</p>`,
    )
    .join('');
}

export default function PlatformBlogPage() {
  const qc = useQueryClient();
  const { hasPlatformPermission } = useModuleAccess();
  const canWrite = hasPlatformPermission('platform.content:write');
  const { data: list, isLoading } = useApiQuery<GuideListItem[]>(
    ['platform-guides'],
    '/platform/content/guides',
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<GuideDetail | null>(null);
  const [body, setBody] = useState('');

  const detailQuery = useApiQuery<GuideDetail>(
    ['platform-guide', selectedId ?? ''],
    `/platform/content/guides/${selectedId ?? ''}`,
    { enabled: !!selectedId },
  );

  useEffect(() => {
    if (!detailQuery.data) return;
    setDraft(detailQuery.data);
    setBody(htmlToPlain(detailQuery.data.bodyHtml));
  }, [detailQuery.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      const payload = {
        slug: draft.slug,
        title: draft.title,
        summary: draft.summary,
        seoTitle: draft.seoTitle,
        seoDescription: draft.seoDescription,
        coverImagePath: draft.coverImagePath,
        coverImageAlt: draft.coverImageAlt,
        bodyHtml: plainToHtml(body),
        faqs: draft.faqs.filter((faq) => faq.question.trim() && faq.answer.trim()),
        showOnHomepage: draft.showOnHomepage,
        sortOrder: draft.sortOrder,
        status: draft.status,
      };
      if (draft.id === 'new') {
        const { data } = await api.post<GuideDetail>('/platform/content/guides', payload);
        return data;
      }
      const { data } = await api.patch<GuideDetail>(`/platform/content/guides/${draft.id}`, payload);
      return data;
    },
    onSuccess: async (saved) => {
      toast.success('Saved');
      if (saved) setSelectedId(saved.id);
      await qc.invalidateQueries({ queryKey: ['platform-guides'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save')),
  });

  const startNew = () => {
    setSelectedId(null);
    setBody('');
    setDraft({
      id: 'new',
      kind: 'POST',
      slug: '',
      title: '',
      summary: '',
      seoTitle: '',
      seoDescription: '',
      coverImagePath: COVERS[1],
      coverImageAlt: '',
      bodyHtml: '',
      faqs: [
        { question: '', answer: '' },
        { question: '', answer: '' },
      ],
      status: 'DRAFT',
      showOnHomepage: false,
      sortOrder: 10,
    });
  };

  return (
    <PlatformConsoleShell
      title="About and blog"
      description="Edit the public About page and articles. Visitors only see published pages."
    >
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {list?.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className="block w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:border-primary/40"
            >
              <span className="font-medium">{item.title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {item.kind === 'ABOUT' ? 'About' : 'Article'} · {item.status === 'PUBLISHED' ? 'Published' : 'Draft'}
              </span>
            </button>
          ))}
          {canWrite ? (
            <Button type="button" variant="outline" className="w-full" onClick={startNew}>
              <Plus className="mr-2 h-4 w-4" />
              New article
            </Button>
          ) : null}
        </div>
        {draft ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guide-title">Title</Label>
                <Input id="guide-title" value={draft.title} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guide-slug">Address</Label>
                <Input id="guide-slug" value={draft.slug} disabled={!canWrite || draft.kind === 'ABOUT'} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="guide-summary">Summary</Label>
              <Textarea id="guide-summary" value={draft.summary} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guide-seo-title">Search title</Label>
                <Input id="guide-seo-title" value={draft.seoTitle} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, seoTitle: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guide-cover">Cover image</Label>
                <select
                  id="guide-cover"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.coverImagePath}
                  disabled={!canWrite}
                  onChange={(e) => setDraft({ ...draft, coverImagePath: e.target.value })}
                >
                  {COVERS.map((path) => (
                    <option key={path} value={path}>{path.split('/').pop()}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="guide-seo-desc">Search description</Label>
              <Textarea id="guide-seo-desc" value={draft.seoDescription} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, seoDescription: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guide-alt">Image description</Label>
              <Input id="guide-alt" value={draft.coverImageAlt} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, coverImageAlt: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guide-body">Article</Label>
              <Textarea id="guide-body" className="min-h-[320px]" value={body} disabled={!canWrite} onChange={(e) => setBody(e.target.value)} />
              <p className="text-xs text-muted-foreground">Start a line with ## for a heading. Blank lines start a new paragraph.</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.status === 'PUBLISHED'}
                disabled={!canWrite}
                onChange={(e) => setDraft({ ...draft, status: e.target.checked ? 'PUBLISHED' : 'DRAFT' })}
              />
              Published
            </label>
            <div className="space-y-3">
              <p className="text-sm font-medium">Questions</p>
              {draft.faqs.map((faq, index) => (
                <div key={index} className="grid gap-2">
                  <Input
                    value={faq.question}
                    disabled={!canWrite}
                    placeholder="Question"
                    onChange={(e) => {
                      const faqs = draft.faqs.slice();
                      faqs[index] = { ...faq, question: e.target.value };
                      setDraft({ ...draft, faqs });
                    }}
                  />
                  <Textarea
                    value={faq.answer}
                    disabled={!canWrite}
                    placeholder="Answer"
                    onChange={(e) => {
                      const faqs = draft.faqs.slice();
                      faqs[index] = { ...faq, answer: e.target.value };
                      setDraft({ ...draft, faqs });
                    }}
                  />
                </div>
              ))}
            </div>
            {draft.kind === 'POST' ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.showOnHomepage}
                  disabled={!canWrite}
                  onChange={(e) => setDraft({ ...draft, showOnHomepage: e.target.checked })}
                />
                Show on the homepage row
              </label>
            ) : null}
            {canWrite ? (
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            ) : null}
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Choose a page to edit.</p>
        )}
      </div>
    </PlatformConsoleShell>
  );
}
