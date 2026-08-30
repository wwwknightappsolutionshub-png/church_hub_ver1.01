'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { endDemoTour } from '@/lib/demo-tour';

type DemoTourContextValue = {
  active: boolean;
  contentPulse: number;
  showFinale: boolean;
  startTour: () => void;
  stopTour: () => void;
  pulseContent: () => void;
  openFinale: () => void;
};

const DemoTourContext = createContext<DemoTourContextValue | null>(null);

export function DemoTourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [contentPulse, setContentPulse] = useState(0);
  const [showFinale, setShowFinale] = useState(false);

  const startTour = useCallback(() => {
    setShowFinale(false);
    setActive(true);
  }, []);

  const stopTour = useCallback(() => {
    endDemoTour();
    setActive(false);
    setShowFinale(false);
  }, []);

  const pulseContent = useCallback(() => {
    setContentPulse((n) => n + 1);
  }, []);

  const openFinale = useCallback(() => {
    setShowFinale(true);
  }, []);

  const value = useMemo(
    () => ({
      active,
      contentPulse,
      showFinale,
      startTour,
      stopTour,
      pulseContent,
      openFinale,
    }),
    [active, contentPulse, showFinale, startTour, stopTour, pulseContent, openFinale],
  );

  return <DemoTourContext.Provider value={value}>{children}</DemoTourContext.Provider>;
}

export function useDemoTour(): DemoTourContextValue {
  const ctx = useContext(DemoTourContext);
  if (!ctx) {
    return {
      active: false,
      contentPulse: 0,
      showFinale: false,
      startTour: () => {},
      stopTour: () => endDemoTour(),
      pulseContent: () => {},
      openFinale: () => {},
    };
  }
  return ctx;
}
