import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
  variant?: 'light' | 'dark';
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/** Shared Church_Hub mark — geometric hub node + gold accent. */
export function BrandIcon({
  className,
  variant = 'dark',
}: {
  className?: string;
  variant?: 'light' | 'dark';
}) {
  const isLight = variant === 'light';

  return (
    <svg viewBox="0 0 40 40" className={cn('h-full w-full', className)} fill="none" aria-hidden>
      <rect
        width="40"
        height="40"
        rx="10"
        className={isLight ? 'fill-white/12' : 'fill-[hsl(234,56%,42%)]'}
      />
      {/* Outer hub ring */}
      <circle
        cx="20"
        cy="20"
        r="11"
        stroke={isLight ? 'white' : 'white'}
        strokeWidth="1.75"
        opacity={isLight ? 0.9 : 0.95}
      />
      {/* Cardinal nodes */}
      <circle cx="20" cy="9" r="2.25" fill={isLight ? '#d4a853' : '#d4a853'} />
      <circle cx="20" cy="31" r="2.25" fill={isLight ? 'white' : 'white'} opacity="0.9" />
      <circle cx="9" cy="20" r="2.25" fill={isLight ? 'white' : 'white'} opacity="0.9" />
      <circle cx="31" cy="20" r="2.25" fill={isLight ? 'white' : 'white'} opacity="0.9" />
      {/* Center node */}
      <circle cx="20" cy="20" r="3.5" fill={isLight ? '#d4a853' : '#d4a853'} />
      {/* Spoke accents */}
      <path
        d="M20 12.5V16.5M20 23.5V27.5M12.5 20H16.5M23.5 20H27.5"
        stroke={isLight ? 'white' : 'white'}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

export function BrandMark({
  className,
  variant = 'dark',
  showTagline = false,
  size = 'md',
}: BrandMarkProps) {
  const isLight = variant === 'light';
  const iconBox =
    size === 'lg' ? 'h-12 w-12' : size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const titleSize = size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'shrink-0 overflow-hidden rounded-xl shadow-brand',
          iconBox,
          isLight ? 'ring-1 ring-white/25' : '',
        )}
      >
        <BrandIcon variant={variant} />
      </div>
      <div>
        <p
          className={cn(
            'font-bold leading-none tracking-tight',
            titleSize,
            isLight ? 'text-white' : 'text-foreground',
          )}
        >
          Church<span className={isLight ? 'text-gold' : 'text-primary'}>_Hub</span>
        </p>
        {showTagline && (
          <p
            className={cn(
              'mt-0.5 text-[11px] font-medium tracking-wide',
              isLight ? 'text-white/70' : 'text-muted-foreground',
            )}
          >
            Enterprise Ministry Platform
          </p>
        )}
      </div>
    </div>
  );
}
