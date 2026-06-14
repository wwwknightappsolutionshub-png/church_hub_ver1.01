'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, LayoutDashboard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
import { normalizeDashboardMetrics } from '@/lib/dashboard-metrics';
import { CelebrationColumnsPanel } from '@/components/membership/CelebrationColumnsPanel';
import { Users, Megaphone, HeartHandshake, Bus } from 'lucide-react';

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
}

export function UnifiedAdminHub({ hub }: UnifiedAdminHubProps) {
  const metrics = normalizeDashboardMetrics(hub.metrics);
  const ops = hub.operations;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Members" value={metrics.membership.total.toLocaleString()} icon={Users} />
        <StatCard label="Outreach Contacts" value={metrics.evangelism.totalContacts.toLocaleString()} icon={Megaphone} />
        <StatCard
          label="Follow-up Rate"
          value={`${Math.round(metrics.followUp.completionRate * 100)}%`}
          icon={HeartHandshake}
        />
        <StatCard label="Active Rides" value={metrics.bus.activeRides} icon={Bus} />
      </div>

      <CelebrationColumnsPanel compact />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New members (7d)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{ops.newMembersThisWeek}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outreach sync queue</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{ops.outreachSyncPending}</CardContent>
        </Card>
        <Card className={ops.outreachSyncConflicts > 0 ? 'border-amber-500/50' : undefined}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sync conflicts</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-bold">
            {ops.outreachSyncConflicts}
            {ops.outreachSyncConflicts > 0 && (
              <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{ops.followUpsOpen}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutDashboard className="h-4 w-4" />
            Ministry modules
          </CardTitle>
          <CardDescription>Jump to operational areas — items marked need attention.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {hub.modules.map((mod) => (
              <li key={mod.key}>
                <Link
                  href={mod.path}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="font-medium">{mod.label}</span>
                  <span className="flex items-center gap-2">
                    {mod.status === 'attention' && (
                      <Badge variant="gold" className="text-[10px]">
                        Attention
                      </Badge>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="default" size="sm">
          <Link href="/dashboard/outreach">Resolve outreach sync</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/analytics">Membership analytics</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/automation">Automation hub</Link>
        </Button>
      </div>
    </div>
  );
}
