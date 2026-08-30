'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, Save } from 'lucide-react';
import {
  applyChurchLandingTemplate,
  fetchChurchLandingAdmin,
  formatLandingSaveError,
  saveChurchLandingAll,
} from '@/lib/church-landing-api';
import {
  ChurchLandingBrandingPanel,
  type ChurchLandingBrandingState,
} from '@/components/church-landing/ChurchLandingBrandingPanel';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { isChurchLeadershipRole } from '@/lib/session-role';
import { churchPublicPath, churchPublicPreviewPath } from '@/lib/church-slug';
import { ChurchLandingLivePreview } from '@/components/church-landing/ChurchLandingLivePreview';
import type {
  ChurchLandingAdminDto,
  ChurchLandingContent,
  LandingTemplateId,
  PublicChurchLandingDto,
} from '@church-hub/shared-types';
import { LANDING_TEMPLATE_IDS, normalizeChurchLanding } from '@church-hub/shared-types';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ChurchLandingMembershipFormTab } from '@/components/church-landing/ChurchLandingMembershipFormTab';
import { ChurchLandingSocialFeedTab } from '@/components/church-landing/ChurchLandingSocialFeedTab';
import { ChurchLandingCommunitySupportTab } from '@/components/church-landing/ChurchLandingCommunitySupportTab';
import { HeroSlideImageField } from '@/components/church-landing/HeroSlideImageField';
import { LandingImageUploadField } from '@/components/church-landing/LandingImageUploadField';
import { buildDefaultSocialFeed } from '@church-hub/shared-types';

function ListEditor<T extends { id?: string; title: string }>({
  items,
  onChange,
  renderItem,
  createItem,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, update: (patch: Partial<T>) => void) => React.ReactNode;
  createItem: () => T;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={item.id ?? index} className="rounded-lg border border-border p-3">
          {renderItem(item, index, (patch) => {
            const next = [...items];
            next[index] = { ...item, ...patch };
            onChange(next);
          })}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 text-destructive"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, createItem()])}>
        Add item
      </Button>
    </div>
  );
}

