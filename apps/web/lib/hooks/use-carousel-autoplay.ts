'use client';

import { useCallback, useEffect, useState, type FocusEvent } from 'react';

export interface CarouselAutoplayOptions {
  /** When false, no timer runs (e.g. only one slide). */
  enabled: boolean;
  intervalMs?: number;
  onAdvance: () => void;
}

/**
 * Auto-advances a carousel on an interval; pauses while the pointer is over the carousel
 * or it has focus (keyboard), and respects prefers-reduced-motion.
 */
export function useCarouselAutoplay({
  enabled,
  intervalMs = 5000,
  onAdvance,
}: CarouselAutoplayOptions) {
  const [paused, setPaused] = useState(false);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  useEffect(() => {
    if (!enabled || paused) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = window.setInterval(onAdvance, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, paused, intervalMs, onAdvance]);

  const pauseProps = {
    onMouseEnter: pause,
    onMouseLeave: resume,
    onPointerEnter: pause,
    onPointerLeave: resume,
    onFocusCapture: pause,
    onBlurCapture: (e: FocusEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) resume();
    },
    onTouchStart: pause,
    onTouchEnd: resume,
  } as const;

  return { paused, pause, resume, pauseProps };
}
