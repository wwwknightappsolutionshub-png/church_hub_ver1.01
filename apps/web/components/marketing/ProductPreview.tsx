'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'framer-motion';
import {
  BarChart3,
  Bell,
  Bus,
  HeartHandshake,
  LayoutDashboard,
  MapPin,
  Megaphone,
  Search,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type PreviewModuleId =
  | 'dashboard'
  | 'membership'
  | 'follow-up'
  | 'evangelism'
  | 'youth'
  | 'bus';

const previewModules: {
  id: PreviewModuleId;
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
}[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { id: 'membership', icon: Users, label: 'Membership', path: '/dashboard/membership' },
  { id: 'follow-up', icon: HeartHandshake, label: 'Follow-up', path: '/dashboard/follow-up' },
  { id: 'evangelism', icon: Megaphone, label: 'Evangelism', path: '/dashboard/outreach' },
  { id: 'youth', icon: Sparkles, label: 'Youth', path: '/dashboard/youth' },
  { id: 'bus', icon: Bus, label: 'Bus Ministry', path: '/dashboard/bus' },
];

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

function PreviewShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[320px] flex-col">
      <div className="flex items-center justify-between">
        <div>
          <motion.p
            className="text-sm font-semibold"
            variants={fadeUp}
            transition={{ delay: 0.05 }}
          >
            {title}
          </motion.p>
          <motion.p
            className="text-xs text-muted-foreground"
            variants={fadeUp}
            transition={{ delay: 0.1 }}
          >
            {subtitle}
          </motion.p>
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
      <div className="mt-4 flex-1">{children}</div>
    </div>
  );
}

function DashboardView() {
  const stats = [
    { label: 'Members', value: '2,847', change: '+12%' },
    { label: 'Outreach', value: '1,248', change: '+24%' },
    { label: 'Follow-ups', value: '78%', change: '+5%' },
  ];

  return (
    <PreviewShell title="Good morning, Pastor" subtitle="Sunday, May 26 · Demo Community Church">
      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="rounded-lg border border-border bg-card p-2.5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.08, duration: 0.35 }}
          >
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            <p className="text-lg font-bold">{stat.value}</p>
            <p className="text-[10px] font-medium text-success">{stat.change}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-3 rounded-lg border border-border bg-card p-3"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, duration: 0.4 }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Member Growth</p>
          <Badge variant="secondary" className="text-[10px]">Live</Badge>
        </div>
        <div className="mt-3 flex h-16 items-end gap-1">
          {[40, 55, 45, 70, 60, 85, 75, 90, 80, 95, 88, 100].map((h, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-sm bg-primary/80"
              initial={{ height: 0, opacity: 0.3 }}
              animate={{ height: `${h}%`, opacity: 0.4 + (i / 12) * 0.6 }}
              transition={{ delay: 0.45 + i * 0.04, duration: 0.45, ease: 'easeOut' }}
            />
          ))}
        </div>
      </motion.div>

      <div className="mt-3 space-y-1.5">
        {[
          { text: '12 outreach contacts synced', time: '2m', color: 'bg-primary' },
          { text: 'Bus Route A — all picked up', time: '18m', color: 'bg-gold' },
          { text: 'Youth Night RSVP: 64 going', time: '1h', color: 'bg-success' },
        ].map((item, i) => (
          <motion.div
            key={item.text}
            className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55 + i * 0.1, duration: 0.3 }}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', item.color)} />
            <span className="flex-1 truncate text-[11px]">{item.text}</span>
            <span className="text-[10px] text-muted-foreground">{item.time}</span>
          </motion.div>
        ))}
      </div>
    </PreviewShell>
  );
}

