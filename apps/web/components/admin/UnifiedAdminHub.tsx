'use client';

import Link from 'next/link';
import { ArrowRight, LayoutGrid } from 'lucide-react';
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

/** Ministry module grid — unique Admin Centre piece (no duplicated KPI StatCards). */
export function UnifiedAdminHub({ hub, hideCelebrations }: UnifiedAdminHubProps) {
  const attentionModules = hub.modules.filter((m) => m.status === 'attention').length;

  return (
    <div className="space-y-6">
      {!hideCelebrations ? <CelebrationColumnsPanel compact /> : null}

      <Card className="border-slate-800/10 bg-[#0b1220] text-white shadow-md dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <LayoutGrid className="h-4 w-4 text-amber-300" />
              Ministry modules
            </CardTitle>
            {attentionModules > 0 ? (
              <Badge className="border-amber-500/40 bg-amber-500/15 text-amber-50">
                {attentionModules} module{attentionModules === 1 ? '' : 's'} need attention
              </Badge>
            ) : null}
          </div>
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