export default function ChurchLandingAdminPage() {
  const queryClient = useQueryClient();
  const { userRoles, churchSlug, churchName, isLoading: accessLoading } = useModuleAccess();
  const isAdmin = isChurchLeadershipRole(userRoles);
  const [draft, setDraft] = useState<ChurchLandingContent | null>(null);
  const [branding, setBranding] = useState<ChurchLandingBrandingState | null>(null);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState<number | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['church-landing-admin'],
    queryFn: () => fetchChurchLandingAdmin(),
    enabled: isAdmin,
  });

  useEffect(() => {
    if (data?.landing) {
      const normalized = normalizeChurchLanding(
        data.landing,
        churchName ?? data.churchName,
      );
      setDraft(
        normalized.socialFeed
          ? normalized
          : {
              ...normalized,
              socialFeed: buildDefaultSocialFeed(churchName ?? data.churchName),
            },
      );
    }
    if (data) {
      setBranding({
        publicDomain: data.publicDomain ?? data.defaultPublicDomain ?? '',
        logoUrl: data.logoUrl,
      });
    }
  }, [data?.landing, data?.publicDomain, data?.logoUrl, data?.defaultPublicDomain]);

  const saveMutation = useMutation({
    mutationFn: (payload: { content: ChurchLandingContent; branding: ChurchLandingBrandingState }) =>
      saveChurchLandingAll(
        payload.content,
        {
          publicDomain: payload.branding.publicDomain,
          logoUrl: payload.branding.logoUrl,
        },
        churchName ?? data?.churchName,
        churchSlug ?? data?.slug,
      ),
    onSuccess: (result) => {
      setDraft(normalizeChurchLanding(result.landing, result.churchName));
      setBranding({
        publicDomain: result.publicDomain,
        logoUrl: result.logoUrl,
      });
      queryClient.setQueryData(['church-landing-admin'], result);
      queryClient.invalidateQueries({ queryKey: ['comm-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['comm-stats'] });
      const siteUrl = result.publicSiteUrl ?? `https://${result.publicDomain}`;
      const message = result.landing.published
        ? `Landing page saved and published. Public site: ${siteUrl}`
        : 'Landing page saved.';
      setPublishNotice(message);
      setPreviewVersion(Date.now());
      toast.success('Landing page saved and published', {
        description: 'An in-app notification was sent to church administrators.',
        duration: 8000,
      });
    },
    onError: (err) => {
      setPublishNotice(null);
      toast.error(formatLandingSaveError(err));
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: (templateId: LandingTemplateId) => applyChurchLandingTemplate(templateId),
    onSuccess: (result) => {
      const normalized = normalizeChurchLanding(result.landing, result.churchName);
      setDraft(
        normalized.socialFeed
          ? normalized
          : {
              ...normalized,
              socialFeed: buildDefaultSocialFeed(result.churchName),
            },
      );
      setBranding({
        publicDomain: result.publicDomain,
        logoUrl: result.logoUrl,
      });
      queryClient.setQueryData(['church-landing-admin'], result);
      toast.success('Template applied — review and save to publish');
    },
    onError: (err) => toast.error(formatLandingSaveError(err)),
  });

  if (accessLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-heading text-xl font-semibold">Church administrators only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only users with the ADMIN role can manage the public landing page.
        </p>
      </div>
    );
  }

  if (!draft || !data || !branding) {
    return null;
  }

  const previewSlug = churchSlug ?? data.slug;
  const previewDomain = branding.publicDomain.trim() || data.defaultPublicDomain;

  const previewData: PublicChurchLandingDto = {
    churchName: churchName ?? data.churchName,
    slug: previewSlug,
    logoUrl: branding.logoUrl,
    publicDomain: previewDomain,
    defaultPublicDomain: data.defaultPublicDomain,
    publicSiteUrl: `https://${previewDomain}`,
    publicPath: `/c/${previewSlug}`,
    city: data.city,
    country: data.country,
    landing: draft,
    communitySupportItems: data.communitySupportItems,
  };

  return (
    <DashboardModuleShell
      eyebrow="Public presence"
      title="Church landing page"
      description={MODULE_DESCRIPTIONS.churchLanding}
      contentClassName="mx-auto max-w-[1600px] space-y-4 pb-8 pt-4 md:pt-5"
      actions={
        <>
          <Button variant="secondary" size="sm" asChild>
            <Link
              href={
                previewVersion != null
                  ? churchPublicPreviewPath(previewSlug, previewVersion)
                  : churchPublicPath(previewSlug)
              }
              target="_blank"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Preview
            </Link>
          </Button>
          <Button
            size="sm"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate({ content: draft, branding })}
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save & publish
          </Button>
        </>
      }
    >
      {publishNotice ? (
        <div
          role="status"
          className="flex gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-50"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          <div>
            <p className="font-medium">Published successfully</p>
            <p className="mt-1 text-emerald-900/90 dark:text-emerald-100/90">{publishNotice}</p>
            <p className="mt-2 text-xs text-emerald-800/80 dark:text-emerald-200/80">
              Check Communications → Push notifications for your admin alert.
            </p>
          </div>
        </div>
      ) : null}

      <ChurchLandingBrandingPanel
        slug={previewSlug}
        defaultPublicDomain={data.defaultPublicDomain}
        branding={branding}
        onChange={setBranding}
        disabled={saveMutation.isPending}
      />

      <div
        className="grid gap-4 xl:grid-cols-2 xl:items-stretch"
        data-testid="church-landing-editor-grid"
      >
        <div
          className="flex min-h-0 flex-col space-y-4"
          data-testid="church-landing-editor-column"
        >
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">Default template</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the layout members and visitors see at{' '}
          <code className="text-xs">{previewDomain}</code>
          {' · '}
          <code className="text-xs">/c/{previewSlug}</code>
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {LANDING_TEMPLATE_IDS.map((id) => {
            const meta = data.templates[id];
            const selected = draft.templateId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setDraft({ ...draft, templateId: id })}
                className={cn(
                  'rounded-xl border p-4 text-left transition',
                  selected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/40',
                )}
              >
                <p className="font-semibold">{meta.name}</p>
                <p className="mt-2 text-sm text-muted-foreground">{meta.description}</p>
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          disabled={applyTemplateMutation.isPending}
          onClick={() => {
            if (
              window.confirm(
                'Replace section content with the selected template defaults? Contact info will be kept.',
              )
            ) {
              applyTemplateMutation.mutate(draft.templateId);
            }
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset content from template
        </Button>
      </section>

      <label className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
        <input
          type="checkbox"
          checked={draft.published}
          onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium">Published (visible to the public)</span>
      </label>

      <Tabs defaultValue="hero">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="links">Quick links</TabsTrigger>
          <TabsTrigger value="reviews-youtube">Reviews & Messages</TabsTrigger>
          <TabsTrigger value="community-support">Community Support</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="membership-form">Membership form</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="mt-3 space-y-3 rounded-xl border border-border p-3">
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
            <h3 className="font-semibold">Hero carousel</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Full-width sliding images with text overlay. Upload photos from your device or paste a
              URL. Leave slide text blank to use the default copy below.
            </p>
            <div className="mt-4 space-y-4">
              {(draft.heroSlides ?? []).map((slide, index) => (
                <div key={slide.id ?? index} className="rounded-lg border border-border bg-card p-4">
                  <div className="grid gap-3">
                    <HeroSlideImageField
                      imageUrl={slide.imageUrl}
                      disabled={saveMutation.isPending}
                      onImageUrlChange={(url) => {
                        const heroSlides = [...(draft.heroSlides ?? [])];
                        heroSlides[index] = { ...slide, imageUrl: url };
                        setDraft({ ...draft, heroSlides });
                      }}
                    />
                    <div>
                      <Label>Slide headline (optional)</Label>
                      <Input
                        value={slide.headline ?? ''}
                        onChange={(e) => {
                          const heroSlides = [...(draft.heroSlides ?? [])];
                          heroSlides[index] = { ...slide, headline: e.target.value || undefined };
                          setDraft({ ...draft, heroSlides });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Slide subheadline (optional)</Label>
                      <Textarea
                        rows={2}
                        value={slide.subheadline ?? ''}
                        onChange={(e) => {
                          const heroSlides = [...(draft.heroSlides ?? [])];
                          heroSlides[index] = {
                            ...slide,
                            subheadline: e.target.value || undefined,
                          };
                          setDraft({ ...draft, heroSlides });
                        }}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-destructive"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        heroSlides: (draft.heroSlides ?? []).filter((_, i) => i !== index),
                      })
                    }
                  >
                    Remove slide
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDraft({
                    ...draft,
                    heroSlides: [
                      ...(draft.heroSlides ?? []),
                      {
                        id: `slide-${Date.now()}`,
                        imageUrl:
                          'https://images.unsplash.com/photo-1438234227774-98e995acda46?auto=format&fit=crop&w=1920&q=80',
                      },
                    ],
                  })
                }
              >
                Add slide
              </Button>
            </div>
          </div>

          <p className="text-sm font-medium text-muted-foreground">Default overlay text & CTAs</p>
          <div>
            <Label>Eyebrow</Label>
            <Input
              value={draft.hero.eyebrow ?? ''}
              onChange={(e) => setDraft({ ...draft, hero: { ...draft.hero, eyebrow: e.target.value } })}
            />
          </div>
          <div>
            <Label>Headline</Label>
            <Input
              value={draft.hero.headline}
              onChange={(e) => setDraft({ ...draft, hero: { ...draft.hero, headline: e.target.value } })}
            />
          </div>
          <div>
            <Label>Subheadline</Label>
            <Textarea
              value={draft.hero.subheadline ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, hero: { ...draft.hero, subheadline: e.target.value } })
              }
            />
          </div>
          {draft.templateId === 'modern' && (
            <>
              <div>
                <Label>Mandate title</Label>
                <Input
                  value={draft.mandate?.title ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      mandate: {
                        title: e.target.value,
                        quote: draft.mandate?.quote ?? '',
                        reference: draft.mandate?.reference,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label>Mandate quote</Label>
                <Textarea
                  value={draft.mandate?.quote ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      mandate: {
                        title: draft.mandate?.title ?? 'Our Mandate',
                        quote: e.target.value,
                        reference: draft.mandate?.reference,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label>Scripture reference</Label>
                <Input
                  value={draft.mandate?.reference ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      mandate: {
                        title: draft.mandate?.title ?? 'Our Mandate',
                        quote: draft.mandate?.quote ?? '',
                        reference: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="about" className="mt-3 space-y-3 rounded-xl border border-border p-3">
          <LandingImageUploadField
            label="Pastor photo"
            imageUrl={draft.about.pastorImageUrl}
            disabled={saveMutation.isPending}
            slot="about"
            previewClassName="aspect-[4/5] w-full max-w-xs object-cover object-top"
            placeholder="https://… or upload from device"
            hint="Shown in the About Us section. Upload from your device or paste a URL, then save & publish."
            testId="landing-about-photo-field"
            onImageUrlChange={(url) =>
              setDraft({
                ...draft,
                about: { ...draft.about, pastorImageUrl: url.trim() || undefined },
              })
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Pastor name</Label>
              <Input
                value={draft.about.pastorName ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    about: { ...draft.about, pastorName: e.target.value || undefined },
                  })
                }
                placeholder="Dr. Paul Enenche"
              />
            </div>
            <div>
              <Label>Pastor title</Label>
              <Input
                value={draft.about.pastorTitle ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    about: { ...draft.about, pastorTitle: e.target.value || undefined },
                  })
                }
                placeholder="Senior Pastor"
              />
            </div>
          </div>
          <div>
            <Label>Section title</Label>
            <Input
              value={draft.about.title}
              onChange={(e) => setDraft({ ...draft, about: { ...draft.about, title: e.target.value } })}
            />
          </div>
          <div>
            <Label>About text</Label>
            <Textarea
              rows={8}
              value={draft.about.body}
              onChange={(e) => setDraft({ ...draft, about: { ...draft.about, body: e.target.value } })}
            />
          </div>
        </TabsContent>

        <TabsContent value="services" className="mt-3 rounded-xl border border-border p-3">
          <ListEditor
            items={draft.serviceTimes}
            onChange={(serviceTimes) => setDraft({ ...draft, serviceTimes })}
            createItem={() => ({
              id: `svc-${Date.now()}`,
              title: 'New service',
              schedule: '10:00 AM',
            })}
            renderItem={(item, _i, update) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Title</Label>
                  <Input value={item.title} onChange={(e) => update({ title: e.target.value })} />
                </div>
                <div>
                  <Label>Schedule</Label>
                  <Input
                    value={item.schedule}
                    onChange={(e) => update({ schedule: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Note</Label>
                  <Input value={item.note ?? ''} onChange={(e) => update({ note: e.target.value })} />
                </div>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="links" className="mt-3 rounded-xl border border-border p-3">
          <ListEditor
            items={draft.quickLinks}
            onChange={(quickLinks) => setDraft({ ...draft, quickLinks })}
            createItem={() => ({
              id: `link-${Date.now()}`,
              title: 'New link',
              href: '#',
            })}
            renderItem={(item, _i, update) => (
              <div className="grid gap-3">
                <div>
                  <Label>Title</Label>
                  <Input value={item.title} onChange={(e) => update({ title: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={item.description ?? ''}
                    onChange={(e) => update({ description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Link (URL or #anchor)</Label>
                  <Input value={item.href} onChange={(e) => update({ href: e.target.value })} />
                </div>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="reviews-youtube" className="mt-3 rounded-xl border border-border p-3">
          <ChurchLandingSocialFeedTab
            draft={draft}
            churchName={churchName ?? data.churchName}
            onChange={setDraft}
          />
        </TabsContent>

        <TabsContent value="community-support" className="mt-3 rounded-xl border border-border p-3">
          <ChurchLandingCommunitySupportTab draft={draft} onChange={setDraft} />
        </TabsContent>

        <TabsContent value="announcements" className="mt-3 space-y-3 rounded-xl border border-border p-3">
          <p className="text-sm text-muted-foreground">
            Upload card images from your device or paste a URL for each announcement, then save &amp;
            publish.
          </p>
          <ListEditor
            items={draft.announcements}
            onChange={(announcements) => setDraft({ ...draft, announcements })}
            createItem={() => ({
              id: `ann-${Date.now()}`,
              title: 'Announcement',
              body: '',
              imageUrl:
                'https://images.unsplash.com/photo-1438234227774-98e995acda46?auto=format&fit=crop&w=800&q=80',
            })}
            renderItem={(item, _i, update) => (
              <div className="grid gap-3">
                <LandingImageUploadField
                  label="Card image"
                  imageUrl={item.imageUrl}
                  disabled={saveMutation.isPending}
                  slot="announcement"
                  previewClassName="aspect-[16/10] w-full object-cover"
                  testId="landing-announcement-image-field"
                  onImageUrlChange={(url) => update({ imageUrl: url.trim() || undefined })}
                />
                <div>
                  <Label>Title</Label>
                  <Input value={item.title} onChange={(e) => update({ title: e.target.value })} />
                </div>
                <div>
                  <Label>Date label</Label>
                  <Input
                    value={item.dateLabel ?? ''}
                    onChange={(e) => update({ dateLabel: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Body</Label>
                  <Textarea value={item.body} onChange={(e) => update({ body: e.target.value })} />
                </div>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="stats" className="mt-3 rounded-xl border border-border p-3">
          <p className="mb-4 text-sm text-muted-foreground">Shown on the Classic template.</p>
          <div className="space-y-4">
            {draft.stats.map((item, index) => (
              <div key={item.id ?? index} className="rounded-lg border border-border p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={item.label}
                      onChange={(e) => {
                        const stats = [...draft.stats];
                        stats[index] = { ...item, label: e.target.value };
                        setDraft({ ...draft, stats });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Value</Label>
                    <Input
                      value={item.value}
                      onChange={(e) => {
                        const stats = [...draft.stats];
                        stats[index] = { ...item, value: e.target.value };
                        setDraft({ ...draft, stats });
                      }}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-destructive"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      stats: draft.stats.filter((_, i) => i !== index),
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setDraft({
                  ...draft,
                  stats: [
                    ...draft.stats,
                    { id: `stat-${Date.now()}`, label: 'Label', value: '0' },
                  ],
                })
              }
            >
              Add stat
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="mt-3 space-y-3 rounded-xl border border-border p-3">
          <div>
            <Label>Address</Label>
            <Textarea
              value={draft.contact.address ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, contact: { ...draft.contact, address: e.target.value } })
              }
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={draft.contact.phone ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, contact: { ...draft.contact, phone: e.target.value } })
              }
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={draft.contact.email ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, contact: { ...draft.contact, email: e.target.value } })
              }
            />
          </div>
          <div>
            <Label>Footer tagline</Label>
            <Input
              value={draft.footerTagline ?? ''}
              onChange={(e) => setDraft({ ...draft, footerTagline: e.target.value })}
            />
          </div>
        </TabsContent>

        <TabsContent value="membership-form" className="mt-3">
          <ChurchLandingMembershipFormTab />
        </TabsContent>
      </Tabs>
        </div>

        <aside
          className="flex min-h-0 min-w-0 flex-col"
          data-testid="church-landing-preview-column"
        >
          <ChurchLandingLivePreview data={previewData} className="h-full" />
        </aside>
      </div>
    </DashboardModuleShell>
  );
}
