'use client';

import { Briefcase, Calendar, Handshake, Lightbulb, ShoppingBag, Store, UserCheck } from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface KonnectStats {
  profiles: number;
  verified: number;
  pending: number;
  listings: number;
  jobs: number;
  events: number;
  mentorships: number;
  ideas: number;
}

export function KonnectOverviewPanel() {
  const { data: stats } = useApiQuery<KonnectStats>(['konnect-stats'], '/business/stats');

  const cards = [
    { label: 'Business profiles', value: stats?.profiles ?? 0, icon: Store },
    { label: 'Verified members', value: stats?.verified ?? 0, icon: UserCheck, color: 'text-emerald-600' },
    { label: 'Pending verification', value: stats?.pending ?? 0, icon: Briefcase, color: 'text-amber-600' },
    { label: 'Marketplace listings', value: stats?.listings ?? 0, icon: ShoppingBag },
    { label: 'Active jobs', value: stats?.jobs ?? 0, icon: Briefcase },
    { label: 'Upcoming events', value: stats?.events ?? 0, icon: Calendar },
    { label: 'Active mentorships', value: stats?.mentorships ?? 0, icon: Handshake },
    { label: 'Open ideas', value: stats?.ideas ?? 0, icon: Lightbulb },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Kingdom Konnect connects church members through verified businesses, a trusted marketplace, jobs,
        networking events, and mentorship — all stewarded within your congregation.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className={`rounded-lg bg-muted p-2 ${c.color ?? 'text-primary'}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
