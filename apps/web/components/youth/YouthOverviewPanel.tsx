'use client';

import Link from 'next/link';
import {
  Calendar,
  HeartHandshake,
  Library,
  MessageSquare,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { YOUTH_FEATURES } from '@/lib/youth/features';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useYouthContext } from './YouthProvider';

interface YouthStats {
  groups: number;
  members: number;
  events: number;
  openHelp: number;
  resources: number;
  channels: number;
  leaderboard: Array<{
    points: number;
    attendanceStreak: number;
    member: { firstName: string; lastName: string };
  }>;
}

export function YouthOverviewPanel() {
  const ctx = useYouthContext();
  const { data: stats } = useApiQuery<YouthStats>(['youth-stats'], '/youth/stats');

  const cards = [
    {
      label: 'Active groups',
      value: stats?.groups ?? 0,
      icon: Users,
      gradient: 'from-violet-500/20 to-fuchsia-500/20',
      iconColor: 'text-violet-600',
    },
    {
      label: 'Youth in groups',
      value: stats?.members ?? 0,
      icon: Users,
      gradient: 'from-indigo-500/20 to-blue-500/20',
      iconColor: 'text-indigo-600',
    },
    {
      label: 'Upcoming events',
      value: stats?.events ?? 0,
      icon: Calendar,
      gradient: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-600',
    },
    {
      label: 'Open help requests',
      value: stats?.openHelp ?? 0,
      icon: HeartHandshake,
      gradient: 'from-rose-500/20 to-pink-500/20',
      iconColor: 'text-rose-600',
    },
    {
      label: 'Published resources',
      value: stats?.resources ?? 0,
      icon: Library,
      gradient: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Moderated channels',
      value: stats?.channels ?? 0,
      icon: MessageSquare,
      gradient: 'from-cyan-500/20 to-sky-500/20',
      iconColor: 'text-cyan-600',
    },
  ];

  const visibleFeatures = YOUTH_FEATURES.filter(
    (f) => !f.leaderOnly || ctx?.permissions.moderateContent,
  );

  return (
    <div className="space-y-6">
      {ctx && (
        <Card className="overflow-hidden border-0 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 shadow-sm">
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <Shield className="h-5 w-5 text-emerald-600" aria-hidden />
            <div className="flex-1 text-sm">
              <p className="font-medium">
                {ctx.isLeader ? 'Leader access' : 'Youth member'}
                {ctx.memberName ? ` · ${ctx.memberName}` : ''}
              </p>
              <p className="text-muted-foreground">{ctx.safeMode.description}</p>
            </div>
            {ctx.gamification && (
              <Link
                href="/dashboard/youth/gamification"
                className="text-sm font-medium text-primary hover:underline"
              >
                {ctx.gamification.points} pts · Lv.{ctx.gamification.level}
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleFeatures.map((f) => (
          <Card
            key={f.key}
            className={cn(
              'overflow-hidden border-0 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg',
              f.color,
            )}
          >
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-background/80 p-2.5 shadow-sm">
                  <f.icon className="h-5 w-5 text-violet-600" aria-hidden />
                </span>
                <div>
                  <p className="font-heading font-semibold">{f.label}</p>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                className={cn(
                  f.key === 'feed' &&
                    'bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md hover:opacity-95',
                )}
                variant={f.key === 'feed' ? 'default' : 'outline'}
              >
                <Link href={f.href}>
                  <f.icon className="mr-2 h-4 w-4" aria-hidden />
                  Go
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card
            key={c.label}
            className={cn('overflow-hidden border-0 bg-gradient-to-br shadow-sm', c.gradient)}
          >
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className={cn('rounded-xl bg-background/80 p-2 shadow-sm', c.iconColor)}>
                <c.icon className="h-5 w-5" aria-hidden />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl font-extrabold tabular-nums">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden border-0 bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-orange-500/15">
        <CardHeader className="flex flex-row items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" aria-hidden />
          <CardTitle className="font-heading text-base">Top youth leaderboard 🏆</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2" aria-label="Leaderboard rankings">
            {(stats?.leaderboard ?? []).map((row, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span>
                  {i + 1}. {row.member.firstName} {row.member.lastName}
                </span>
                <span className="text-muted-foreground">
                  {row.points} pts · {row.attendanceStreak} wk streak
                </span>
              </li>
            ))}
            {!stats?.leaderboard?.length && (
              <p className="text-sm text-muted-foreground">
                Earn points across events, feed, chat, Q&A, and prayer.
              </p>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
