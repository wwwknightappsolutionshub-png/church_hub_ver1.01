'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { endDemoTour } from '@/lib/demo-tour';

type DemoTourContextValue = {
  active: boolean;
  startTour: () => void;
  stopTour: () => void;
};

const DemoTourContext = createContext<DemoTourContextValue | null>(null);

export function DemoTourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);

  const startTour = useCallback(() => {
    setActive(true);
  }, []);

  const stopTour = useCallback(() => {
    endDemoTour();
    setActive(false);
  }, []);

  const value = useMemo(
    () => ({
      active,
      startTour,
      stopTour,
    }),
    [active, startTour, stopTour],
  );

  return <DemoTourContext.Provider value={value}>{children}</DemoTourContext.Provider>;
}

export function useDemoTour(): DemoTourContextValue {
  const ctx = useContext(DemoTourContext);
  if (!ctx) {
    return {
      active: false,
      startTour: () => {},
      stopTour: () => endDemoTour(),
    };
  }
  return ctx;
}
