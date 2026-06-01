import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  /** Hide on phone/tablet app shell (title shown in top bar) */
  hideOnMobile?: boolean;
}

export function PageHeader({
  title,
  description,
  actions,
  badge,
  hideOnMobile = true,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-b border-border bg-card/50 px-4 py-4 sm:px-6 sm:py-5 md:flex-row md:items-center md:justify-between md:px-8 xl:py-6',
        hideOnMobile && 'hidden xl:flex',
      )}
    >
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="font-sans mt-1 max-w-2xl text-sm text-muted-foreground md:text-base">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
