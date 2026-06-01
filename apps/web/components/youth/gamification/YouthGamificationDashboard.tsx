'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  Award,
  Flame,
  Loader2,
  Medal,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import type { YouthGamificationProfile, YouthLeaderboardRow } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { YOUTH_ROUTES } from '@/lib/youth/routes';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
}

export function YouthGamificationDashboard() {
  const queryClient = useQueryClient();
  const me = useApiQuery<YouthGamificationProfile>(['youth-gamification-me'], '/youth/gamification/me');
  const leaderboard = useApiQuery<YouthLeaderboardRow[]>(
    ['youth-leaderboard-v6'],
    '/youth/gamification/leaderboard',
  );
  const members = useApiQuery<MemberOption[]>(['youth-member-list'], '/youth/members');
  const badgeCatalog = useApiQuery<Array<{ id: string; name: string; pointsRequired: number }>>(
    ['youth-badges-v6'],
    '/youth/gamification/badges',
  );
  const [awardMemberId, setAwardMemberId] = useState('');
  const [points, setPoints] = useState('25');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['youth-gamification-me'] });
    queryClient.invalidateQueries({ queryKey: ['youth-leaderboard-v6'] });
    queryClient.invalidateQueries({ queryKey: ['youth-stats'] });
  };

  const awardPoints = async () => {
    if (!awardMemberId || !points) return;
    try {
      await api.post(`/youth/gamification/${awardMemberId}/points`, {
        points: parseInt(points, 10),
      });
      toast.success('Points awarded');
      invalidate();
    } catch {
      toast.error('Could not award points');
    }
  };

  const awardBadge = async (badgeId: string) => {
    if (!awardMemberId) {
      toast.error('Select a youth member first');
      return;
    }
    try {
      await api.post(`/youth/gamification/${awardMemberId}/badges/${badgeId}`);
      toast.success('Badge issued');
      invalidate();
    } catch {
      toast.error('Could not issue badge');
    }
  };

  const profile = me.data;

  return (
    <>
      <PageHeader
        title="Gamification"
        description="Points, XP levels, badges, challenges, and leaderboard."
        badge={
          <Link href={YOUTH_ROUTES.hub} className="text-sm text-muted-foreground hover:text-foreground">
            ← Youth hub
          </Link>
        }
      />
      <div className="space-y-6 p-6 md:p-8">
        {me.isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {profile && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-violet-200/50 bg-gradient-to-br from-violet-50/80 to-transparent dark:from-violet-950/30">
              <CardContent className="pt-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Level</p>
                <p className="text-3xl font-bold">{profile.level}</p>
                <p className="text-sm text-violet-700 dark:text-violet-300">{profile.tierTitle}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3.5 w-3.5" /> Points
                </p>
                <p className="text-3xl font-bold">{profile.points}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5" /> XP progress
                </p>
                <p className="text-lg font-semibold">
                  {profile.xp} / {profile.xp + profile.xpToNextLevel}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(100, (profile.xp / (profile.xp + profile.xpToNextLevel)) * 100)}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Flame className="h-3.5 w-3.5" /> Streak · Rank
                </p>
                <p className="text-3xl font-bold">{profile.attendanceStreak}</p>
                <p className="text-sm text-muted-foreground">
                  {profile.rank ? `#${profile.rank} on leaderboard` : 'Unranked'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(leaderboard.data ?? []).map((row) => (
                    <li
                      key={row.memberId}
                      className={cn(
                        'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
                        row.rank <= 3 && 'border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/20',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-6 font-bold text-muted-foreground">#{row.rank}</span>
                        {row.member.firstName} {row.member.lastName}
                        <Badge variant="outline" className="text-[10px]">
                          Lv.{row.level} {row.tierTitle}
                        </Badge>
                      </span>
                      <span className="font-medium">{row.points} pts</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4" />
                  Active challenges
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(profile?.challenges ?? []).map((ch) => (
                  <div key={ch.id} className="rounded-lg border p-3">
                    <div className="flex justify-between gap-2">
                      <p className="font-medium text-sm">{ch.title}</p>
                      <Badge variant="secondary">{ch.points} pts</Badge>
                    </div>
                    {ch.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{ch.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-emerald-500"
                          style={{
                            width: `${Math.min(100, (ch.progress / ch.targetCount) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {ch.progress}/{ch.targetCount}
                      </span>
                    </div>
                    {ch.completedAt ? (
                      <Badge variant="success" className="mt-2">
                        Completed
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 text-xs"
                        onClick={async () => {
                          try {
                            await api.post(`/youth/gamification/challenges/${ch.id}/progress`, {
                              increment: 1,
                            });
                            toast.success('Progress recorded');
                            invalidate();
                          } catch {
                            toast.error('Could not update progress');
                          }
                        }}
                      >
                        +1 progress (demo)
                      </Button>
                    )}
                  </div>
                ))}
                {!profile?.challenges?.length && (
                  <p className="text-sm text-muted-foreground">No active challenges.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Medal className="h-4 w-4" />
                  Your badges
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(profile?.badges ?? []).map((b) => (
                  <Badge key={b.badge.id} variant="gold" className="gap-1">
                    <Award className="h-3 w-3" />
                    {b.badge.name}
                  </Badge>
                ))}
                {!profile?.badges?.length && (
                  <p className="text-sm text-muted-foreground">Earn badges with points & achievements.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Achievements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(profile?.achievements ?? []).map((a) => (
                  <div key={a.id} className="rounded border border-emerald-200/50 bg-emerald-50/20 px-2 py-1.5 dark:bg-emerald-950/20">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  </div>
                ))}
                {!profile?.achievements?.length && (
                  <p className="text-muted-foreground">Unlock achievements by participating.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent activity</CardTitle>
              </CardHeader>
              <CardContent className="max-h-48 space-y-1 overflow-y-auto text-xs">
                {(profile?.recentLedger ?? []).map((l) => (
                  <div key={l.id} className="flex justify-between gap-2 border-b py-1 last:border-0">
                    <span className="text-muted-foreground">{l.reason}</span>
                    <span className={l.delta >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                      {l.delta >= 0 ? '+' : ''}
                      {l.delta}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leader tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={awardMemberId}
                  onChange={(e) => setAwardMemberId(e.target.value)}
                >
                  <option value="">Select youth…</option>
                  {(members.data ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    className="h-9"
                  />
                  <Button type="button" size="sm" onClick={awardPoints}>
                    Award pts
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(badgeCatalog.data ?? []).slice(0, 4).map((b) => (
                    <Button
                      key={b.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px]"
                      onClick={() => awardBadge(b.id)}
                    >
                      Issue {b.name}
                    </Button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Badges also auto-issue when point thresholds are met.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
