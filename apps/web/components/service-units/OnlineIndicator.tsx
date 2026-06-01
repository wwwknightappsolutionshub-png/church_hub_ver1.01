'use client';

import { cn } from '@/lib/utils';

export function OnlineIndicator({
  online,
  className,
  size = 'sm',
}: {
  online: boolean;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className={cn(
        'inline-block shrink-0 rounded-full ring-2 ring-card',
        online ? 'bg-success' : 'bg-muted-foreground/30',
        size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3',
        className,
      )}
      title={online ? 'Online' : 'Offline'}
      aria-label={online ? 'Online' : 'Offline'}
    />
  );
}

export function MemberWithPresence({
  name,
  online,
  subtitle,
}: {
  name: string;
  online: boolean;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <OnlineIndicator online={online} />
      <div>
        <p className="font-sans text-sm font-medium">{name}</p>
        {subtitle && <p className="font-sans text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
