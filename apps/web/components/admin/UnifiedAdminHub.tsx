'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  LayoutGrid,
  RefreshCw,
  UserPlus,
  Workflow,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { normalizeDashboardMetrics } from '@/lib/dashboard-metrics';
import { CelebrationColumnsPanel } from '@/components/membership/CelebrationColumnsPanel';
import { cn } from '@/lib/utils';

export interface UnifiedAdminHubDto {
  generatedAt: string;
  metrics: ReturnType<typeof normalizeDashboardMetrics> extends infer M ? M : never;
  operations: {
    newMembersThisWeek: number;
    outreachSyncPending: number;
    outreachSyncConflicts: number;
    communicationsQueuePending: number;
    followUpsOpen: number;
    automationRulesActive: number;
    communityHubPendingModeration: number;
  };
  modules: Array<{
    key: string;
    label: string;
    path: string;
    status: 'ok' | 'attention';
  }>;
}

interface UnifiedAdminHubProps {
  hub: UnifiedAdminHubDto;
  /** When true, skip celebrations (parent already renders them). */
  hideCelebrations?: boolean;
}

/** Operations pulse + ministry module grid — unique Admin Centre pieces (no metric StatCards). */
export function UnifiedAdminHub({ hub, hideCelebrations }: UnifiedAdminHubProps) {
  const ops = hub.operations;
  const attentionModules = hub.modules.filter((m) => m.status === 'attention').length;

  const opsCards = [
    {
      label: 'New members (7d)',
      value: ops.newMembersThisWeek,
      icon: UserPlus,
      tone: 'from-sky-500/15 to-indigo-600/5 border-sky-500/25',
      iconClass: 'bg-sky-600 text-white',
    },
    {
      label: 'Outreach sync queue',
      value: ops.outreachSyncPending,
      icon: RefreshCw,
      tone: 'from-violet-500/15 to-indigo-600/5 border-violet-500/25',
      iconClass: 'bg-violet-700 text-white',
    },
    {
      label: 'Sync conflicts',
      value: ops.outreachSyncConflicts,
      icon: AlertTriangle,
      tone:
        ops.outreachSyncConflicts > 0
          ? 'from-amber-500/20 to-orange-600/10 border-amber-500/40'
          : 'from-slate-500/10 to-slate-600/5 border-slate-300/40',
      iconClass:
        ops.outreachSyncConflicts > 0 ? 'bg-amber-600 text-white' : 'bg-slate-700 text-white',
      warn: ops.outreachSyncConflicts > 0,
    },
    {
      label: 'Open follow-ups',
      value: ops.followUpsOpen,
      icon: Workflow,
      tone: 'from-emerald-500/15 to-teal-600/5 border-emerald-500/25',
      iconClass: 'bg-emerald-700 text-white',
    },
  ] as const;

  return (
    <div className="space-y-6">
      {!hideCelebrations ? <CelebrationColumnsPanel compact /> : null}

      <section aria-labelledby="ops-pulse-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="ops-pulse-heading" className="font-heading text-base font-semibold text-slate-900 dark:text-slate-50">
              Operations pulse
            </h2>
            <p className="text-xs text-muted-foreground">
              Live queues and weekly intake — resolve attention items first.
            </p>
          </div>
          {attentionModules > 0 ? (
            <Badge className="border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-100">
              {attentionModules} module{attentionModules === 1 ? '' : 's'} need attention
            </Badge>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {opsCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={cn(
                  'relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 shadow-sm',
                  card.tone,
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg shadow-sm',
                      card.iconClass,
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  {'warn' in card && card.warn ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
                  ) : null}
                </div>
                <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
                  {card.value}
                </p>
                <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">{card.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      <Card className="border-slate-800/10 bg-[#0b1220] text-white shadow-md dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <LayoutGrid className="h-4 w-4 text-amber-300" />
            Ministry modules
          </CardTitle>
          <CardDescription className="text-slate-300">
            Jump to operational areas — gold marks items that need attention.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {hub.modules.map((mod) => (
              <li key={mod.key}>
                <Link
                  href={mod.path}
                  className={cn(
                    'group flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition',
                    mod.status === 'attention'
                      ? 'border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/15'
                      : 'border-white/10 bg-white/5 hover:bg-white/10',
                  )}
                >
                  <span className="font-medium text-slate-50">{mod.label}</span>
                  <span className="flex items-center gap-2">
                    {mod.status === 'attention' ? (
                      <Badge className="border-amber-300/50 bg-amber-400/25 text-[10px] text-amber-50">
                        Attention
                      </Badge>
                    ) : null}
                    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-amber-200" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm" className="bg-amber-400 text-slate-950 hover:bg-amber-300">
              <Link href="/dashboard/outreach">Resolve outreach sync</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/dashboard/analytics">Membership analytics</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/dashboard/automation">Automation hub</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
