'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { YOUTH_FEATURES } from '@/lib/youth/features';
import { YOUTH_ROUTES } from '@/lib/youth/routes';
import { cn } from '@/lib/utils';

export function YouthFeatureNav() {
  const pathname = usePathname();
  const isHub = pathname === YOUTH_ROUTES.hub;

  if (isHub) return null;

  return (
    <nav
      className="border-b bg-gradient-to-r from-violet-600/10 via-fuchsia-500/10 to-cyan-500/10 px-4 py-2 backdrop-blur md:px-8"
      aria-label="Youth features"
    >
      <ul className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li>
          <Link
            href={YOUTH_ROUTES.hub}
            className={cn(
              'inline-flex whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition',
              pathname === YOUTH_ROUTES.hub
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            Hub
          </Link>
        </li>
        {YOUTH_FEATURES.map((f) => {
          const active = pathname.startsWith(f.href);
          return (
            <li key={f.key}>
              <Link
                href={f.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition',
                  active
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <f.icon className="h-3.5 w-3.5" aria-hidden />
                {f.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
