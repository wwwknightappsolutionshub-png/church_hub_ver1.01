'use client';

import { Bell, BookOpen, Megaphone, MessageSquare, Mic, Radio } from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Central hub for church-wide communication — push alerts, private messages, announcements, media, devotionals, and moderated group chats.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
