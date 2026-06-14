'use client';

import Link from 'next/link';
import { ArrowUpRight, Baby, Church, Home, Users } from 'lucide-react';
import type { MembershipDashboardStatsDto } from '@church-hub/shared-types';
import { CONGREGANTS_ROUTES } from '@/lib/membership/routes';

interface Props {
  stats: MembershipDashboardStatsDto;
}

export function CongregantsOverviewStats({ stats }: Props) {
  const cards = [
    {
      label: 'Members',
      value: stats.congregants,
      hint: 'Active congregants in registry',
      icon: Users,
      href: CONGREGANTS_ROUTES.members,
      accent: 'from-blue-600/20 to-indigo-600/5',
    },
    {
      label: 'Families',
      value: stats.families,
      hint: 'Household records',
      icon: Home,
      href: CONGREGANTS_ROUTES.families,
      accent: 'from-emerald-600/20 to-teal-600/5',
    },
    {
      label: 'Church Units',
      value: stats.churchUnits,
      hint: 'Service units & ministries',
      icon: Church,
      href: '/dashboard/service-units',
      accent: 'from-violet-600/20 to-purple-600/5',
    },
    {
      label: "Children's Church",
      value: stats.childrenChurch,
      hint: 'Youth & children enrolled',
      icon: Baby,
      href: '/dashboard/departments',
      accent: 'from-amber-600/20 to-orange-600/5',
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="membership-dashboard-stats">
      {cards.map(({ label, value, hint, icon: Icon, href, accent }) => {
        const testId = `stat-card-${label.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`;
        return (
          <Link
            key={label}
            href={href}
            data-testid={testId}
            className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700"
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-80`}
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900">
                <Icon className="h-5 w-5" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700 dark:group-hover:text-slate-200" />
            </div>
            <div className="relative mt-4">
              <p className="text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
                {value.toLocaleString()}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
