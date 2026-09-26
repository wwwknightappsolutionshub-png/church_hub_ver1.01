'use client';

import { useEffect, useMemo, useState } from 'react';
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

function parseAnimatedValue(value: string | number): {
  target: number;
  prefix: string;
  suffix: string;
  decimals: number;
  useGrouping: boolean;
} | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return {
      target: value,
      prefix: '',
      suffix: '',
      decimals: Number.isInteger(value) ? 0 : 1,
      useGrouping: true,
    };
  }

  const raw = String(value).trim();
  const match = raw.match(/^([^0-9\-]*?)(-?\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!match) return null;

  const [, prefix = '', numeric = '', suffix = ''] = match;
  const cleaned = numeric.replace(/,/g, '');
  const target = Number(cleaned);
  if (!Number.isFinite(target)) return null;

  const decimalPart = cleaned.includes('.') ? cleaned.split('.')[1] ?? '' : '';
  return {
    target,
    prefix,
    suffix,
    decimals: decimalPart.length,
    useGrouping: numeric.includes(','),
  };
}

function formatAnimatedNumber(
  n: number,
  decimals: number,
  useGrouping: boolean,
): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping,
  });
}

export function StatCard({ label, value, change, changeLabel, icon: Icon, className }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const parsed = useMemo(() => parseAnimatedValue(value), [value]);
  const [display, setDisplay] = useState(() =>
    parsed
      ? `${parsed.prefix}${formatAnimatedNumber(0, parsed.decimals, parsed.useGrouping)}${parsed.suffix}`
      : String(value),
  );

  useEffect(() => {
    if (!parsed) {
      setDisplay(String(value));
      return;
    }

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || parsed.target === 0) {
      setDisplay(
        `${parsed.prefix}${formatAnimatedNumber(parsed.target, parsed.decimals, parsed.useGrouping)}${parsed.suffix}`,
      );
      return;
    }

    let frame = 0;
    const durationMs = 900;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = parsed.target * eased;
      setDisplay(
        `${parsed.prefix}${formatAnimatedNumber(current, parsed.decimals, parsed.useGrouping)}${parsed.suffix}`,
      );
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setDisplay(
          `${parsed.prefix}${formatAnimatedNumber(parsed.target, parsed.decimals, parsed.useGrouping)}${parsed.suffix}`,
        );
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [parsed, value]);

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
      <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="text-3xl font-bold tracking-tight tabular-nums">{display}</p>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
      {changeLabel && <p className="mt-0.5 text-xs text-muted-foreground">{changeLabel}</p>}
    </div>
  );
}
