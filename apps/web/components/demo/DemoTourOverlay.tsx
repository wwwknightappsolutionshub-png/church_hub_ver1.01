'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Pause, Play, X } from 'lucide-react';
import Link from 'next/link';
import { TourCursor } from '@/components/demo/TourCursor';
import { useDemoTour } from '@/components/demo/DemoTourContext';
import { Button } from '@/components/ui/button';
import {
  readDemoTourStep,
  tourCaptionForNav,
  TOUR_CLICK_MS,
  TOUR_CURSOR_TRAVEL_MS,
  TOUR_VIEW_HOLD_MS,
  writeDemoTourStep,
} from '@/lib/demo-tour';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { STAFF_LEADERSHIP_NAV, filterStaffNav } from '@/lib/member-nav';
import { isChurchAdminRole, isPastorRole } from '@/lib/session-role';

type SpotlightRect = { top: number; left: number; width: number; height: number };

function measureNavLink(href: string): SpotlightRect | null {
  const el = document.querySelector(`[data-tour-nav="${href}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const pad = 4;
  return {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

function cursorTargetFromRect(rect: SpotlightRect): { x: number; y: number } {
  return {
    x: rect.left + 36,
    y: rect.top + rect.height / 2 - 2,
  };
}

export function DemoTourOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const { active, stopTour } = useDemoTour();
  const {
    canManageStaff,
    isChurchStaff,
    userRoles,
    enabledModules,
    isLoading: accessLoading,
  } = useModuleAccess();

  const isChurchLeadership =
    isChurchAdminRole(userRoles) || isPastorRole(userRoles) || isChurchStaff;
  const isPastor = isPastorRole(userRoles);
  const isChurchAdmin = isChurchAdminRole(userRoles);

  const staffNav = useMemo(
    () =>
      filterStaffNav(
        STAFF_LEADERSHIP_NAV,
        {
          canManageStaff,
          isChurchLeadership,
          isPastor,
          isChurchAdmin,
        },
        enabledModules,
      ),
    [canManageStaff, isChurchLeadership, isPastor, isChurchAdmin, enabledModules],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [cursor, setCursor] = useState({ x: 24, y: 120 });
  const [clicking, setClicking] = useState(false);
  const [ready, setReady] = useState(false);
  const stepIndexRef = useRef(0);
  const pathnameRef = useRef(pathname);

  const currentItem = staffNav[stepIndex];
  const totalSteps = staffNav.length;

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const exitTour = useCallback(() => {
    stopTour();
    const params = new URLSearchParams(searchParams.toString());
    params.delete('tour');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, router, searchParams, stopTour]);

  useEffect(() => {
    if (!active || accessLoading || staffNav.length === 0) return;
    const saved = readDemoTourStep();
    const initial = saved > 0 && saved < staffNav.length ? saved : 0;
    setStepIndex(initial);
    stepIndexRef.current = initial;
    setReady(true);
  }, [active, accessLoading, staffNav.length]);

  const updateSpotlight = useCallback(
    (href: string) => {
      const el = document.querySelector(`[data-tour-nav="${href}"]`);
      el?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      const rect = measureNavLink(href);
      if (rect) {
        setSpotlight(rect);
        setCursor(cursorTargetFromRect(rect));
      }
    },
    [reduceMotion],
  );

  const advanceStep = useCallback(() => {
    const next = (stepIndexRef.current + 1) % staffNav.length;
    stepIndexRef.current = next;
    writeDemoTourStep(next);
    setStepIndex(next);
  }, [staffNav.length]);

  useEffect(() => {
    if (!active || !ready || paused || !currentItem || accessLoading) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, ms: number) => {
      timers.push(setTimeout(fn, ms));
    };

    const item = staffNav[stepIndex];
    if (!item) return;

    updateSpotlight(item.href);

    const onRoute =
      pathnameRef.current === item.href || pathnameRef.current.startsWith(`${item.href}/`);
    if (!onRoute) {
      router.push(item.href);
    }

    const travelMs = reduceMotion ? 0 : TOUR_CURSOR_TRAVEL_MS;
    const clickMs = reduceMotion ? 0 : TOUR_CLICK_MS;
    const holdMs = reduceMotion ? 1200 : TOUR_VIEW_HOLD_MS;
    const navWait = onRoute ? 0 : reduceMotion ? 200 : 500;

    schedule(() => {
      if (!reduceMotion) setClicking(true);
      schedule(() => {
        setClicking(false);
        schedule(() => advanceStep(), holdMs);
      }, clickMs);
    }, navWait + travelMs);

    const onResize = () => updateSpotlight(item.href);
    window.addEventListener('resize', onResize);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', onResize);
    };
  }, [
    active,
    ready,
    paused,
    stepIndex,
    currentItem,
    accessLoading,
    advanceStep,
    reduceMotion,
    router,
    staffNav,
    updateSpotlight,
  ]);

  if (!active || accessLoading || !currentItem) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[100] hidden xl:block"
        data-testid="demo-tour-overlay"
        aria-live="polite"
      >
        {spotlight ? (
          <div
            className="pointer-events-none absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent transition-all duration-300"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-black/55" aria-hidden />
        )}

        <motion.div
          className="pointer-events-auto absolute bottom-8 left-1/2 z-[110] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-border bg-card p-5 shadow-elevated"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          key={currentItem.href}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {stepIndex + 1} / {totalSteps} · Leadership
              </p>
              <h2 className="mt-1 font-heading text-lg font-bold">{currentItem.label}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {tourCaptionForNav(currentItem)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={exitTour}
              aria-label="Exit product tour"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPaused((p) => !p)}
            >
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
              <Link href="/register">Start free trial</Link>
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={exitTour}>
              End tour
            </Button>
          </div>

          <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </motion.div>

        <TourCursor
          x={cursor.x}
          y={cursor.y}
          clicking={clicking}
          visible={!reduceMotion && !paused}
        />
      </div>

      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-6 xl:hidden">
        <div className="max-w-sm text-center">
          <p className="font-heading text-lg font-bold">Tour continues on desktop</p>
          <p className="mt-2 text-sm text-muted-foreground">
            You are signed in to the demo church. Open this page on a wider screen for the guided
            sidebar tour, or explore the dashboard freely.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
            <Button variant="outline" onClick={exitTour}>
              End tour
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
