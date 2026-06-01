'use client';

const HEADER_RATIO = 0.38;

/** Executive lounge backdrop — dark briefing band + light floor plaza. */
export function LoungeAtriumScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl" aria-hidden>
      <div className="absolute inset-0 bg-slate-950/5" />

      {/* Header / intelligence band */}
      <div className="absolute inset-x-0 top-0 h-[38%] bg-gradient-to-b from-slate-950 via-slate-800 to-slate-700/95" />
      <div
        className="absolute inset-x-0 top-0 h-[38%] opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 50%, transparent)',
        }}
      />
      <div className="absolute inset-x-6 top-3 hidden h-px bg-white/10 sm:block" />
      <div className="absolute inset-x-6 top-[38%] h-px bg-slate-500/30" />

      {/* Floor plaza */}
      <div className="absolute inset-x-0 bottom-0 top-[36%] bg-gradient-to-b from-slate-200 via-slate-100 to-slate-50" />
      <div
        className="absolute inset-x-0 bottom-0 top-[40%] opacity-50"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(15,23,42,0.03) 0, rgba(15,23,42,0.03) 1px, transparent 1px, transparent 48px), repeating-linear-gradient(0deg, rgba(15,23,42,0.03) 0, rgba(15,23,42,0.03) 1px, transparent 1px, transparent 48px)',
        }}
      />
      <div className="absolute left-1/2 top-[52%] h-[38%] w-[min(92%,560px)] -translate-x-1/2 rounded-[100%] border border-slate-300/50 bg-gradient-to-b from-white/40 to-transparent shadow-[inset_0_12px_32px_rgba(15,23,42,0.06)]" />
    </div>
  );
}

export const LOUNGE_HEADER_RATIO = HEADER_RATIO;
