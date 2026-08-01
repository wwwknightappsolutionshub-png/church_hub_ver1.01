'use client';

import {
  BarChart3,
  Bell,
  Bus,
  HeartHandshake,
  LayoutDashboard,
  Megaphone,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Users, label: 'Membership' },
  { icon: HeartHandshake, label: 'Outreach' },
  { icon: Megaphone, label: 'Outreach' },
  { icon: Sparkles, label: 'Youth' },
  { icon: Bus, label: 'Bus Ministry' },
];

const stats = [
  { label: 'Members', value: '2,847', change: '+12%' },
  { label: 'Outreach', value: '1,248', change: '+24%' },
  { label: 'Follow-ups', value: '78%', change: '+5%' },
];

export function ProductPreview() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-gold/10 blur-2xl"
      />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400/80" />
            <span className="h-3 w-3 rounded-full bg-amber-400/80" />
            <span className="h-3 w-3 rounded-full bg-green-400/80" />
          </div>
          <div className="mx-auto flex h-7 w-48 items-center rounded-md bg-background px-3 text-xs text-muted-foreground">
            app.churchhub.io/dashboard
          </div>
        </div>

        <div className="flex min-h-[380px]">
          {/* Sidebar */}
          <div className="hidden w-44 shrink-0 bg-sidebar p-3 sm:block">
            <p className="px-2 text-xs font-bold text-sidebar-foreground">
              Church<span className="text-gold">_Hub</span>
            </p>
            <nav className="mt-4 space-y-0.5">
              {sidebarItems.map(({ icon: Icon, label, active }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium ${
                    active
                      ? 'bg-sidebar-accent/20 text-sidebar-accent'
                      : 'text-sidebar-foreground/60'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </div>
              ))}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1 bg-background p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Good morning, Pastor</p>
                <p className="text-xs text-muted-foreground">Sunday, May 26 · Demo Community Church</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-border">
                  <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" />
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-border bg-card p-2.5">
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                  <p className="text-[10px] font-medium text-success">{stat.change}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Member Growth</p>
                <Badge variant="secondary" className="text-[10px]">Live</Badge>
              </div>
              <div className="mt-3 flex h-16 items-end gap-1">
                {[40, 55, 45, 70, 60, 85, 75, 90, 80, 95, 88, 100].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-primary/80 transition-all"
                    style={{ height: `${h}%`, opacity: 0.4 + (i / 12) * 0.6 }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              {[
                { text: '12 outreach contacts synced', time: '2m', color: 'bg-primary' },
                { text: 'Bus Route A — all picked up', time: '18m', color: 'bg-gold' },
                { text: 'Youth Night RSVP: 64 going', time: '1h', color: 'bg-success' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${item.color}`} />
                  <span className="flex-1 truncate text-[11px]">{item.text}</span>
                  <span className="text-[10px] text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating badge */}
        <div className="absolute -bottom-3 -right-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-elevated">
          <BarChart3 className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs font-bold">78% follow-up rate</p>
            <p className="text-[10px] text-muted-foreground">↑ 5% this month</p>
          </div>
        </div>
      </div>
    </div>
  );
}
