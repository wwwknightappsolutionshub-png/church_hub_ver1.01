import { cn } from '@/lib/utils';
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  className?: string;
}

export function StatCard({ label, value, change, changeLabel, icon: Icon, className }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className={cn('rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md', className)}>
      <div className="flex items-start justify-between">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        {change !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
            )}
          >
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
      {changeLabel && <p className="mt-0.5 text-xs text-muted-foreground">{changeLabel}</p>}
    </div>
  );
}
