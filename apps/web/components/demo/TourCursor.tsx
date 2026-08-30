'use client';

import { motion } from 'framer-motion';

export function TourCursor({
  x,
  y,
  clicking,
  visible,
}: {
  x: number;
  y: number;
  clicking: boolean;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <motion.div
      className="pointer-events-none fixed z-[120]"
      animate={{ x, y, scale: clicking ? 0.88 : 1 }}
      transition={{
        x: { type: 'spring', stiffness: 120, damping: 22 },
        y: { type: 'spring', stiffness: 120, damping: 22 },
        scale: { duration: 0.12 },
      }}
      style={{ left: 0, top: 0 }}
      aria-hidden
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.24c.45 0 .67-.54.35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"
          fill="#111827"
          stroke="#fff"
          strokeWidth="1.25"
        />
      </svg>
      {clicking ? (
        <motion.span
          className="absolute left-1 top-1 h-6 w-6 rounded-full bg-primary/25"
          initial={{ scale: 0.4, opacity: 0.8 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.45 }}
        />
      ) : null}
    </motion.div>
  );
}
