'use client';

import Link from 'next/link';
import { Baby, Church, Home, Users } from 'lucide-react';
import type { MembershipDashboardStatsDto } from '@church-hub/shared-types';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  stats: MembershipDashboardStatsDto;
  onNavigate?: (tab: 'members' | 'families') => void;
}

export function MembershipDashboardStats({ stats, onNavigate }: Props) {
  const cards: Array<{
    label: string;
    value: number;
    icon: typeof Home;
    href?: string;
    action?: () => void;
  }> = [
    {
      label: 'Families',
      value: stats.families,
      icon: Home,
      action: () => onNavigate?.('families'),
    },
    {
      label: 'Church Units',
      value: stats.churchUnits,
      icon: Church,
      href: '/dashboard/service-units',
    },
    {
      label: 'Congregants',
      value: stats.congregants,
      icon: Users,
      action: () => onNavigate?.('members'),
    },
    {
      label: "Children's Church",
      value: stats.childrenChurch,
      icon: Baby,
      href: '/dashboard/departments',
    },
  ] ;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="membership-dashboard-stats">
      {cards.map(({ label, value, icon: Icon, href, action }) => {
        const inner = (
          <Card className="transition-colors hover:border-primary/40">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        );
        const testId = `stat-card-${label.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`;
        if (href) {
          return (
            <Link
              key={label}
              href={href}
              className="block text-decoration-none"
              data-testid={testId}
            >
              {inner}
            </Link>
          );
        }
        return (
          <button
            key={label}
            type="button"
            className="text-left"
            onClick={action}
            data-testid={testId}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
