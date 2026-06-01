'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Award,
  ChevronDown,
  ChevronUp,
  Loader2,
  Medal,
  Plus,
  Target,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  DevotionalChallengeBadgeDto,
  DevotionalChallengeDetailDto,
  DevotionalChallengeDto,
  DevotionalChallengeLeaderboardDto,
  DevotionalChallengeWeeklyProgressDto,
  DevotionalGroupListDto,
} from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { DEVOTIONAL_QUERY_KEYS } from '@/lib/devotional-hub';
import { useDevotionalHubContext } from './DevotionalHubProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

function scopeLabel(scope: DevotionalChallengeDto['scope'], groupName?: string | null) {
  if (scope === 'INDIVIDUAL') {
    return (
      <span className="inline-flex items-center gap-1">
        <User className="h-3 w-3" /> Personal
      </span>
    );
  }
  if (scope === 'CHURCH') {
    return (
      <span className="inline-flex items-center gap-1">
        <Users className="h-3 w-3" /> Church-wide
      </span>
    );
  }
  return groupName ?? 'Group';
}

function defaultDates() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 14);
  return { startsAt: start.toISOString().slice(0, 10), endsAt: end.toISOString().slice(0, 10) };
}

export function DevotionalChallengesPanel() {
  const ctx = useDevotionalHubContext();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<'INDIVIDUAL' | 'CHURCH' | 'GROUP'>('INDIVIDUAL');
  const [groupId, setGroupId] = useState('');
  const [targetCount, setTargetCount] = useState('7');
  const [dates] = useState(defaultDates);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const challenges = useApiQuery<DevotionalChallengeDto[]>(
    DEVOTIONAL_QUERY_KEYS.challenges(),
    '/devotional-hub/challenges',
  );

  const weekly = useApiQuery<DevotionalChallengeWeeklyProgressDto>(
    DEVOTIONAL_QUERY_KEYS.challengeWeekly(),
    '/devotional-hub/challenges/weekly-progress',
  );

  const badges = useApiQuery<DevotionalChallengeBadgeDto[]>(
    DEVOTIONAL_QUERY_KEYS.challengeBadges(),
    '/devotional-hub/challenges/badges',
  );

  const groups = useApiQuery<DevotionalGroupListDto>(
    DEVOTIONAL_QUERY_KEYS.groups(),
    '/devotional-hub/groups',
  );

  const detail = useApiQuery<DevotionalChallengeDetailDto>(
    ['devotional-challenge-detail', expandedId ?? ''],
    `/devotional-hub/challenges/${expandedId}`,
    { enabled: !!expandedId },
  );

  const leaderboard = useApiQuery<DevotionalChallengeLeaderboardDto>(
    ['devotional-challenge-leaderboard', showLeaderboard ?? ''],
    `/devotional-hub/challenges/${showLeaderboard}/leaderboard`,
    { enabled: !!showLeaderboard },
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: DEVOTIONAL_QUERY_KEYS.challenges() });
    queryClient.invalidateQueries({ queryKey: DEVOTIONAL_QUERY_KEYS.challengeWeekly() });
    queryClient.invalidateQueries({ queryKey: DEVOTIONAL_QUERY_KEYS.challengeBadges() });
    if (expandedId) {
      queryClient.invalidateQueries({ queryKey: ['devotional-challenge-detail', expandedId] });
    }
  };

  const createChallenge = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api.post('/devotional-hub/challenges', {
        title,
        description: description || undefined,
        scope,
        groupId: scope === 'GROUP' ? groupId || undefined : undefined,
        targetCount: parseInt(targetCount, 10) || 7,
        startsAt: new Date(dates.startsAt).toISOString(),
        endsAt: new Date(dates.endsAt).toISOString(),
      });
      toast.success(
        scope === 'INDIVIDUAL' ? 'Personal challenge started' : 'Challenge published',
      );
      setShowCreate(false);
      setTitle('');
      setDescription('');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create challenge'));
    } finally {
      setBusy(false);
    }
  };

  const joinChallenge = async (id: string) => {
    setBusy(true);
    try {
      await api.post(`/devotional-hub/challenges/${id}/join`);
      toast.success('Joined — check Action points for your linked task');
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not join'));
    } finally {
      setBusy(false);
    }
  };

  const logProgress = async (id: string) => {
    setBusy(true);
    try {
      const { data } = await api.post<{ newBadges: Array<{ title: string }> }>(
        `/devotional-hub/challenges/${id}/progress`,
        { increment: 1 },
      );
      if (data.newBadges?.length) {
        toast.success(`Badge earned: ${data.newBadges.map((b) => b.title).join(', ')}`);
      } else {
        toast.success('Progress recorded');
      }
      invalidate();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not record progress'));
    } finally {
      setBusy(false);
    }
  };

  const canCreateGroupOrChurch =
    scope === 'INDIVIDUAL' || (scope === 'CHURCH' && ctx?.isLeader) || scope === 'GROUP';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            This week
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {weekly.isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {weekly.data && (
            <>
              <p className="text-sm text-muted-foreground">
                Week {weekly.data.weekKey}
                {weekly.data.badgesEarnedThisWeek > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                    <Medal className="h-3.5 w-3.5" />
                    {weekly.data.badgesEarnedThisWeek} badge
                    {weekly.data.badgesEarnedThisWeek === 1 ? '' : 's'} earned
                  </span>
                )}
              </p>
              {(weekly.data.challenges ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Join or start a challenge to track weekly progress here.
                </p>
              ) : (
                <ul className="space-y-2">
                  {weekly.data.challenges.map((c) => (
                    <li
                      key={c.challengeId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{scopeLabel(c.scope)}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p>
                          <span className="font-semibold text-foreground">{c.progressThisWeek}</span>{' '}
                          this week
                        </p>
                        <p className="text-muted-foreground">
                          {c.totalProgress}
                          {c.targetCount ? ` / ${c.targetCount}` : ''} total
                          {c.percentComplete != null ? ` (${c.percentComplete}%)` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {(badges.data ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4" />
              Your badges
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(badges.data ?? []).map((b, i) => (
              <Badge key={`${b.challengeId}-${b.badgeKey}-${i}`} variant="secondary" className="gap-1">
                <Medal className="h-3 w-3" />
                {b.title} · {b.challengeTitle}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4" />
            Active challenges
          </CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => setShowCreate((v) => !v)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            New
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showCreate && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Challenge name" />
              </div>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Scope</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={scope}
                    onChange={(e) => setScope(e.target.value as typeof scope)}
                  >
                    <option value="INDIVIDUAL">Personal</option>
                    <option value="GROUP">Group</option>
                    {ctx?.isLeader && <option value="CHURCH">Church-wide</option>}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Goal (check-ins)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={targetCount}
                    onChange={(e) => setTargetCount(e.target.value)}
                  />
                </div>
              </div>
              {scope === 'GROUP' && (
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                >
                  <option value="">Select group</option>
                  {(groups.data?.myGroups ?? []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
              <Button
                size="sm"
                onClick={createChallenge}
                disabled={busy || !canCreateGroupOrChurch || (scope === 'GROUP' && !groupId)}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {scope === 'INDIVIDUAL' ? 'Start personal challenge' : 'Publish challenge'}
              </Button>
            </div>
          )}

          {(challenges.data ?? []).map((c) => (
            <div key={c.id} className="rounded-md border">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {scopeLabel(c.scope, c.group?.name)}
                    {' · '}
                    {c.participantCount} participant{c.participantCount === 1 ? '' : 's'}
                    {c.joined && c.progressCount != null && (
                      <>
                        {' · '}
                        {c.progressCount}
                        {c.targetCount ? ` / ${c.targetCount}` : ''}
                        {c.percentComplete != null ? ` (${c.percentComplete}%)` : ''}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {!c.joined && c.scope !== 'INDIVIDUAL' && (
                    <Button type="button" size="sm" onClick={() => joinChallenge(c.id)} disabled={busy}>
                      Join
                    </Button>
                  )}
                  {c.joined && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => logProgress(c.id)}
                      disabled={busy}
                    >
                      +1 progress
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setExpandedId(expandedId === c.id ? null : c.id);
                      setShowLeaderboard(null);
                    }}
                  >
                    {expandedId === c.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {expandedId === c.id && detail.data && (
                <div className="space-y-2 border-t px-3 py-2 text-sm">
                  {detail.data.description && (
                    <p className="text-muted-foreground">{detail.data.description}</p>
                  )}
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Milestones
                  </p>
                  <ul className="space-y-1">
                    {detail.data.milestones.map((m) => (
                      <li
                        key={m.id}
                        className={cn(
                          'flex items-center justify-between rounded px-2 py-1',
                          m.earned ? 'bg-emerald-50/80 dark:bg-emerald-950/30' : 'bg-muted/40',
                        )}
                      >
                        <span>
                          {m.title} — {m.threshold} check-in{m.threshold === 1 ? '' : 's'}
                        </span>
                        {m.earned ? (
                          <Badge variant="outline" className="text-emerald-700">
                            Earned
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Locked</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {c.scope !== 'INDIVIDUAL' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-1"
                      onClick={() =>
                        setShowLeaderboard(showLeaderboard === c.id ? null : c.id)
                      }
                    >
                      {showLeaderboard === c.id ? 'Hide' : 'Show'} leaderboard
                    </Button>
                  )}
                  {showLeaderboard === c.id && leaderboard.data && (
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
                      {leaderboard.data.entries.map((e) => (
                        <li key={e.memberId}>
                          {e.name} — {e.progressCount}
                        </li>
                      ))}
                      {leaderboard.data.entries.length === 0 && (
                        <li className="list-none pl-0 text-muted-foreground">No entries yet</li>
                      )}
                    </ol>
                  )}
                </div>
              )}
            </div>
          ))}

          {!challenges.isLoading && (challenges.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              No active challenges. Start a personal challenge or ask a leader to publish one.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
