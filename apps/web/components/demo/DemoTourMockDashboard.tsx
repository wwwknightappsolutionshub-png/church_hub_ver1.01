'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BarChart3,
  Bell,
  Pause,
  Play,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { BrandIcon, BrandMark } from '@/components/brand/BrandMark';
import { TourCursor } from '@/components/demo/TourCursor';
import { DemoTourFinale } from '@/components/demo/DemoTourFinale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  buildDemoAdminLeadershipNav,
  tourCaptionForNav,
  TOUR_CLICK_MS,
  TOUR_CURSOR_TRAVEL_MS,
  TOUR_VIEW_HOLD_MS,
} from '@/lib/demo-tour';
import { cn } from '@/lib/utils';
import type { DashboardNavItem } from '@/lib/member-nav';

function MockModuleContent({ item }: { item: DashboardNavItem }) {
  const href = item.href;

  if (href === '/dashboard') {
    return (
      <div className="space-y-4 p-6">
        <div>
          <p className="text-sm font-semibold">Good morning, Pastor</p>
          <p className="text-xs text-muted-foreground">Demo Community Church · Sunday overview</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Members', value: '2,847', change: '+12%' },
            { label: 'Outreach', value: '1,248', change: '+24%' },
            { label: 'Follow-ups', value: '78%', change: '+5%' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold">{stat.value}</p>
              <p className="text-xs font-medium text-success">{stat.change}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Attendance trend</p>
            <Badge variant="secondary">Sample</Badge>
          </div>
          <div className="mt-4 flex h-24 items-end gap-1.5">
            {[40, 55, 45, 70, 60, 85, 75, 90, 80, 95, 88, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-primary/70"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (href.includes('membership') || href.includes('members')) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm font-semibold">Congregants</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Visitors', value: '186' },
            { label: 'Members', value: '2,847' },
            { label: 'Families', value: '412' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {[
            { name: 'Adebayo Family', role: 'Members', status: 'Active' },
            { name: 'Sarah Okonkwo', role: 'Visitor', status: 'Pipeline' },
            { name: 'James & Ruth M.', role: 'Discipled', status: 'Active' },
            { name: 'Youth cell — Zone B', role: 'Group', status: '12 linked' },
          ].map((row) => (
            <div
              key={row.name}
              className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {row.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.name}</p>
                <p className="text-xs text-muted-foreground">{row.role}</p>
              </div>
              <Badge variant="outline">{row.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (href.includes('follow-up') || href.includes('outreach')) {
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm font-semibold">{item.label}</p>
        {[
          { label: 'New contacts', count: 48, width: '35%' },
          { label: 'Assigned', count: 32, width: '55%' },
          { label: 'Discipled', count: 18, width: '78%' },
        ].map((stage) => (
          <div key={stage.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{stage.label}</span>
              <span className="text-muted-foreground">{stage.count}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: stage.width }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (href.includes('analytics')) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm font-semibold">Analytics</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Growth rate', value: '+8.4%' },
            { label: 'Retention', value: '92%' },
            { label: 'Avg attendance', value: '1,420' },
            { label: 'New families', value: '34' },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 flex items-center gap-2 text-xl font-bold">
                <BarChart3 className="h-4 w-4 text-primary" />
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (href.includes('communications')) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm font-semibold">Communication Hub</p>
        <div className="space-y-2">
          {[
            { title: 'Sunday service reminder', audience: 'All members', status: 'Scheduled' },
            { title: 'Youth night RSVP', audience: 'Youth + parents', status: 'Sent' },
            { title: 'Volunteer call — ushers', audience: 'Service units', status: 'Draft' },
          ].map((msg) => (
            <div key={msg.title} className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-sm font-medium">{msg.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {msg.audience} · {msg.status}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (href.includes('staff')) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm font-semibold">Church Staff</p>
        <div className="space-y-2">
          {[
            { name: 'Admin User', role: 'Church Admin' },
            { name: 'Pastor Ade', role: 'Pastor' },
            { name: 'Chioma N.', role: 'Unit Leader' },
          ].map((person) => (
            <div
              key={person.name}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">{person.name}</p>
                <p className="text-xs text-muted-foreground">{person.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Generic module layout
  return (
    <div className="space-y-4 p-6">
      <div>
        <p className="text-lg font-semibold">{item.label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{tourCaptionForNav(item)}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="rounded-xl border border-border bg-card p-4">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="mt-3 h-8 w-16 rounded bg-primary/15" />
            <div className="mt-3 space-y-2">
              <div className="h-2 w-full rounded bg-muted" />
              <div className="h-2 w-[80%] rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
        Sample layout — illustrative only (not live data)
      </div>
    </div>
  );
}

type Props = {
  onExit: () => void;
  reduceMotion: boolean | null;
};

export function DemoTourMockDashboard({ onExit, reduceMotion }: Props) {
  const staffNav = useMemo(() => buildDemoAdminLeadershipNav(), []);
  const [stepIndex, setStepIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showFinale, setShowFinale] = useState(false);
  const [cursor, setCursor] = useState({ x: 80, y: 160 });
  const [clicking, setClicking] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const navRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const shellRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(0);

  const current = staffNav[stepIndex];
  const total = staffNav.length;

  const measureNav = useCallback((index: number) => {
    const el = navRefs.current[index];
    if (!el) return null;
    const itemRect = el.getBoundingClientRect();
    return {
      x: itemRect.left + 36,
      y: itemRect.top + itemRect.height / 2 - 2,
    };
  }, []);

  useEffect(() => {
    if (showFinale || paused || !current) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, ms: number) => {
      timers.push(setTimeout(fn, ms));
    };

    const el = navRefs.current[stepIndex];
    el?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });

    const target = measureNav(stepIndex);
    if (target) setCursor(target);

    const travelMs = reduceMotion ? 0 : TOUR_CURSOR_TRAVEL_MS;
    const clickMs = reduceMotion ? 0 : TOUR_CLICK_MS;
    const holdMs = reduceMotion ? 900 : TOUR_VIEW_HOLD_MS;

    schedule(() => {
      if (!reduceMotion) setClicking(true);
      schedule(() => {
        setClicking(false);
        setContentKey((k) => k + 1);
        schedule(() => {
          if (stepRef.current >= total - 1) {
            setShowFinale(true);
            return;
          }
          const next = stepRef.current + 1;
          stepRef.current = next;
          setStepIndex(next);
        }, holdMs);
      }, clickMs);
    }, travelMs);

    return () => timers.forEach(clearTimeout);
  }, [stepIndex, paused, showFinale, current, total, measureNav, reduceMotion]);

  if (showFinale) {
    return <DemoTourFinale onClose={onExit} />;
  }

  if (!current) return null;

  return (
    <div
      ref={shellRef}
      className="relative flex min-h-[100dvh] bg-[hsl(var(--muted))]"
      data-testid="demo-tour-mock-dashboard"
    >
      <TourCursor
        x={cursor.x}
        y={cursor.y}
        clicking={clicking}
        visible={!reduceMotion && !paused}
      />

      {/* Mock admin sidebar — Leadership only */}
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar xl:flex">
        <div className="flex h-16 items-center border-b border-sidebar-muted px-4">
          <BrandMark variant="light" />
        </div>
        <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto p-2">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Leadership
          </p>
          {staffNav.map((item, index) => {
            const Icon = item.icon;
            const active = index === stepIndex;
            return (
              <button
                key={item.href}
                type="button"
                ref={(el) => {
                  navRefs.current[index] = el;
                }}
                data-tour-nav={item.href}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-muted text-sidebar-foreground ring-1 ring-white/15'
                    : 'text-sidebar-foreground/90',
                )}
                onClick={() => {
                  stepRef.current = index;
                  setStepIndex(index);
                  setContentKey((k) => k + 1);
                }}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    active ? 'text-secondary' : 'text-sidebar-foreground/80',
                  )}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-muted px-3 py-3">
          <p className="truncate text-xs font-medium text-sidebar-foreground">Demo Admin</p>
          <p className="truncate text-[10px] text-sidebar-foreground/50">Demo Community Church</p>
        </div>
      </aside>

      <div className="flex min-h-[100dvh] flex-1 flex-col">
        <header className="flex h-16 items-center border-b border-border/80 bg-card/90 px-4 backdrop-blur xl:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Demo Community Church
            </p>
            <h1 className="truncate font-heading text-lg font-bold leading-tight">{current.label}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border">
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              DA
            </div>
            <Button variant="ghost" size="sm" onClick={onExit}>
              Exit
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background">
          <motion.div
            key={`${current.href}-${contentKey}`}
            className="origin-center"
            initial={reduceMotion ? false : { opacity: 0.5, scale: 0.94 }}
            animate={
              reduceMotion
                ? { opacity: 1, scale: 1 }
                : { opacity: [0.5, 1, 1], scale: [0.94, 1.03, 1] }
            }
            transition={{ duration: 0.85, times: [0, 0.55, 1], ease: 'easeOut' }}
          >
            <MockModuleContent item={current} />
          </motion.div>
        </main>
      </div>

      {/* Tour caption */}
      <motion.div
        className="pointer-events-auto absolute bottom-8 left-1/2 z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-border bg-card p-5 shadow-elevated"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        key={current.href}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {stepIndex + 1} / {total} · Admin tools
            </p>
            <h2 className="mt-1 font-heading text-lg font-bold">{current.label}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{tourCaptionForNav(current)}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onExit} aria-label="Exit tour">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPaused((p) => !p)}>
            {paused ? (
              <>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Resume
              </>
            ) : (
              <>
                <Pause className="mr-1.5 h-3.5 w-3.5" />
                Pause
              </>
            )}
          </Button>
          <Button type="button" variant="secondary" size="sm" asChild>
            <Link href="/register">SignUP NOW</Link>
          </Button>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${((stepIndex + 1) / total) * 100}%` }}
          />
        </div>
      </motion.div>

      {/* Mobile: simplified notice */}
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/95 p-6 xl:hidden">
        <div className="max-w-sm text-center">
          <BrandIcon className="mx-auto h-12 w-12" />
          <p className="mt-4 font-heading text-lg font-bold">Desktop recommended</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The mock product tour shows the full admin sidebar best on a wide screen.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild>
              <Link href="/register">SignUP NOW</Link>
            </Button>
            <Button variant="outline" onClick={onExit}>
              Exit tour
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
