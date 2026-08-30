'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useDemoTour } from '@/components/demo/DemoTourContext';

/** Soft zoom-in / zoom-out when the tour advances to a new dashboard module. */
export function DemoTourContentMotion({ children }: { children: React.ReactNode }) {
  const { active, contentPulse } = useDemoTour();
  const reduceMotion = useReducedMotion();

  if (!active || reduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      key={contentPulse}
      className="min-h-full origin-center"
      initial={{ opacity: 0.55, scale: 0.94 }}
      animate={{
        opacity: [0.55, 1, 1],
        scale: [0.94, 1.03, 1],
      }}
      transition={{
        duration: 0.85,
        times: [0, 0.55, 1],
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  );
}
