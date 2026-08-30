'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Inbox, Loader2, Mail, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { PlatformConsoleShell } from '@/components/platform/PlatformConsoleShell';
import { PlatformMarketingSubmissionsPanel } from '@/components/platform/PlatformMarketingSubmissionsPanel';
import { HtmlRichEditor } from '@/components/ui/HtmlRichEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  category: string;
  subject: string;
  htmlBody: string;
  description: string | null;
  isDefault: boolean;
}

const EXPECTED_TEMPLATE_COUNT = 15;

const CATEGORY_ORDER = ['WELCOME', 'ONBOARDING', 'UPSELL', 'FEATURES', 'REENGAGEMENT'] as const;

const CATEGORY_LABEL: Record<string, string> = {
  WELCOME: 'Welcome',
  ONBOARDING: 'Onboarding',
  FEATURES: 'Features',
  REENGAGEMENT: 'Re-engagement',
  UPSELL: 'Upsell (Wisdom365+ & Spirify)',
};

export default function PlatformMarketingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') === 'submissions' ? 'submissions' : 'templates';
  const qc = useQueryClient();
  const { isPlatformOperator, hasPlatformPermission, isLoading: accessLoading } = useModuleAccess();
  const canAccess = isPlatformOperator && hasPlatformPermission('platform.marketing:read');
  const canWrite = hasPlatformPermission('platform.marketing:write');

  const { data: templates = [], isLoading } = useApiQuery<EmailTemplate[]>(
    ['platform-marketing-templates'],
    '/platform/marketing/templates',
    { enabled: canAccess },
  );

  const [slug, setSlug] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');

  const active = useMemo(
    () => templates.find((t) => t.slug === slug) ?? templates[0],
    [templates, slug],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, EmailTemplate[]>();
    for (const t of templates) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      label: CATEGORY_LABEL[c] ?? c,
      items: map.get(c) ?? [],
    }));
  }, [templates]);

  const missingCount = Math.max(0, EXPECTED_TEMPLATE_COUNT - templates.length);

  useEffect(() => {
    if (!accessLoading && !canAccess) router.replace('/dashboard/platform');
  }, [accessLoading, canAccess, router]);

  useEffect(() => {
    if (active && slug !== active.slug) {
      setSlug(active.slug);
      setSubject(active.subject);
      setHtmlBody(active.htmlBody);
    }
  }, [active, slug]);

  const seedMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<EmailTemplate[]>('/platform/marketing/seed');
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Marketing templates loaded (${data.length})`);
      qc.invalidateQueries({ queryKey: ['platform-marketing-templates'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not load templates')),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!slug) return;
      const { data } = await api.patch<EmailTemplate>(`/platform/marketing/templates/${slug}`, {
        subject,
        htmlBody,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Template saved');
      qc.invalidateQueries({ queryKey: ['platform-marketing-templates'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not save template')),
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
      title="Marketing"
      description={MODULE_DESCRIPTIONS.platformMarketing}
    >
      <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-3">
        <Button
          type="button"
          size="sm"
          variant={activeTab === 'templates' ? 'default' : 'outline'}
          onClick={() => router.replace('/dashboard/platform/marketing')}
        >
          <Mail className="mr-2 h-4 w-4" />
          Email templates
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeTab === 'submissions' ? 'default' : 'outline'}
          onClick={() => router.replace('/dashboard/platform/marketing?tab=submissions')}
        >
          <Inbox className="mr-2 h-4 w-4" />
          Contact & feedback
        </Button>
      </div>

      {activeTab === 'submissions' ? (
        <PlatformMarketingSubmissionsPanel canWrite={canWrite} />
      ) : (
        <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-normal">
          {templates.length} / {EXPECTED_TEMPLATE_COUNT} templates
        </Badge>
        {missingCount > 0 ? (
          <span className="text-xs text-amber-700 dark:text-amber-400">
            {missingCount} missing — click sync to add defaults
          </span>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="border-primary/35 bg-primary/5 font-semibold text-primary hover:bg-primary/10"
          disabled={seedMutation.isPending}
          onClick={() => seedMutation.mutate()}
        >
          {seedMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Sync all templates
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" />
              Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {isLoading ? (
              <p className="px-2 text-sm text-muted-foreground">Loading…</p>
            ) : templates.length === 0 ? (
              <p className="px-2 text-sm text-muted-foreground">
                No templates yet. Click &quot;Load default templates&quot;.
              </p>
            ) : (
              grouped.map((group) => (
                <div key={group.category} className="mb-3">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label} ({group.items.length})
                  </p>
                  <div className="space-y-1">
                    {group.items.map((t) => (
                      <button
                        key={t.slug}
                        type="button"
                        onClick={() => {
                          setSlug(t.slug);
                          setSubject(t.subject);
                          setHtmlBody(t.htmlBody);
                        }}
                        className={cn(
                          'flex w-full flex-col rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                          slug === t.slug
                            ? 'border-primary/50 bg-primary/10 font-semibold text-foreground ring-1 ring-primary/20'
                            : 'border-transparent',
                        )}
                      >
                        <span className="font-medium leading-snug">{t.name}</span>
                        {t.isDefault ? (
                          <span className="text-xs text-muted-foreground">Default welcome</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{active?.name ?? 'Select a template'}</CardTitle>
              {active?.isDefault ? <Badge>Default welcome</Badge> : null}
            </div>
            {active?.description ? (
              <CardDescription>{active.description}</CardDescription>
            ) : null}
            <p className="text-xs text-muted-foreground pt-1">
              Tokens: {'{{churchName}}'}, {'{{roleLabel}}'}, {'{{email}}'}, {'{{tempPassword}}'},
              {' {{loginUrl}}'}, {'{{churchSlug}}'}, {'{{moduleListHtml}}'}, {'{{featureName}}'},
              {' {{wisdom365Url}}'}, {'{{spirifyUrl}}'}, {'{{wisdom365Price}}'}, {'{{userFirstName}}'}
            </p>
            <p className="text-xs text-muted-foreground">
              Upsell drip (auto): 2h → <code className="rounded bg-muted px-1">upsell-premium-intro</code>,
              3d → Wisdom365+ or Spirify spotlight, 7d → final nudge. Skipped when church has an active
              Wisdom365+ subscription and at least one Spirify sermon upload.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject line</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>HTML body (WYSIWYG)</Label>
              <HtmlRichEditor value={htmlBody} onChange={setHtmlBody} minHeight="min-h-[360px]" />
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preview
              </p>
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: htmlBody }}
              />
            </div>
            <Button disabled={!canWrite || !slug || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save template
            </Button>
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </PlatformConsoleShell>
  );
}
