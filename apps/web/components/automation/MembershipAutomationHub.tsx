'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import {
  Bell,
  CalendarClock,
  Loader2,
  RefreshCw,
  Sparkles,
  Stethoscope,
  UserPlus,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AutomationSettings {
  weeklyWorkflowsEnabled: boolean;
  absenteeTriggersEnabled: boolean;
  firstTimerTriggersEnabled: boolean;
  newConvertTriggersEnabled: boolean;
  followUpRemindersEnabled: boolean;
  pastoralAlertsEnabled: boolean;
  syncEngineEnabled: boolean;
  recommendationsEnabled: boolean;
  lastWeeklyRunAt?: string | null;
}

interface AutomationStatus {
  settings: AutomationSettings;
  syncQueue: { pending: number; failed: number; synced: number };
  recentRuns: Array<{
    id: string;
    workflow: string;
    status: string;
    summary: string;
    startedAt: string;
  }>;
  followUp: { dueReminders: number; overdueCount: number };
}

interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  actionHref?: string;
}

const WORKFLOWS = [
  { id: 'WEEKLY_WORKFLOW', label: 'Weekly workflows', icon: CalendarClock },
  { id: 'ABSENTEE_TRIGGER', label: 'Absentee triggers', icon: Bell },
  { id: 'FIRST_TIMER_TRIGGER', label: 'First-timer triggers', icon: UserPlus },
  { id: 'NEW_CONVERT_TRIGGER', label: 'New convert triggers', icon: Sparkles },
  { id: 'FOLLOW_UP_REMINDER', label: 'Follow-up reminders', icon: RefreshCw },
  { id: 'PASTORAL_ALERT', label: 'Pastoral alerts', icon: Stethoscope },
  { id: 'SYNC_ENGINE', label: 'Background sync', icon: Zap },
  { id: 'RECOMMENDATION', label: 'Recommendations', icon: Sparkles },
] as const;

const DEFAULT_SETTINGS: AutomationSettings = {
  weeklyWorkflowsEnabled: true,
  absenteeTriggersEnabled: true,
  firstTimerTriggersEnabled: true,
  newConvertTriggersEnabled: true,
  followUpRemindersEnabled: true,
  pastoralAlertsEnabled: true,
  syncEngineEnabled: true,
  recommendationsEnabled: true,
  lastWeeklyRunAt: null,
};

function automationErrorMessage(err: AxiosError | null): string {
  const status = err?.response?.status;
  if (status === 403) {
    return 'You need church admin, pastor, member admin, or leader access to view automation.';
  }
  if (status === 401) return 'Session expired — sign in again.';
  if (!err?.response) {
    return 'Cannot reach the API. Start the Church API (port 4000) and ensure the database is running.';
  }
  if (status && status >= 500) {
    return 'Server error loading automation. Run Prisma migrations (phase 9 automation layer) and restart the API.';
  }
  return 'Could not load automation status.';
}

