import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Detail pane for a single settings topic. */
export function SettingsSection({
  id,
  title,
  description,
  icon,
  children,
  className,
  footer,
  index,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  index?: string;
}) {
  return (
    <section id={id} className={cn('min-w-0', className)}>
      <div className="mb-5 flex gap-4 sm:mb-6">
        <div
          className="mt-1 hidden w-1 shrink-0 self-stretch rounded-full bg-gradient-to-b from-amber-400 to-slate-700 sm:block"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            {index ? (
              <span className="font-mono text-[11px] font-semibold tracking-wider text-amber-700/90 dark:text-amber-300/90">
                {index}
              </span>
            ) : null}
            {icon ? (
              <span className="inline-flex text-slate-600 dark:text-slate-300" aria-hidden>
                {icon}
              </span>
            ) : null}
          </div>
          <h2 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {title}
          </h2>
          {description ? (
            <div className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          'rounded-xl border border-slate-200/80 bg-white/95 p-5 sm:p-6',
          'shadow-[0_1px_0_rgba(15,23,42,0.04)]',
          'dark:border-slate-800 dark:bg-card',
        )}
      >
        {children}
        {footer ? (
          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">{footer}</div>
        ) : null}
      </div>
    </section>
  );
}

export type SettingsNavItem = {
  id: string;
  label: string;
};

/** Master list — selects which settings detail pane is shown. */
export function SettingsSideNav({
  items,
  activeId,
  onSelect,
}: {
  items: SettingsNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  if (!items.length) return null;

  return (
    <>
      <nav
        className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden"
        aria-label="Settings sections"
      >
        {items.map((item, i) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-sm transition',
                active
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
              )}
            >
              <span className="mr-1.5 font-mono text-[10px] opacity-70">
                {String(i + 1).padStart(2, '0')}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <aside className="hidden lg:block">
        <nav
          className="sticky top-24 space-y-1 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          aria-label="Settings sections"
        >
          <p className="px-2.5 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Settings
          </p>
          {items.map((item, i) => {
            const active = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm font-medium transition',
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white',
                )}
              >
                <span
                  className={cn(
                    'font-mono text-[10px]',
                    active
                      ? 'text-amber-300 dark:text-amber-700'
                      : 'text-amber-700/80 dark:text-amber-300/80',
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
