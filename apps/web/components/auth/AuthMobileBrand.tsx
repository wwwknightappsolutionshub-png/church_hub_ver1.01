'use client';

/** Compact brand strip on auth pages (mobile / tablet). */
export function AuthMobileBrand() {
  return (
    <div className="relative flex shrink-0 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[hsl(234,56%,42%)] to-[hsl(234,45%,22%)] px-6 py-8 lg:hidden">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
        <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
          <path d="M16 4L26 10V22L16 28L6 22V10L16 4Z" className="fill-white" opacity="0.95" />
          <path
            d="M16 10V22M11 13L16 10L21 13"
            stroke="hsl(43 74% 55%)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="font-heading text-lg font-bold text-white">
        Church<span className="text-[hsl(43,74%,58%)]">_Hub</span>
      </p>
      <p className="mt-1 text-center text-xs text-white/70">Your church community app</p>
    </div>
  );
}
