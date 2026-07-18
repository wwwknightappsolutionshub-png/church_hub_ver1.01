'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useModuleChrome } from '@/components/layout/ModuleChromeContext';

/**
 * When `el` scrolls out from under the sticky app top bar, pin `title`
 * into the top bar (replacing the church name). Clears on unmount.
 */
export function useStickyModuleTitle(
  title: string,
  elRef: RefObject<Element | null>,
  enabled = true,
) {
  const { setStickyModuleTitle } = useModuleChrome();

  useEffect(() => {
    if (!enabled) {
      setStickyModuleTitle(null);
      return;
    }
    const el = elRef.current;
    if (!el || !title.trim()) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyModuleTitle(entry.isIntersecting ? null : title);
      },
      {
        root: null,
        rootMargin: '-64px 0px 0px 0px',
        threshold: 0,
      },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      setStickyModuleTitle(null);
    };
  }, [enabled, elRef, setStickyModuleTitle, title]);
}

/** Convenience: create a ref + sticky title observer for module heroes. */
export function useModuleHeroStickyTitle<T extends Element = HTMLElement>(
  title: string,
  enabled = true,
) {
  const ref = useRef<T | null>(null);
  useStickyModuleTitle(title, ref, enabled);
  return ref;
}
