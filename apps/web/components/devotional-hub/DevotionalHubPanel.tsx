'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { BookOpen, Check, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { DevotionalPlanDto, DevotionalTodayDto } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDevotionalTab } from '@/lib/hooks/use-devotional-tab';
import {
  cacheDevotionalPlans,
  cacheDevotionalToday,
  isDevotionalOffline,
  readCachedDevotionalPlans,
  readCachedDevotionalToday,
} from '@/lib/devotional-cache';
import {
  cachePlansOffline,
  cacheTodayOffline,
  queueDevotionalPending,
  readOfflinePlans,
  readOfflineToday,
} from '@/lib/devotional-offline';
import {
  DEVOTIONAL_HUB_ROUTES,
  DEVOTIONAL_QUERY_KEYS,
  DEVOTIONAL_QUERY_STALE,
  type DevotionalHubTabId,
} from '@/lib/devotional-hub';
import {
  DevotionalActionPointsPanel,
  DevotionalAiToolsPanel,
  DevotionalChallengesPanel,
  DevotionalGroupsPanel,
  DevotionalJournalsPanel,
  DevotionalPrayerPanel,
  DevotionalRemindersPanel,
  DevotionalWeeklyReviewPanel,
  LAZY_DEVOTIONAL_TAB_PANELS,
} from '@/lib/devotional-hub-panels';
import { useDevotionalHubContext } from './DevotionalHubProvider';
import { DevotionalHubTabs } from './DevotionalHubTabs';
import { DevotionalTabPanel } from './DevotionalTabPanel';
import { useDevotionalOffline } from '@/lib/hooks/use-devotional-offline';
import { useDevotionalReminderSync } from '@/lib/hooks/use-devotional-reminder-sync';
import { DevotionalHubHero } from './DevotionalHubShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PaginatedPlans {
  items: DevotionalPlanDto[];
  total: number;
}

