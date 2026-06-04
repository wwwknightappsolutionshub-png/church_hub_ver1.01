'use client';

/** Compact brand strip on auth pages (mobile / tablet). */
export function AuthMobileBrand() {
  return (
    <div className="relative flex shrink-0 flex-col items-center justify-center overflow-hidden px-6 py-8 md:hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/auth-side-visual.svg')" }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(234,56%,42%)]/90 to-[hsl(234,45%,22%)]/95" />
      <div className="auth-side-glow absolute inset-0 opacity-30" aria-hidden />

      <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
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
      <p className="relative font-heading text-lg font-bold text-white">
        Church<span className="text-[hsl(43,74%,58%)]">_Hub</span>
      </p>
      <p className="relative mt-1 text-center text-xs text-white/70">Your church community app</p>
    </div>
  );
}
