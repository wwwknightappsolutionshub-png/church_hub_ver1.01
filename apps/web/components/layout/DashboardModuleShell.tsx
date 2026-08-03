'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  EnterpriseHero,
  EnterpriseShell,
  EnterpriseTabNav,
} from '@/components/layout/EnterpriseModuleShell';

export interface DashboardModuleTab {
  id: string;
  label: string;
}

/** Profile-style enterprise header (dark hero + optional sticky tabs) for staff dashboard modules. */
export function DashboardModuleShell({
  eyebrow,
  title,
  description,
  badge,
  actions,
  tabs,
  activeTab,
  onTabChange,
  tabAriaLabel,
  tabNav,
  children,
  contentClassName,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  badge?: ReactNode;
  actions?: ReactNode;
  tabs?: DashboardModuleTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  tabAriaLabel?: string;
  /** Custom tab navigation (replaces default EnterpriseTabNav when provided). */
  tabNav?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <EnterpriseShell>
      <EnterpriseHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        badge={badge}
        actions={actions}
      />
      {tabNav}
      {!tabNav && tabs && activeTab !== undefined && onTabChange && (
        <EnterpriseTabNav
          tabs={tabs}
          active={activeTab}
          onChange={onTabChange}
          ariaLabel={tabAriaLabel}
        />
      )}
      <div className={cn('space-y-5 p-4 md:p-6', contentClassName)}>{children}</div>
    </EnterpriseShell>
  );
}
