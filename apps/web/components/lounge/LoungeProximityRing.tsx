'use client';

/** Floor-level proximity halo — stable, no avatar-attached tooltip. */
export function LoungeProximityRing({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="lounge-proximity-ring pointer-events-none absolute z-[15] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-400/50"
      style={{ left: x, top: y, width: 96, height: 96 }}
      aria-hidden
    />
  );
}
