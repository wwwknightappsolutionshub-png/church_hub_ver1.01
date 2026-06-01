'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Award, ExternalLink, Flame, Loader2, Medal, Star } from 'lucide-react';
import { toast } from 'sonner';
import type { YouthLeaderboardRow } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { YOUTH_ROUTES } from '@/lib/youth/routes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface BadgeDef {
  id: string;
  name: string;
  description?: string | null;
  pointsRequired: number;
}

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
}

/** Compact gamification tab on the youth hub; full UI at `/dashboard/youth/gamification`. */
export function YouthGamificationPanel() {
  const queryClient = useQueryClient();
  const leaderboard = useApiQuery<YouthLeaderboardRow[]>(
    ['youth-leaderboard-v6'],
    '/youth/gamification/leaderboard',
  );
  const badges = useApiQuery<BadgeDef[]>(['youth-badges-v6'], '/youth/gamification/badges');
  const members = useApiQuery<MemberOption[]>(['youth-member-list'], '/youth/members');
  const [awardMemberId, setAwardMemberId] = useState('');
  const [points, setPoints] = useState('25');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['youth-leaderboard-v6'] });
    queryClient.invalidateQueries({ queryKey: ['youth-gamification-me'] });
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
      toast.success('Badge awarded');
      invalidate();
    } catch {
      toast.error('Could not award badge');
    }
  };

  if (leaderboard.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button asChild size="sm" variant="outline">
          <Link href={YOUTH_ROUTES.gamification}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Full gamification dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Award points or badges</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <select
            className="h-10 min-w-[180px] flex-1 rounded-md border border-input bg-background px-3 text-sm"
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
          <Input className="w-24" type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
          <Button onClick={awardPoints}>Award points</Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Medal className="h-5 w-5 text-amber-500" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(leaderboard.data ?? []).map((row) => (
              <div
                key={row.memberId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {row.rank}
                  </span>
                  <div>
                    <p className="font-medium">
                      {row.member.firstName} {row.member.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Lv.{row.level} {row.tierTitle}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {row.badges.map((b) => (
                        <Badge key={b.badge.id} variant="secondary" className="text-xs">
                          {b.badge.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500" />
                    {row.points} pts
                  </span>
                  <span className="flex items-center gap-1 text-orange-600">
                    <Flame className="h-4 w-4" />
                    {row.attendanceStreak} wk
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4" />
              Badge catalog
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(badges.data ?? []).map((b) => (
              <div key={b.id} className="rounded border p-3">
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.description}</p>
                <p className="mt-1 text-xs">{b.pointsRequired} pts required</p>
                <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => awardBadge(b.id)}>
                  Award to selected
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Auto points: RSVP +10 · Check-in +25 · Post +15 · Comment +3 · Chat +3 · Help resolved +15
      </p>
    </div>
  );
}
