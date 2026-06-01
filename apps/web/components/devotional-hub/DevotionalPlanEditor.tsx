'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, History, Loader2, RefreshCw, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import type {
  DevotionalPlanDto,
  DevotionalPlanOutlineVersionDto,
  DevotionalPlanTone,
} from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { DEVOTIONAL_TONE_OPTIONS } from '@/lib/devotional-plan-constants';
import { DEVOTIONAL_HUB_ROUTES, DEVOTIONAL_QUERY_KEYS } from '@/lib/devotional-hub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const textareaClass =
  'flex min-h-[72px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

type PlanDetail = DevotionalPlanDto & {
  days: NonNullable<DevotionalPlanDto['days']>;
  outlineVersions?: DevotionalPlanOutlineVersionDto[];
};

export function DevotionalPlanEditor({ planId }: { planId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenTone, setRegenTone] = useState<DevotionalPlanTone>('ADULT');
  const [dayEdits, setDayEdits] = useState<Record<string, string>>({});

  const planQuery = useApiQuery<PlanDetail>(
    ['devotional-plan', planId],
    `/devotional-hub/plans/${planId}`,
  );

  const plan = planQuery.data;

  const getDayField = useCallback(
    (dayId: string, field: keyof PlanDetail['days'][0], fallback: string) => {
      const key = `${dayId}:${field}`;
      if (dayEdits[key] !== undefined) return dayEdits[key];
      const day = plan?.days.find((d) => d.id === dayId);
      const val = day?.[field];
      return typeof val === 'string' ? val : fallback;
    },
    [dayEdits, plan?.days],
  );

  const setDayField = (dayId: string, field: string, value: string) => {
    setDayEdits((prev) => ({ ...prev, [`${dayId}:${field}`]: value }));
  };

  const saveDraftMeta = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      await api.post('/devotional-hub/plans/drafts', {
        planId: plan.id,
        title: plan.title,
        description: plan.description ?? undefined,
        coverImageUrl: plan.coverImageUrl ?? undefined,
        sourceType: plan.sourceType,
        tone: plan.tone,
        durationDays: plan.durationDays ?? undefined,
        durationWeeks: plan.durationWeeks ?? undefined,
        days: plan.days.map((d) => ({
          dayNumber: d.dayNumber,
          title: getDayField(d.id, 'title', d.title),
          scriptureRef: getDayField(d.id, 'scriptureRef', d.scriptureRef ?? ''),
          reflection: getDayField(d.id, 'reflection', d.reflection ?? ''),
          prayerPrompt: getDayField(d.id, 'prayerPrompt', d.prayerPrompt ?? ''),
          actionPoint: getDayField(d.id, 'actionPoint', d.actionPoint ?? ''),
        })),
        generateOutline: false,
      });

      for (const d of plan.days) {
        if (d.id.startsWith('legacy-')) continue;
        const patch: Record<string, string> = {};
        const fields = ['title', 'scriptureRef', 'reflection', 'prayerPrompt', 'actionPoint'] as const;
        for (const f of fields) {
          const key = `${d.id}:${f}`;
          if (dayEdits[key] !== undefined) patch[f] = dayEdits[key];
        }
        if (Object.keys(patch).length > 0) {
          await api.patch(`/devotional-hub/plans/${planId}/days/${d.id}`, patch);
        }
      }

      toast.success('Draft saved');
      queryClient.invalidateQueries({ queryKey: ['devotional-plan', planId] });
      queryClient.invalidateQueries({ queryKey: DEVOTIONAL_QUERY_KEYS.plans() });
      setDayEdits({});
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save draft'));
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      await saveDraftMeta();
      await api.post(`/devotional-hub/plans/${planId}/publish`);
      toast.success('Plan published');
      queryClient.invalidateQueries({ queryKey: DEVOTIONAL_QUERY_KEYS.plans() });
      router.push(DEVOTIONAL_HUB_ROUTES.hub);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not publish'));
    } finally {
      setPublishing(false);
    }
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      await api.post(`/devotional-hub/plans/${planId}/regenerate-outline`, {
        tone: regenTone,
      });
      toast.success('Outline regenerated — previous version saved');
      queryClient.invalidateQueries({ queryKey: ['devotional-plan', planId] });
      setDayEdits({});
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not regenerate outline'));
    } finally {
      setRegenerating(false);
    }
  };

  const restoreVersion = async (versionId: string) => {
    try {
      await api.post(`/devotional-hub/plans/${planId}/versions/${versionId}/restore`);
      toast.success('Outline version restored');
      queryClient.invalidateQueries({ queryKey: ['devotional-plan', planId] });
      setDayEdits({});
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not restore version'));
    }
  };

  if (planQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) {
    return (
      <p className="p-8 text-center text-muted-foreground">
        Plan not found.{' '}
        <Link href={DEVOTIONAL_HUB_ROUTES.hub} className="text-primary underline">
          Back to hub
        </Link>
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 pb-28 md:p-8">
      <Link
        href={DEVOTIONAL_HUB_ROUTES.hub}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Devotional Hub
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{plan.title}</h1>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge variant={plan.status === 'DRAFT' ? 'secondary' : 'outline'}>
              {plan.status ?? 'PUBLISHED'}
            </Badge>
            {plan.tone && <Badge variant="outline">{plan.tone.replace('_', ' ')}</Badge>}
            {plan.outlineVersion != null && (
              <Badge variant="outline">v{plan.outlineVersion}</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={saveDraftMeta} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Save draft
          </Button>
          {plan.status === 'DRAFT' && (
            <Button size="sm" onClick={publish} disabled={publishing}>
              {publishing ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1 h-4 w-4" />
              )}
              Publish
            </Button>
          )}
        </div>
      </div>

      {plan.coverImageUrl && (
        <img
          src={plan.coverImageUrl}
          alt=""
          className="h-40 w-full rounded-lg object-cover"
        />
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Regenerate AI outline</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Tone</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={regenTone}
              onChange={(e) => setRegenTone(e.target.value as DevotionalPlanTone)}
            >
              {DEVOTIONAL_TONE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <Button variant="secondary" size="sm" onClick={regenerate} disabled={regenerating}>
            {regenerating ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-4 w-4" />
            )}
            Regenerate outline
          </Button>
        </CardContent>
      </Card>

      {(plan.outlineVersions?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Outline versions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.outlineVersions?.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>
                  Version {v.version}
                  {v.tone ? ` · ${v.tone}` : ''}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(v.createdAt).toLocaleString()}
                  </span>
                </span>
                <Button variant="ghost" size="sm" onClick={() => restoreVersion(v.id)}>
                  Restore
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Daily sections ({plan.days.length})
        </h2>
        {plan.days.map((day) => (
          <Card key={day.id}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Day {day.dayNumber}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              <div className="space-y-1">
                <Label className="text-xs">Title</Label>
                <Input
                  value={getDayField(day.id, 'title', day.title)}
                  onChange={(e) => setDayField(day.id, 'title', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Scripture reference</Label>
                <Input
                  value={getDayField(day.id, 'scriptureRef', day.scriptureRef ?? '')}
                  onChange={(e) => setDayField(day.id, 'scriptureRef', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reflection</Label>
                <textarea
                  className={textareaClass}
                  value={getDayField(day.id, 'reflection', day.reflection ?? '')}
                  onChange={(e) => setDayField(day.id, 'reflection', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prayer prompt</Label>
                <textarea
                  className={textareaClass}
                  value={getDayField(day.id, 'prayerPrompt', day.prayerPrompt ?? '')}
                  onChange={(e) => setDayField(day.id, 'prayerPrompt', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Action point</Label>
                <Input
                  value={getDayField(day.id, 'actionPoint', day.actionPoint ?? '')}
                  onChange={(e) => setDayField(day.id, 'actionPoint', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