function MembershipView() {
  const rows = [
    { name: 'Adebayo Family', role: 'Members', status: 'Active' },
    { name: 'Sarah Okonkwo', role: 'Visitor', status: 'Pipeline' },
    { name: 'James & Ruth M.', role: 'Discipled', status: 'Active' },
    { name: 'Youth cell — Zone B', role: 'Group', status: '12 linked' },
  ];

  return (
    <PreviewShell title="Membership" subtitle="Congregants · families · onboarding pipeline">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Visitors', value: '186' },
          { label: 'Members', value: '2,847' },
          { label: 'Families', value: '412' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            className="rounded-lg border border-border bg-card p-2.5 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
          >
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
            <p className="text-base font-bold">{item.value}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-3 rounded-lg border border-border bg-card p-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
      >
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Recent profiles
        </p>
        <div className="space-y-1">
          {rows.map((row, i) => (
            <motion.div
              key={row.name}
              className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.32 + i * 0.09 }}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
                {row.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium">{row.name}</p>
                <p className="text-[10px] text-muted-foreground">{row.role}</p>
              </div>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                {row.status}
              </Badge>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </PreviewShell>
  );
}

function FollowUpView() {
  const stages = [
    { label: 'New contacts', count: 48, width: '35%' },
    { label: 'Assigned', count: 32, width: '55%' },
    { label: 'Discipled', count: 18, width: '78%' },
  ];

  return (
    <PreviewShell title="Follow-up pipeline" subtitle="Automated stages · pastoral assignments">
      <div className="space-y-2">
        {stages.map((stage, i) => (
          <motion.div
            key={stage.label}
            className="rounded-lg border border-border bg-card p-2.5"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.12 }}
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium">{stage.label}</span>
              <span className="text-muted-foreground">{stage.count}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: stage.width }}
                transition={{ delay: 0.25 + i * 0.12, duration: 0.55, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-3 space-y-1.5">
        {[
          'SMS reminder sent — Visitor follow-up',
          'Team assigned — North campus leads',
          'Pastoral note added — confidential',
        ].map((text, i) => (
          <motion.div
            key={text}
            className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
          >
            <HeartHandshake className="h-3 w-3 shrink-0 text-primary" />
            <span className="truncate text-[11px]">{text}</span>
          </motion.div>
        ))}
      </div>
    </PreviewShell>
  );
}

function EvangelismView() {
  return (
    <PreviewShell title="Evangelism & field capture" subtitle="Offline sync · QR links · GPS tagging">
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Contacts today', value: '34' },
          { label: 'Offline queue', value: '6' },
          { label: 'QR scans', value: '128' },
          { label: 'Welcome sent', value: '31' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            className="rounded-lg border border-border bg-card p-2.5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08 + i * 0.07 }}
          >
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
            <p className="text-base font-bold">{item.value}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <div>
            <p className="text-[11px] font-medium">Field capture active</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Evangelists syncing contacts from outreach zones A–C
            </p>
          </div>
        </div>
        <motion.div
          className="mt-2 flex gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {['Zone A', 'Zone B', 'Zone C'].map((zone, i) => (
            <span
              key={zone}
              className={cn(
                'rounded-full px-2 py-0.5 text-[9px] font-medium',
                i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {zone}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </PreviewShell>
  );
}

function YouthView() {
  return (
    <PreviewShell title="Youth community" subtitle="Events · groups · gamification">
      <motion.div
        className="rounded-lg border border-border bg-card p-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold">Youth Night — Friday</p>
          <Badge variant="gold" className="text-[9px]">64 RSVP</Badge>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">Moderated chat · parent linking enabled</p>
      </motion.div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { icon: Trophy, label: 'Badges', value: '24' },
          { icon: Sparkles, label: 'Groups', value: '8' },
          { icon: Users, label: 'Leaders', value: '12' },
        ].map(({ icon: Icon, label, value }, i) => (
          <motion.div
            key={label}
            className="flex flex-col items-center rounded-lg border border-border bg-card p-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 + i * 0.1 }}
          >
            <Icon className="h-3.5 w-3.5 text-gold" />
            <p className="mt-1 text-sm font-bold">{value}</p>
            <p className="text-[9px] text-muted-foreground">{label}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-3 rounded-md bg-muted/50 px-2 py-1.5 text-[11px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
      >
        New badge unlocked: <span className="font-medium">Faithful Attendee</span>
      </motion.div>
    </PreviewShell>
  );
}

function BusView() {
  const routes = [
    { name: 'Route A — North', riders: '42/45', status: 'En route' },
    { name: 'Route B — East', riders: '38/40', status: 'Pickup' },
    { name: 'Route C — West', riders: '29/35', status: 'Scheduled' },
  ];

  return (
    <PreviewShell title="Bus ministry" subtitle="Routes · GPS · capacity · alerts">
      <div className="space-y-2">
        {routes.map((route, i) => (
          <motion.div
            key={route.name}
            className="rounded-lg border border-border bg-card p-2.5"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.12 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bus className="h-3 w-3 text-primary" />
                <span className="text-[11px] font-medium">{route.name}</span>
              </div>
              <span className="text-[10px] text-success">{route.status}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Capacity {route.riders}</span>
              <span>GPS live</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gold"
                initial={{ width: 0 }}
                animate={{ width: `${60 + i * 12}%` }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.5 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </PreviewShell>
  );
}

const viewByModule: Record<PreviewModuleId, React.ComponentType> = {
  dashboard: DashboardView,
  membership: MembershipView,
  'follow-up': FollowUpView,
  evangelism: EvangelismView,
  youth: YouthView,
  bus: BusView,
};

function PreviewCursor({
  x,
  y,
  clicking,
  visible,
}: {
  x: number;
  y: number;
  clicking: boolean;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <motion.div
      className="pointer-events-none absolute z-30"
      animate={{ x, y, scale: clicking ? 0.88 : 1 }}
      transition={{
        x: { type: 'spring', stiffness: 120, damping: 22 },
        y: { type: 'spring', stiffness: 120, damping: 22 },
        scale: { duration: 0.12 },
      }}
      style={{ left: 0, top: 0 }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.24c.45 0 .67-.54.35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"
          fill="#111827"
          stroke="#fff"
          strokeWidth="1.25"
        />
      </svg>
      {clicking ? (
        <motion.span
          className="absolute left-1 top-1 h-6 w-6 rounded-full bg-primary/25"
          initial={{ scale: 0.4, opacity: 0.8 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.45 }}
        />
      ) : null}
    </motion.div>
  );
}

const VIEW_HOLD_MS = 3800;
const CURSOR_TRAVEL_MS = 700;
const CLICK_MS = 220;

export function ProductPreview() {
  const reduceMotion = useReducedMotion();
  const shellRef = useRef<HTMLDivElement>(null);
  const navRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [cursor, setCursor] = useState({ x: 24, y: 120 });
  const [clicking, setClicking] = useState(false);
  const [tourReady, setTourReady] = useState(false);
  const [wideLayout, setWideLayout] = useState(false);

  const activeModule = previewModules[activeIndex];
  const ActiveView = viewByModule[activeModule.id];

  const measureNavTarget = useCallback((index: number) => {
    const shell = shellRef.current;
    const item = navRefs.current[index];
    if (!shell || !item) return null;
    const shellRect = shell.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    return {
      x: itemRect.left - shellRect.left + itemRect.width * 0.72,
      y: itemRect.top - shellRect.top + itemRect.height * 0.55,
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const mq = window.matchMedia('(min-width: 640px)');
    const sync = () => setWideLayout(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !wideLayout) return;

    const first = measureNavTarget(0);
    if (first) setCursor(first);

    const readyTimer = setTimeout(() => setTourReady(true), 1200);
    return () => clearTimeout(readyTimer);
  }, [measureNavTarget, reduceMotion, wideLayout]);

  useEffect(() => {
    if (reduceMotion || !tourReady || !wideLayout) return;

    let cancelled = false;
    let holdTimer: ReturnType<typeof setTimeout>;
    let travelTimer: ReturnType<typeof setTimeout>;
    let clickTimer: ReturnType<typeof setTimeout>;

    const runStep = (index: number) => {
      if (cancelled) return;

      const target = measureNavTarget(index);
      if (target) setCursor(target);

      travelTimer = setTimeout(() => {
        if (cancelled) return;
        setClicking(true);

        clickTimer = setTimeout(() => {
          if (cancelled) return;
          setClicking(false);
          setActiveIndex(index);

          holdTimer = setTimeout(() => {
            if (cancelled) return;
            const next = (index + 1) % previewModules.length;
            runStep(next);
          }, VIEW_HOLD_MS);
        }, CLICK_MS);
      }, CURSOR_TRAVEL_MS);
    };

    const startTimer = setTimeout(() => runStep(1), VIEW_HOLD_MS);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      clearTimeout(holdTimer);
      clearTimeout(travelTimer);
      clearTimeout(clickTimer);
    };
  }, [measureNavTarget, reduceMotion, tourReady, wideLayout]);

  useEffect(() => {
    if (reduceMotion || wideLayout) return;
    const mobileTimer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % previewModules.length);
    }, VIEW_HOLD_MS);
    return () => clearInterval(mobileTimer);
  }, [reduceMotion, wideLayout]);

  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-gold/10 blur-2xl"
      />
      <div
        ref={shellRef}
        className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-elevated"
      >
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400/80" />
            <span className="h-3 w-3 rounded-full bg-amber-400/80" />
            <span className="h-3 w-3 rounded-full bg-green-400/80" />
          </div>
          <motion.div
            key={activeModule.path}
            className="mx-auto flex h-7 w-52 items-center rounded-md bg-background px-3 text-xs text-muted-foreground sm:w-56"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            app.churchhub.io{activeModule.path}
          </motion.div>
        </div>

        <div className="relative flex min-h-[380px]">
          <PreviewCursor
            x={cursor.x}
            y={cursor.y}
            clicking={clicking}
            visible={!reduceMotion && tourReady && wideLayout}
          />

          <div className="hidden w-44 shrink-0 bg-sidebar p-3 sm:block">
            <p className="px-2 text-xs font-bold text-sidebar-foreground">
              Church<span className="text-gold">_Hub</span>
            </p>
            <nav className="mt-4 space-y-0.5">
              {previewModules.map(({ id, icon: Icon, label }, index) => {
                const active = index === activeIndex;
                return (
                  <div
                    key={id}
                    ref={(el) => {
                      navRefs.current[index] = el;
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors duration-300',
                      active
                        ? 'bg-sidebar-accent/20 text-sidebar-accent shadow-sm ring-1 ring-sidebar-accent/25'
                        : 'text-sidebar-foreground/60',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="relative flex-1 overflow-hidden bg-background p-4">
            <AnimatePresence mode="wait">
              {reduceMotion ? (
                <motion.div
                  key="static"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                >
                  <DashboardView />
                </motion.div>
              ) : (
                <motion.div
                  key={activeModule.id}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.32, ease: 'easeOut' }}
                >
                  <ActiveView />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <motion.div
          className="absolute -bottom-3 -right-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-elevated"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.45 }}
        >
          <BarChart3 className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs font-bold">78% follow-up rate</p>
            <p className="text-[10px] text-muted-foreground">↑ 5% this month</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
