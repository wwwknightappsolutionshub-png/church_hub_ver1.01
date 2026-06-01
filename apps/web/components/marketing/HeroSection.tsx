'use client';

import Link from 'next/link';
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

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-faint opacity-30" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-radial-hero" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
        <div className="animate-fade-up">
          <Badge variant="gold" className="mb-6">
            Trusted by 500+ churches worldwide
          </Badge>

          <h1 className="font-heading text-4xl font-bold leading-[1.1] text-foreground sm:text-5xl lg:text-6xl">
            One platform for your{' '}
            <span className="text-primary">entire church community</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Church_Hub unifies membership, discipleship, evangelism, youth, business networking,
            and bus ministry — with enterprise security and ministry-first workflows.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="shadow-brand" asChild>
              <Link href="/register">
                Start 14-day free trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/dashboard">View live demo</Link>
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
