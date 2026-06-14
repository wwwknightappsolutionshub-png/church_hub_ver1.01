'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 224;
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
      setMenuPos({ top: rect.bottom + 8, left, width });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
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

  const menu =
    open && menuPos ? (
      <div
        ref={rootRef}
        role="menu"
        className="fixed z-[130] rounded-lg border border-border bg-card py-1 shadow-elevated"
        style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
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
        {scrollTargetId ? (
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/60"
            onClick={scrollToCard}
          >
            View all shortcuts
          </button>
        ) : null}
      </div>
    ) : null;

  return (
    <>
      <div className="relative">
        <Button
          ref={buttonRef}
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
      </div>
      {typeof document !== 'undefined' && menu ? createPortal(menu, document.body) : null}
    </>
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
          <span className="min-w-0 flex-1">{label}</span>
          <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}
