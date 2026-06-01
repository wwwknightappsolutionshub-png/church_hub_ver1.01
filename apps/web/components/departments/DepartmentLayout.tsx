'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface DepartmentTabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

export function DepartmentLayout({
  title,
  subtitle,
  departmentCode,
  accessLabel,
  tabs,
  activeTab,
  onTabChange,
  children,
}: {
  title: string;
  subtitle: string;
  departmentCode: string;
  accessLabel: string;
  tabs: DepartmentTabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="department-module-root overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <header className="border-b bg-gradient-to-br from-primary/[0.07] via-background to-background px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display truncate text-lg font-semibold tracking-tight">{title}</h2>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[10px]">
              {departmentCode}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {accessLabel}
            </Badge>
          </div>
        </div>
      </header>

      <nav
        className="border-b bg-muted/25 px-1 md:px-2"
        aria-label="Department sections"
      >
        <div className="-mb-px flex gap-0 overflow-x-auto scrollbar-thin">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={cn(
                  'relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors md:px-4',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0 opacity-80" />}
                {t.label}
                {active && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="bg-background p-4 md:p-6">{children}</div>
    </div>
  );
}
