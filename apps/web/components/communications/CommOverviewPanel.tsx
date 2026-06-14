'use client';

import Link from 'next/link';
import { Cake } from 'lucide-react';
import { Bell, BookOpen, Megaphone, MessageSquare, Mic, Radio } from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CommStats {
  announcements: number;
  sermons: number;
  devotionals: number;
  channels: number;
  notifications: number;
  unreadMessages: number;
  unreadInApp: number;
  queuePending?: number;
  conversations?: number;
}

export function CommOverviewPanel() {
  const { data: stats } = useApiQuery<CommStats>(['comm-stats'], '/communications/stats');

  const cards = [
    { label: 'Active announcements', value: stats?.announcements ?? 0, icon: Megaphone },
    { label: 'Sermon archive', value: stats?.sermons ?? 0, icon: Mic },
    { label: 'Devotional plans', value: stats?.devotionals ?? 0, icon: BookOpen },
    { label: 'Chat channels', value: stats?.channels ?? 0, icon: MessageSquare },
    { label: 'Push notifications sent', value: stats?.notifications ?? 0, icon: Bell },
    { label: 'Unread push', value: stats?.unreadMessages ?? 0, icon: Radio, color: 'text-amber-600' },
    { label: 'Unread in-app', value: stats?.unreadInApp ?? 0, icon: MessageSquare, color: 'text-sky-600' },
    { label: 'Queue pending', value: stats?.queuePending ?? 0, icon: Radio, color: 'text-violet-600' },
    { label: 'Conversations', value: stats?.conversations ?? 0, icon: MessageSquare },
  ];

  return (
    <div className="space-y-6" data-testid="comm-overview-corporate">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card
            key={c.label}
            className="border-slate-200/80 shadow-sm transition hover:border-primary/30 hover:shadow-md"
          >
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className={`rounded-lg bg-slate-900/5 p-2.5 dark:bg-white/5 ${c.color ?? 'text-primary'}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums tracking-tight">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Cake className="h-4 w-4 text-amber-300" />
              Celebration email templates
            </CardTitle>
            <CardDescription className="text-slate-300">
              Customize birthday and anniversary WYSIWYG emails — auto-sent on occasion dates.
            </CardDescription>
          </div>
          <Button size="sm" variant="secondary" className="shrink-0" asChild>
            <Link href="/dashboard/communications?tab=celebrations" data-testid="comm-celebration-templates-link">
              Manage templates
            </Link>
          </Button>
        </CardHeader>
      </Card>
    </div>
  );
}
