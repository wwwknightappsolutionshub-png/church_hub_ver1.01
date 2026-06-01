import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CTASection() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      <div aria-hidden className="absolute inset-0 bg-primary" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--gold)/0.25),transparent_60%)]"
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center lg:px-8">
        <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">
          Ready to unify your church community?
        </h2>
        <p className="mt-4 text-lg text-primary-foreground/80">
          Join hundreds of churches using Church_Hub to manage membership, discipleship,
          and every ministry from one platform.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" variant="secondary" className="shadow-lg" asChild>
            <Link href="/register">
              Start free 14-day trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/30 bg-transparent text-white hover:bg-white/10"
            asChild
          >
            <Link href="/dashboard">Explore demo dashboard</Link>
          </Button>
        </div>
        <p className="mt-6 text-sm text-primary-foreground/60">No credit card required · Cancel anytime</p>
      </div>
    </section>
  );
}
