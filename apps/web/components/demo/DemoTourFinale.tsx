'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { BrandIcon } from '@/components/brand/BrandMark';
import { Button } from '@/components/ui/button';

type Props = {
  onClose?: () => void;
};

export function DemoTourFinale({ onClose }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-primary px-6"
      data-testid="demo-tour-finale"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-tour-finale-title"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--gold)/0.28),transparent_55%)]"
      />

      <motion.div
        className="relative z-10 flex w-full max-w-lg flex-col items-center rounded-3xl border border-white/15 bg-white/10 p-8 text-center shadow-elevated backdrop-blur-md sm:p-12"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
          <BrandIcon variant="light" className="h-12 w-12" />
        </div>

        <p className="mt-6 font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Church<span className="text-gold">_Hub</span>
        </p>

        <h1
          id="demo-tour-finale-title"
          className="mt-8 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl"
        >
          Thank You For Your Patience.
        </h1>
        <p className="mt-3 max-w-md text-base text-primary-foreground/80">
          You just walked through a preview of Church_Hub leadership tools. Ready to launch your own
          church workspace?
        </p>

        <Button
          size="lg"
          variant="secondary"
          className="mt-10 min-w-[12rem] text-base font-semibold shadow-lg"
          asChild
        >
          <Link href="/register" onClick={() => onClose?.()}>
            SignUP NOW
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
