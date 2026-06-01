'use client';

import Link from 'next/link';
import { Flame, Sparkles, Zap } from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { YOUTH_FEATURES } from '@/lib/youth/features';
import { useYouthContext } from './YouthProvider';
import { cn } from '@/lib/utils';

interface YouthStats {
  groups: number;
  members: number;
  events: number;
  openHelp: number;
}

export function YouthHubHero() {
  const ctx = useYouthContext();
  const { data: stats } = useApiQuery<YouthStats>(['youth-stats'], '/youth/stats');

  const visibleFeatures = YOUTH_FEATURES.filter(
    (f) => !f.leaderOnly || ctx?.permissions.moderateContent,
  ).slice(0, 4);

  return (
    <section className="relative overflow-hidden border-b">
      <div
        className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-500"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, white 0%, transparent 40%), radial-gradient(circle at 80% 70%, #fde047 0%, transparent 35%)',
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10 md:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl text-white">
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Youth Hub · Safe & fun
            </p>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
              Your space to grow, connect & shine ✨
            </h1>
            <p className="mt-3 text-sm text-white/90 sm:text-base">
              Groups, events, feed, chat, prayer wall, Q&A, and points — built mobile-first for
              your PWA.
            </p>
            {ctx?.gamification && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-black/20 px-4 py-2 text-sm font-medium backdrop-blur">
                <Zap className="h-4 w-4 text-yellow-300" />
                {ctx.gamification.points} XP · Level {ctx.gamification.level}
                {ctx.memberName ? ` · ${ctx.memberName}` : ''}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3">
            {[
              { label: 'Groups', value: stats?.groups ?? 0 },
              { label: 'Crew', value: stats?.members ?? 0 },
              { label: 'Events', value: stats?.events ?? 0 },
              { label: 'Help open', value: stats?.openHelp ?? 0 },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/25 bg-white/15 px-3 py-3 text-center text-white backdrop-blur"
              >
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-white/80">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <ul className="mt-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleFeatures.map((f) => (
            <li key={f.key}>
              <Link
                href={f.href}
                className={cn(
                  'inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25',
                )}
              >
                <f.icon className="h-4 w-4" aria-hidden />
                {f.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/dashboard/youth/feed"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-bold text-violet-700 shadow-lg transition hover:bg-white/95"
            >
              <Flame className="h-4 w-4" />
              Jump to feed
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
