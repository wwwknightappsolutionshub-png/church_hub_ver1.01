'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export type SectionTabItem = {
  id: string;
  label: string;
  /** Optional shorter label for dense layouts. */
  shortLabel?: string;
  icon?: LucideIcon;
  href?: string;
  badge?: number | string;
  disabled?: boolean;
  testId?: string;
};

type SectionTabNavProps = {
  items: SectionTabItem[];
  activeId: string;
  onChange?: (id: string) => void;
  ariaLabel?: string;
  className?: string;
  /** Visual density. */
  size?: 'sm' | 'md';
  /** Extra controls on the same row (e.g. export). */
  actions?: ReactNode;
  /**
   * On narrow viewports, use a full-width select instead of wrapping chips
   * when there are many items (avoids tall multi-row tab stacks).
   */
  /** Collapse to a select below this breakpoint when there are many items. */
  compactSelectBelow?: 'never' | 'sm' | 'md' | 'lg';
  selectId?: string;
  selectTestId?: string;
};

function itemLabel(item: SectionTabItem, compact: boolean) {
  if (compact && item.shortLabel) return item.shortLabel;
  return item.label;
}

function chipClass(active: boolean, size: 'sm' | 'md', disabled?: boolean) {
  return cn(
    'inline-flex max-w-full items-center justify-center gap-1.5 rounded-md font-medium transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    size === 'sm' ? 'min-h-8 px-2.5 py-1.5 text-xs' : 'min-h-9 px-3 py-2 text-sm',
    disabled && 'pointer-events-none opacity-50',
    active
      ? 'bg-foreground text-background shadow-sm'
      : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground',
  );
}

/**
 * Responsive section tabs: wrap on all breakpoints — never horizontal scroll.
 * Dense sets can optionally collapse to a select on small screens.
 */
export function SectionTabNav({
  items,
  activeId,
  onChange,
  ariaLabel = 'Sections',
  className,
  size = 'md',
  actions,
  compactSelectBelow = 'sm',
  selectId = 'section-tab-nav-select',
  selectTestId,
}: SectionTabNavProps) {
  const router = useRouter();
  const dense = items.length > 5;
  const selectBreakpoint =
    compactSelectBelow !== 'never' && dense ? compactSelectBelow : null;

  return (
    <div className={cn('w-full', className)}>
      {selectBreakpoint && (
        <div
          className={cn(
            'mb-2',
            selectBreakpoint === 'sm' && 'sm:hidden',
            selectBreakpoint === 'md' && 'md:hidden',
            selectBreakpoint === 'lg' && 'lg:hidden',
          )}
        >
          <label htmlFor={selectId} className="sr-only">
            {ariaLabel}
          </label>
          <select
            id={selectId}
            data-testid={selectTestId}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm"
            value={activeId}
            onChange={(e) => {
              const next = e.target.value;
              const item = items.find((i) => i.id === next);
              if (!item || item.disabled) return;
              if (item.href) {
                router.push(item.href);
                return;
              }
              onChange?.(next);
            }}
          >
            {items.map((item) => (
              <option key={item.id} value={item.id} disabled={item.disabled}>
                {item.label}
                {item.badge != null && Number(item.badge) > 0 ? ` (${item.badge})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        className={cn(
          'flex flex-wrap items-center gap-2',
          selectBreakpoint === 'sm' && 'hidden sm:flex',
          selectBreakpoint === 'md' && 'hidden md:flex',
          selectBreakpoint === 'lg' && 'hidden lg:flex',
        )}
      >
        <nav
          className="flex min-w-0 flex-1 flex-wrap gap-1.5"
          role="tablist"
          aria-label={ariaLabel}
        >
          {items.map((item) => {
            const active = item.id === activeId;
            const Icon = item.icon;
            const content = (
              <>
                {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden /> : null}
                <span className="truncate">{itemLabel(item, size === 'sm')}</span>
                {item.badge != null && Number(item.badge) > 0 ? (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                      active ? 'bg-background/20 text-background' : 'bg-foreground/10 text-foreground',
                    )}
                  >
                    {Number(item.badge) > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </>
            );

            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  role="tab"
                  aria-selected={active}
                  aria-current={active ? 'page' : undefined}
                  data-testid={item.testId}
                  className={chipClass(active, size, item.disabled)}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={item.disabled}
                data-testid={item.testId}
                onClick={() => onChange?.(item.id)}
                className={chipClass(active, size, item.disabled)}
              >
                {content}
              </button>
            );
          })}
        </nav>
        {actions ? <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
