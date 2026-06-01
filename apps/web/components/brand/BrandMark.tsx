import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
  variant?: 'light' | 'dark';
  showTagline?: boolean;
}

export function BrandMark({ className, variant = 'dark', showTagline = false }: BrandMarkProps) {
  const isLight = variant === 'light';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl shadow-brand',
          isLight ? 'bg-white/10 ring-1 ring-white/20' : 'bg-primary',
        )}
      >
        <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden>
          <path
            d="M16 4L26 10V22L16 28L6 22V10L16 4Z"
            className={isLight ? 'fill-white/90' : 'fill-primary-foreground'}
            opacity="0.9"
          />
          <path
            d="M16 10V22M11 13L16 10L21 13"
            stroke={isLight ? 'white' : 'hsl(var(--secondary))'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div>
        <p
          className={cn(
            'text-lg font-bold leading-none tracking-tight',
            isLight ? 'text-white' : 'text-foreground',
          )}
        >
          Church<span className={isLight ? 'text-gold' : 'text-primary'}>_Hub</span>
        </p>
        {showTagline && (
          <p className={cn('mt-0.5 text-[11px] font-medium', isLight ? 'text-white/70' : 'text-muted-foreground')}>
            Enterprise Ministry Platform
          </p>
        )}
      </div>
    </div>
  );
}
