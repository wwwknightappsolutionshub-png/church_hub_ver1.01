import {
  landingEyebrow,
  landingHeading,
  landingSubheading,
  type ChurchSectionTone,
} from './church-landing-classes';
import { cn } from '@/lib/utils';

export function LandingSectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
  tone = 'surface',
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  tone?: ChurchSectionTone;
  className?: string;
}) {
  const onBrand = tone === 'brand';

  return (
    <header
      className={cn(
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            landingEyebrow,
            onBrand && '!text-[hsl(43_74%_62%)]',
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          landingHeading,
          eyebrow && 'mt-2',
          onBrand && '!text-white',
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            landingSubheading,
            align === 'center' && 'mx-auto max-w-2xl',
            onBrand && '!text-white/80',
          )}
        >
          {description}
        </p>
      )}
      <div
        className={cn(
          'church-section-divider mt-5 h-1 w-14 rounded-full sm:mt-6',
          align === 'center' && 'mx-auto',
          onBrand ? 'bg-[hsl(43_74%_55%)]' : 'bg-gradient-to-r from-primary to-[hsl(43_74%_49%)]',
        )}
        aria-hidden
      />
    </header>
  );
}
