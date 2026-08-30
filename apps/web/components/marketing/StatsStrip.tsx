'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

const stats = [
  { value: '500+', label: 'Churches onboarded', target: 500, suffix: '+', decimals: 0 },
  { value: '2.4M', label: 'Members managed', target: 2.4, suffix: 'M', decimals: 1 },
  { value: '99.9%', label: 'Platform uptime', target: 99.9, suffix: '%', decimals: 1 },
  { value: '78%', label: 'Avg. follow-up completion', target: 78, suffix: '%', decimals: 0 },
] as const;

function formatStatValue(value: number, decimals: number, suffix: string) {
  const formatted = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
  return `${formatted}${suffix}`;
}

function AnimatedStat({
  target,
  suffix,
  decimals,
  isActive,
}: {
  target: number;
  suffix: string;
  decimals: number;
  isActive: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [current, setCurrent] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    if (!isActive || reduceMotion) {
      setCurrent(target);
      return;
    }

    setCurrent(0);
    const durationMs = 1200;
    const start = performance.now();

    let frameId = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - (1 - progress) ** 3;
      setCurrent(target * eased);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [decimals, isActive, reduceMotion, suffix, target]);

  const shown =
    isActive || reduceMotion
      ? formatStatValue(current, decimals, suffix)
      : formatStatValue(0, decimals, suffix);

  return (
    <p className="font-heading text-3xl font-bold text-white lg:text-4xl">{shown}</p>
  );
}

export function StatsStrip() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px 0px' });
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="platform"
      ref={sectionRef}
      className="border-b border-border bg-sidebar py-12"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 lg:grid-cols-4 lg:px-8">
        {stats.map(({ label, target, suffix, decimals }, index) => (
          <motion.div
            key={label}
            className="text-center"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{
              duration: reduceMotion ? 0 : 0.5,
              ease: 'easeOut',
              delay: reduceMotion ? 0 : index * 0.12,
            }}
          >
            <AnimatedStat
              target={target}
              suffix={suffix}
              decimals={decimals}
              isActive={isInView}
            />
            <p className="mt-1 text-sm text-sidebar-foreground/70">{label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
