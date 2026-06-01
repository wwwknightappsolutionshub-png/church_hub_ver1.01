'use client';

import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DevotionalTabPanelProps {
  tabId: string;
  active: boolean;
  mounted: boolean;
  children: ReactNode;
  className?: string;
}

export function DevotionalTabPanel({
  tabId,
  active,
  mounted,
  children,
  className,
}: DevotionalTabPanelProps) {
  const reduceMotion = useReducedMotion();

  if (!mounted) return null;

  return (
    <motion.div
      id={`devotional-panel-${tabId}`}
      role="tabpanel"
      aria-labelledby={`devotional-tab-${tabId}`}
      tabIndex={active ? 0 : -1}
      hidden={!active}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
      className={cn(
        'devotional-tab-panel outline-none',
        !active && 'pointer-events-none',
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
