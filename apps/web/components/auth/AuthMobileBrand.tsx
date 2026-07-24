'use client';

import { BrandMark } from '@/components/brand/BrandMark';

/** Compact brand strip on auth pages (mobile / tablet). */
export function AuthMobileBrand() {
  return (
    <div className="relative flex shrink-0 flex-col items-center justify-center overflow-hidden px-6 py-8 md:hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(145deg, hsl(234,56%,28%) 0%, hsl(234,45%,18%) 55%, #0f172a 100%)',
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden
      />
      <div className="relative flex flex-col items-center text-center">
        <BrandMark variant="light" showTagline size="lg" />
        <p className="mt-3 text-xs text-white/65">Sign in to your church workspace</p>
      </div>
    </div>
  );
}
