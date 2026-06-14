'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, ChevronRight, Layers, Menu, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DepartmentTabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  description?: string;
}

export interface DepartmentNavGroup {
  id: string;
  label: string;
  items: DepartmentTabItem[];
}

export function DepartmentLayout({
  title,
  subtitle,
  departmentCode,
  accessLabel,
  navGroups,
  activeTab,
  onTabChange,
  children,
}: {
  title: string;
  subtitle: string;
  departmentCode: string;
  accessLabel: string;
  navGroups: DepartmentNavGroup[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const flatTabs = useMemo(
    () => navGroups.flatMap((group) => group.items),
    [navGroups],
  );

  const activeGroup = navGroups.find((g) => g.items.some((i) => i.id === activeTab));
  const activeItem = flatTabs.find((t) => t.id === activeTab) ?? flatTabs[0];
  const activeGroupId = activeGroup?.id ?? navGroups[0]?.id;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const initialActiveGroupId =
      navGroups.find((g) => g.items.some((i) => i.id === activeTab))?.id ?? navGroups[0]?.id;
    for (const group of navGroups) {
      initial[group.id] = group.id === initialActiveGroupId;
    }
    return initial;
  });

  const expandOnlyGroup = (groupId: string) => {
    setExpandedGroups(() => {
      const next: Record<string, boolean> = {};
      for (const group of navGroups) {
        next[group.id] = group.id === groupId;
      }
      return next;
    });
  };

  useEffect(() => {
    if (!activeGroupId) return;
    setExpandedGroups(() => {
      const next: Record<string, boolean> = {};
      for (const group of navGroups) {
        next[group.id] = group.id === activeGroupId;
      }
      return next;
    });
  }, [activeGroupId, navGroups]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      if (prev[groupId]) {
        return { ...prev, [groupId]: false };
      }
      const next: Record<string, boolean> = {};
      for (const group of navGroups) {
        next[group.id] = group.id === groupId;
      }
      return next;
    });
  };

  const selectTab = (tabId: string, onPick?: () => void) => {
    const group = navGroups.find((g) => g.items.some((i) => i.id === tabId));
    if (group) {
      expandOnlyGroup(group.id);
    }
    onTabChange(tabId);
    onPick?.();
  };

  const navButton = (item: DepartmentTabItem, onPick?: () => void) => {
    const Icon = item.icon;
    const active = activeTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => selectTab(item.id, onPick)}
        className={cn(
          'group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
          active
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
        )}
      >
        {Icon ? (
          <Icon
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0',
              active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground',
            )}
          />
        ) : (
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-tight">{item.label}</span>
          {item.description ? (
            <span
              className={cn(
                'mt-0.5 block text-xs leading-snug',
                active ? 'text-primary-foreground/80' : 'text-muted-foreground',
              )}
            >
              {item.description}
            </span>
          ) : null}
        </span>
      </button>
    );
  };

  const sidebar = (onPick?: () => void) => (
    <nav className="space-y-2" aria-label="Department sections">
      {navGroups.map((group) => {
        const expanded = expandedGroups[group.id] ?? false;
        const hasActiveItem = group.items.some((i) => i.id === activeTab);
        return (
          <div key={group.id} className="rounded-lg border border-transparent">
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors',
                hasActiveItem && !expanded
                  ? 'bg-primary/5 text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
              aria-expanded={expanded}
            >
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                  expanded ? 'rotate-0' : '-rotate-90',
                )}
              />
              <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider">
                {group.label}
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground/70">
                {group.items.length}
              </span>
            </button>
            {expanded ? (
              <div className="mt-1 space-y-1 pb-1 pl-1">{group.items.map((item) => navButton(item, onPick))}</div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <header className="border-b bg-gradient-to-r from-primary/[0.06] via-background to-background px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Department workspace
              </p>
              <h2 className="font-display truncate text-xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
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

      <div className="flex min-h-[560px] flex-col lg:flex-row">
        <aside className="hidden w-64 shrink-0 border-b border-border/60 bg-muted/20 p-4 lg:block lg:border-b-0 lg:border-r">
          {sidebar()}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/10 px-4 py-3 lg:hidden">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Current section
              </p>
              <p className="truncate text-sm font-medium">{activeItem?.label ?? 'Home'}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0 gap-2"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-4 w-4" />
              Sections
            </Button>
          </div>

          <div className="hidden items-center gap-2 border-b border-border/60 px-6 py-3 lg:flex">
            {activeGroup ? (
              <>
                <span className="text-xs text-muted-foreground">{activeGroup.label}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              </>
            ) : null}
            <span className="text-sm font-medium">{activeItem?.label ?? 'Home'}</span>
            {activeItem?.description ? (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="truncate text-sm text-muted-foreground">{activeItem.description}</span>
              </>
            ) : null}
          </div>

          <div className="flex-1 bg-background p-4 md:p-6 lg:p-8">{children}</div>
        </div>
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,320px)] flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground">Choose a section</p>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => setMobileNavOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{sidebar(() => setMobileNavOpen(false))}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
