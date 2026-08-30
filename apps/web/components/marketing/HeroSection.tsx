'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Shield, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductPreview } from './ProductPreview';

const trustItems = [
  'SOC 2 ready architecture',
  'Offline-first evangelism',
  'Multi-campus support',
  'Role-based access control',
];

const HERO_SUBHEADING = 'For the entire church management';
const HERO_DESCRIPTION =
  'Church_Hub unifies managing evangelism drives, membership, discipleship, youth & teens, business networking, and unit reporting — so pastors and leaders shepherd people with clarity, not chaos.';

const TYPEWRITER_CHAR_MS = 62;

function HeroTypewriter({ text, startDelayMs }: { text: string; startDelayMs: number }) {
  const reduceMotion = useReducedMotion();
  const [visibleLength, setVisibleLength] = useState(reduceMotion ? text.length : 0);
  const [showCursor, setShowCursor] = useState(!reduceMotion);
  const done = visibleLength >= text.length;

  // Split so "church management" can use a darker tone than the lead-in.
  const darkStart = text.indexOf('church management');
  const lead = darkStart >= 0 ? text.slice(0, darkStart) : text;
  const dark = darkStart >= 0 ? text.slice(darkStart) : '';

  useEffect(() => {
    if (reduceMotion) {
      setVisibleLength(text.length);
      setShowCursor(false);
      return;
    }

    setVisibleLength(0);
    setShowCursor(true);

    let intervalId: ReturnType<typeof setInterval> | undefined;
    const startTimeoutId = setTimeout(() => {
      let index = 0;
      intervalId = setInterval(() => {
        index += 1;
        setVisibleLength(index);
        if (index >= text.length) {
          clearInterval(intervalId);
          setShowCursor(false);
        }
      }, TYPEWRITER_CHAR_MS);
    }, startDelayMs);

    return () => {
      clearTimeout(startTimeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [reduceMotion, startDelayMs, text]);

  const leadShown = text.slice(0, Math.min(visibleLength, lead.length));
  const darkShown =
    visibleLength > lead.length ? text.slice(lead.length, visibleLength) : '';

  return (
    <>
      <p className="mt-3 font-heading text-2xl font-bold leading-snug text-foreground sm:text-3xl lg:text-4xl">
        <span className="text-muted-foreground">{leadShown}</span>
        <span className="text-foreground">{darkShown}</span>
        {showCursor && (
          <span className="ml-0.5 inline-block h-[0.85em] w-[2px] animate-pulse bg-foreground align-[-0.1em]" aria-hidden />
        )}
      </p>
      {done ? (
        <motion.p
          className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.65, ease: 'easeOut' }}
        >
          {HERO_DESCRIPTION}
        </motion.p>
      ) : null}
    </>
  );
}

export function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-faint opacity-30" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-radial-hero" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
        <div>
          <Badge variant="gold" className="mb-6">
            Trusted by 500+ churches worldwide
          </Badge>

          <motion.h1
            className="font-heading text-4xl font-bold leading-[1.1] text-primary sm:text-5xl lg:text-6xl"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.55, ease: 'easeOut' }}
          >
            ONE PLATFORM
          </motion.h1>

          <HeroTypewriter text={HERO_SUBHEADING} startDelayMs={700} />

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="shadow-brand" asChild>
              <Link href="/register">
                Start Trial Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <ul className="mt-8 grid gap-2 sm:grid-cols-2">
            {trustItems.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex items-center gap-6 border-t border-border pt-8">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-medium">Enterprise-grade security</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-gold" />
              <span className="font-medium">Deploy in days, not months</span>
            </div>
          </div>
        </div>

        <div className="animate-fade-up lg:pl-4" style={{ animationDelay: '0.15s' }}>
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