function MemberGate({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

export function DevotionalHubPanel() {
  const ctx = useDevotionalHubContext();
  useDevotionalReminderSync(!!ctx?.memberId);
  const { refreshPending } = useDevotionalOffline();
  const queryClient = useQueryClient();
  const { tab, setTab } = useDevotionalTab('today');
  const [visited, setVisited] = useState<Set<DevotionalHubTabId>>(
    () => new Set<DevotionalHubTabId>(['today']),
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    setVisited((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, [tab]);

  const cachedPlans = readCachedDevotionalPlans();

  const plans = useApiQuery<PaginatedPlans>(
    DEVOTIONAL_QUERY_KEYS.plans(),
    '/devotional-hub/plans?limit=20&includeDrafts=true',
    {
      staleTime: DEVOTIONAL_QUERY_STALE.plans,
      placeholderData: cachedPlans
        ? { items: cachedPlans, total: cachedPlans.length }
        : undefined,
      enabled: !isDevotionalOffline(),
    },
  );

  useEffect(() => {
    if (plans.data?.items?.length) {
      cacheDevotionalPlans(plans.data.items);
      void cachePlansOffline(plans.data.items);
    }
  }, [plans.data]);

  useEffect(() => {
    if (isDevotionalOffline() && !plans.data) {
      void readOfflinePlans().then((offline) => {
        if (offline?.items?.length) {
          queryClient.setQueryData(DEVOTIONAL_QUERY_KEYS.plans(), offline);
        }
      });
    }
  }, [plans.data, queryClient]);

  const activePlanId = useMemo(() => {
    if (selectedPlanId) return selectedPlanId;
    return plans.data?.items?.[0]?.id ?? null;
  }, [selectedPlanId, plans.data]);

  const todayCache =
    activePlanId && tab === 'today' ? readCachedDevotionalToday(activePlanId) : null;

  const today = useApiQuery<DevotionalTodayDto>(
    DEVOTIONAL_QUERY_KEYS.today(activePlanId ?? ''),
    `/devotional-hub/plans/${activePlanId}/today`,
    {
      enabled: !!activePlanId && tab === 'today' && !isDevotionalOffline(),
      staleTime: DEVOTIONAL_QUERY_STALE.today,
      placeholderData: todayCache ?? undefined,
    },
  );

  useEffect(() => {
    if (today.data && activePlanId) {
      cacheDevotionalToday(activePlanId, today.data);
      void cacheTodayOffline(activePlanId, today.data);
    }
  }, [today.data, activePlanId]);

  useEffect(() => {
    if (!activePlanId || tab !== 'today' || today.data) return;
    if (!isDevotionalOffline()) return;
    void readOfflineToday(activePlanId).then((offline) => {
      if (offline) {
        queryClient.setQueryData(DEVOTIONAL_QUERY_KEYS.today(activePlanId), offline);
      }
    });
  }, [activePlanId, tab, today.data, queryClient]);

  const markTab = useCallback((id: DevotionalHubTabId) => setTab(id), [setTab]);

  const markComplete = async () => {
    if (!activePlanId || !today.data) return;
    setCompleting(true);
    const body = {
      dayNumber: today.data.dayNumber,
      dayId: today.data.day.id.startsWith('legacy-') ? undefined : today.data.day.id,
    };
    try {
      if (isDevotionalOffline()) {
        await queueDevotionalPending('PLAN_COMPLETE', {
          planId: activePlanId,
          ...body,
        });
        toast.success('Saved offline — will sync when you are back online');
        await refreshPending();
        return;
      }
      await api.post(`/devotional-hub/plans/${activePlanId}/complete`, body);
      toast.success('Day marked complete');
      queryClient.invalidateQueries({ queryKey: DEVOTIONAL_QUERY_KEYS.progress(activePlanId) });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save progress'));
    } finally {
      setCompleting(false);
    }
  };

  const showTodayLoading = today.isLoading && !today.data;
  const planItems = plans.data?.items ?? cachedPlans ?? [];

  return (
    <>
      <DevotionalHubHero
        title="Devotional Hub"
        description="Enterprise-grade daily scripture, study plans, prayer, journals, and groups — optimized for mobile and offline use."
        badge={
          <Badge className="gap-1 border-emerald-700/50 bg-emerald-900/40 text-emerald-100">
            <BookOpen className="h-3 w-3" aria-hidden />
            {plans.data?.total ?? planItems.length} active plans
          </Badge>
        }
      />

      <DevotionalHubTabs tab={tab} onTabChange={markTab} />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 pb-24 sm:px-6 md:px-8 md:pb-8">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-card">
        {ctx && !ctx.memberId && (
          <Card className="border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/20">
            <CardContent className="py-3 text-sm text-muted-foreground">
              Link your account to a member profile to save journal entries, prayer lists, and study
              progress.
            </CardContent>
          </Card>
        )}

        <DevotionalTabPanel tabId="today" active={tab === 'today'} mounted={visited.has('today')}>
          <div className="space-y-4">
            <label htmlFor="devotional-plan-select" className="sr-only">
              Active reading plan
            </label>
            <select
              id="devotional-plan-select"
              className="h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
              value={activePlanId ?? ''}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              {planItems.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>

            {showTodayLoading && (
              <div className="space-y-3" aria-busy="true" aria-label="Loading today&apos;s reading">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-32 w-full" />
              </div>
            )}

            {today.data && (
              <Card className="border-emerald-200/50 bg-gradient-to-br from-emerald-50/40 to-background dark:from-emerald-950/20">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Day {today.data.dayNumber} · {today.data.day.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{today.data.planTitle}</p>
                </CardHeader>
                <CardContent className="space-y-4 text-sm leading-relaxed">
                  {today.data.day.scriptureRef && (
                    <p className="font-medium text-primary">{today.data.day.scriptureRef}</p>
                  )}
                  {today.data.day.scriptureText && <p>{today.data.day.scriptureText}</p>}
                  {today.data.day.reflection && <p>{today.data.day.reflection}</p>}
                  {today.data.day.prayerPrompt && (
                    <p className="rounded-md bg-muted/50 p-3 italic">{today.data.day.prayerPrompt}</p>
                  )}
                  {today.data.day.actionPoint && (
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Action: {today.data.day.actionPoint}
                    </p>
                  )}
                  {ctx?.memberId && (
                    <Button onClick={markComplete} disabled={completing}>
                      {completing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Check className="mr-2 h-4 w-4" aria-hidden />
                      )}
                      Mark today complete
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </DevotionalTabPanel>

        <DevotionalTabPanel tabId="plans" active={tab === 'plans'} mounted={visited.has('plans')}>
          <div className="space-y-4">
            {ctx?.canCreatePlans && (
              <div className="flex justify-end">
                <Button size="sm" asChild>
                  <Link href={DEVOTIONAL_HUB_ROUTES.planNew}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                    Create plan
                  </Link>
                </Button>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {planItems.map((p) => (
                <Card key={p.id} className="shadow-sm transition-shadow duration-150 hover:shadow-md">
                  <CardHeader
                    className={cn(
                      'cursor-pointer',
                      p.status === 'DRAFT' && 'border-l-4 border-l-amber-400',
                    )}
                    onClick={() => {
                      if (p.status === 'DRAFT') return;
                      setSelectedPlanId(p.id);
                      markTab('today');
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{p.title}</CardTitle>
                      {p.status === 'DRAFT' && <Badge variant="secondary">Draft</Badge>}
                    </div>
                    {p.description && (
                      <p className="text-sm text-muted-foreground">{p.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {new Date(p.startDate).toLocaleDateString()}
                      {p.dayCount != null && ` · ${p.dayCount} days`}
                    </span>
                    {p.status === 'DRAFT' && (
                      <Button variant="link" size="sm" className="h-auto p-0" asChild>
                        <Link href={DEVOTIONAL_HUB_ROUTES.planEdit(p.id)}>Edit draft</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DevotionalTabPanel>

        {LAZY_DEVOTIONAL_TAB_PANELS.map((tabId) => (
          <DevotionalTabPanel
            key={tabId}
            tabId={tabId}
            active={tab === tabId}
            mounted={visited.has(tabId)}
          >
            {tabId === 'reminders' &&
              (ctx?.memberId ? (
                <DevotionalRemindersPanel />
              ) : (
                <MemberGate>Link your account to a member profile to configure devotional reminders.</MemberGate>
              ))}
            {tabId === 'groups' &&
              (ctx?.memberId ? (
                <DevotionalGroupsPanel />
              ) : (
                <MemberGate>Link your member profile to create or join devotional groups.</MemberGate>
              ))}
            {tabId === 'study' && <DevotionalAiToolsPanel activePlanId={activePlanId} />}
            {tabId === 'actions' &&
              (ctx?.memberId ? (
                <DevotionalActionPointsPanel />
              ) : (
                <MemberGate>Link your member profile to create action points and reminders.</MemberGate>
              ))}
            {tabId === 'review' &&
              (ctx?.memberId ? (
                <DevotionalWeeklyReviewPanel />
              ) : (
                <MemberGate>Link your member profile for weekly review.</MemberGate>
              ))}
            {tabId === 'journal' &&
              (ctx?.memberId ? (
                <DevotionalJournalsPanel />
              ) : (
                <MemberGate>Link your member profile to use private and team journals.</MemberGate>
              ))}
            {tabId === 'prayer' &&
              (ctx?.memberId ? (
                <DevotionalPrayerPanel />
              ) : (
                <MemberGate>Link your member profile to use prayer lists and streaks.</MemberGate>
              ))}
            {tabId === 'challenges' &&
              (ctx?.memberId ? (
                <DevotionalChallengesPanel />
              ) : (
                <MemberGate>Link your member profile for challenges, badges, and weekly progress.</MemberGate>
              ))}
          </DevotionalTabPanel>
        ))}
        </div>
      </div>
    </>
  );
}
