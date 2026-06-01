'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronDown, Plus } from 'lucide-react';
import type { QuickActionItem } from '@/lib/quick-actions';
import { Button } from '@/components/ui/button';

export type { QuickActionItem };

interface QuickActionsMenuProps {
  actions: QuickActionItem[];
  /** Anchor id to scroll to (e.g. quick-actions card on overview) */
  scrollTargetId?: string;
}

export function QuickActionsMenu({ actions, scrollTargetId }: QuickActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const scrollToCard = () => {
    if (!scrollTargetId) return;
    document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        size="sm"
        className="shadow-brand"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Quick action
        <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-border bg-card py-1 shadow-elevated"
        >
          {actions.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              role="menuitem"
              href={href}
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted/60"
              onClick={() => setOpen(false)}
            >
              <Icon className="h-4 w-4 text-primary" />
              {label}
              <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
          {scrollTargetId && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/60"
              onClick={scrollToCard}
            >
              View all shortcuts
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function QuickActionsList({ actions }: { actions: QuickActionItem[] }) {
  return (
    <div className="space-y-2">
      {actions.map(({ label, href, icon: Icon }) => (
        <Link
          key={label}
          href={href}
          className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:bg-muted/50"
        >
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          {label}
          <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}
