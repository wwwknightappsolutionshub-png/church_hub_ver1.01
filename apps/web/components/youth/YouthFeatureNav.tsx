'use client';

import { usePathname } from 'next/navigation';
import { SectionTabNav } from '@/components/ui/section-tab-nav';
import { YOUTH_FEATURES } from '@/lib/youth/features';
import { YOUTH_ROUTES } from '@/lib/youth/routes';

export function YouthFeatureNav() {
  const pathname = usePathname();
  const isHub = pathname === YOUTH_ROUTES.hub;

  if (isHub) return null;

  const items = [
    { id: YOUTH_ROUTES.hub, label: 'Hub', href: YOUTH_ROUTES.hub },
    ...YOUTH_FEATURES.map((f) => ({
      id: f.href,
      label: f.label,
      href: f.href,
      icon: f.icon,
    })),
  ];

  const activeId =
    items.find((item) =>
      item.id === YOUTH_ROUTES.hub
        ? pathname === YOUTH_ROUTES.hub
        : pathname.startsWith(item.href),
    )?.id ?? items[0]?.id ?? '';

  return (
    <nav
      className="border-b bg-gradient-to-r from-violet-600/10 via-fuchsia-500/10 to-cyan-500/10 px-4 py-2 backdrop-blur md:px-8"
      aria-label="Youth features"
    >
      <SectionTabNav
        items={items}
        activeId={activeId}
        ariaLabel="Youth features"
        size="sm"
        compactSelectBelow="sm"
        selectId="youth-feature-nav-select"
      />
    </nav>
  );
}