function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-1">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-6 w-24 animate-pulse rounded bg-muted" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function MembershipAutomationHub() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const {
    data: status,
    isLoading,
    isError,
    error,
    refetch,
  } = useApiQuery<AutomationStatus>(['automation-status'], '/automation/status');

  const { data: recommendations } = useApiQuery<Recommendation[]>(
    ['automation-recommendations'],
    '/automation/recommendations',
    { enabled: !isError && !!status },
  );
  const { data: pastoralPreview } = useApiQuery<{
    staleCounselingCases: number;
    openPrayerRequests: number;
  }>(['automation-pastoral-preview'], '/automation/pastoral-alerts/preview', {
    enabled: !isError && !!status,
    retry: false,
  });

  const displayStatus = useMemo((): AutomationStatus => {
    if (status) return status;
    return {
      settings: DEFAULT_SETTINGS,
      syncQueue: { pending: 0, failed: 0, synced: 0 },
      recentRuns: [],
      followUp: { dueReminders: 0, overdueCount: 0 },
    };
  }, [status]);

  const run = async (key: string, path: string) => {
    setBusy(key);
    try {
      await api.post(path);
      toast.success('Automation completed');
      queryClient.invalidateQueries({ queryKey: ['automation-status'] });
      queryClient.invalidateQueries({ queryKey: ['automation-recommendations'] });
    } catch {
      toast.error('Automation failed');
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (field: keyof AutomationSettings, value: boolean) => {
    try {
      await api.patch('/automation/settings', { [field]: value });
      queryClient.invalidateQueries({ queryKey: ['automation-status'] });
    } catch {
      toast.error('Could not update settings');
    }
  };

  const s = displayStatus.settings;
  const axiosErr = (error ?? null) as AxiosError | null;

  if (isLoading && !status) {
    return (
      <div className="space-y-6">
        <SummaryCardsSkeleton />
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isError && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
            <span>{automationErrorMessage(axiosErr)}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Sync queue</CardDescription>
            <CardTitle className="text-lg">
              {displayStatus.syncQueue.pending} pending · {displayStatus.syncQueue.failed} failed
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Follow-up</CardDescription>
            <CardTitle className="text-lg">
              {displayStatus.followUp.dueReminders} due · {displayStatus.followUp.overdueCount}{' '}
              overdue
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Pastoral preview</CardDescription>
            <CardTitle className="text-lg">
              {pastoralPreview?.staleCounselingCases ?? 0} cases ·{' '}
              {pastoralPreview?.openPrayerRequests ?? 0} prayers
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Last weekly run</CardDescription>
            <CardTitle className="text-base font-normal">
              {s.lastWeeklyRunAt ? new Date(s.lastWeeklyRunAt).toLocaleString() : 'Not yet run'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow toggles</CardTitle>
          <CardDescription>Per-church fail-safe switches (defaults on)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ['weeklyWorkflowsEnabled', 'Weekly workflows'],
              ['absenteeTriggersEnabled', 'Absentee triggers'],
              ['firstTimerTriggersEnabled', 'First-timer triggers'],
              ['newConvertTriggersEnabled', 'New convert triggers'],
              ['followUpRemindersEnabled', 'Follow-up reminders'],
              ['pastoralAlertsEnabled', 'Pastoral alerts'],
              ['syncEngineEnabled', 'Background sync'],
              ['recommendationsEnabled', 'Recommendations'],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>{label}</span>
              <input
                type="checkbox"
                checked={s[key]}
                disabled={isError}
                onChange={(e) => toggle(key, e.target.checked)}
              />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run workflows</CardTitle>
          <CardDescription>Manual triggers — same jobs as the background scheduler</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="default"
            disabled={!!busy || isError}
            onClick={() => run('weekly', '/automation/weekly')}
          >
            {busy === 'weekly' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Run weekly bundle
          </Button>
          {WORKFLOWS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant="outline"
              size="sm"
              disabled={!!busy || isError}
              onClick={() => run(id, `/automation/run/${id}`)}
            >
              {busy === id ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Icon className="mr-1 h-3 w-3" />
              )}
              {label}
            </Button>
          ))}
        </CardContent>
      </Card>

      {recommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Intelligent recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((r) => (
              <div key={r.id} className="rounded-md border px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={r.priority === 'high' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {r.priority}
                  </Badge>
                  <span className="font-medium">{r.title}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{r.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent automation runs</CardTitle>
        </CardHeader>
        <CardContent>
          {displayStatus.recentRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs logged yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {displayStatus.recentRuns.map((run) => (
                <li
                  key={run.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <span className="font-medium">{run.workflow.replace(/_/g, ' ')}</span>
                  <span
                    className={cn(
                      'text-xs uppercase',
                      run.status === 'SUCCESS' && 'text-emerald-600',
                      run.status === 'FAILED' && 'text-red-600',
                      run.status === 'SKIPPED' && 'text-muted-foreground',
                    )}
                  >
                    {run.status}
                  </span>
                  <span className="w-full text-muted-foreground">{run.summary}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(run.startedAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
