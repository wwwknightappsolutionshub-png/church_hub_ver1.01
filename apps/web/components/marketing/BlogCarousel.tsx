'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { safeCoverPath } from '@/lib/guide-image';
import type { GuideCard } from '@/lib/public-guides';

export function BlogCarousel({ posts }: { posts: GuideCard[] }) {
  const scroller = useRef<HTMLDivElement>(null);

  const move = (direction: number) => {
    const node = scroller.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: 'smooth' });
  };

  if (posts.length === 0) return null;

  return (
    <section className="border-b border-border py-20 lg:py-28" aria-labelledby="home-blog-heading">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 id="home-blog-heading" className="font-heading text-3xl font-bold sm:text-4xl">
              Notes for pastors and church teams
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Practical reading on membership, first-time guests, discipleship, and evangelism.
            </p>
          </div>
          <div className="hidden gap-2 sm:flex">
            <Button type="button" variant="outline" size="icon" onClick={() => move(-1)} aria-label="Previous articles">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => move(1)} aria-label="Next articles">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div
          ref={scroller}
          className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        >
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="w-[85%] shrink-0 snap-start rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 sm:w-[46%] lg:w-[calc(25%-12px)]"
            >
              <img
                src={safeCoverPath(post.coverImagePath)}
                alt={post.coverImageAlt}
                width={1200}
                height={630}
                loading="lazy"
                decoding="async"
                className="aspect-[1200/630] w-full rounded-xl bg-primary object-cover"
              />
              <h3 className="mt-4 font-heading text-lg font-semibold leading-snug">{post.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.summary}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
