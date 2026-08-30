'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DemoTourOverlay } from '@/components/demo/DemoTourOverlay';
import { useDemoTour } from '@/components/demo/DemoTourContext';
import { DEMO_TOUR_QUERY, isDemoTourActive } from '@/lib/demo-tour';

export function DemoTourController() {
  const searchParams = useSearchParams();
  const { active, startTour } = useDemoTour();
  const tourQuery = searchParams.get(DEMO_TOUR_QUERY) === '1';

  useEffect(() => {
    if (tourQuery || isDemoTourActive()) {
      startTour();
    }
  }, [startTour, tourQuery]);

  if (!active && !tourQuery && !isDemoTourActive()) {
    return null;
  }

  return <DemoTourOverlay />;
}
