'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function WizardSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3 sm:px-5 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/80">
        <div className="flex items-start gap-3">
          {Icon ? (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Icon className="h-4 w-4" />
            </span>
          ) : null}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 sm:text-base dark:text-slate-50">{title}</h3>
            {description ? (
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="space-y-3 p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
      {children}
      {required ? <span className="text-red-600"> *</span> : null}
    </span>
  );
}
