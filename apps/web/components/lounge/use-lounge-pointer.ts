'use client';

import { useCallback, useEffect, useRef } from 'react';

const LERP = 0.14;
const NEAR_ENTER = 48;
const NEAR_EXIT = 62;

export interface FloorPoint {
  x: number;
  y: number;
}

export interface NearTarget {
  id: string;
  x: number;
  y: number;
}

interface UseLoungePointerOpts {
  floorTop: number;
  edgeX: number;
  figureH: number;
  others: NearTarget[];
  enabled: boolean;
  onNearChange: (id: string | null) => void;
}

function clampPoint(x: number, y: number, w: number, h: number, floorTop: number, edgeX: number, figureH: number) {
  return {
    x: Math.min(w - edgeX, Math.max(edgeX, x)),
    y: Math.min(h - figureH - 8, Math.max(floorTop + 4, y)),
  };
}

export function useLoungePointer({
  floorTop,
  edgeX,
  figureH,
  others,
  enabled,
  onNearChange,
}: UseLoungePointerOpts) {
  const markerRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<FloorPoint>({ x: 0, y: 0 });
  const currentRef = useRef<FloorPoint>({ x: 0, y: 0 });
  const nearIdRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const onNearChangeRef = useRef(onNearChange);
  onNearChangeRef.current = onNearChange;

  const applyMarkerPosition = useCallback((x: number, y: number) => {
    const el = markerRef.current;
    if (!el) return;
    el.style.position = 'absolute';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = 'translate(-50%, -50%)';
  }, []);

  const pickNear = useCallback(
    (pos: FloorPoint) => {
      if (others.length === 0) {
        if (nearIdRef.current !== null) {
          nearIdRef.current = null;
          onNearChangeRef.current(null);
        }
        return;
      }

      const distances = others.map((o) => ({
        id: o.id,
        d: Math.hypot(o.x - pos.x, o.y - pos.y),
      }));

      const sticky = nearIdRef.current
        ? distances.find((d) => d.id === nearIdRef.current)
        : null;
      if (sticky && sticky.d < NEAR_EXIT) {
        return;
      }

      const closest = distances.reduce((a, b) => (a.d < b.d ? a : b));
      const next = closest.d < NEAR_ENTER ? closest.id : null;
      if (next !== nearIdRef.current) {
        nearIdRef.current = next;
        onNearChangeRef.current(next);
      }
    },
    [others],
  );

  const tick = useCallback(() => {
    const dx = targetRef.current.x - currentRef.current.x;
    const dy = targetRef.current.y - currentRef.current.y;

    if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) {
      currentRef.current.x += dx * LERP;
      currentRef.current.y += dy * LERP;
      applyMarkerPosition(currentRef.current.x, currentRef.current.y);
      pickNear(currentRef.current);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [applyMarkerPosition, pickNear]);

  useEffect(() => {
    if (!enabled) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, tick]);

  const setHome = useCallback(
    (x: number, y: number) => {
      targetRef.current = { x, y };
      currentRef.current = { x, y };
      applyMarkerPosition(x, y);
    },
    [applyMarkerPosition],
  );

  const moveToClient = useCallback(
    (clientX: number, clientY: number, container: HTMLElement) => {
      const rect = container.getBoundingClientRect();
      const p = clampPoint(
        clientX - rect.left,
        clientY - rect.top,
        rect.width,
        rect.height,
        floorTop,
        edgeX,
        figureH,
      );
      targetRef.current = p;
    },
    [floorTop, edgeX, figureH],
  );

  return { markerRef, setHome, moveToClient, getPosition: () => ({ ...currentRef.current }) };
}
