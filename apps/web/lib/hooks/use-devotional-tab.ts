'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DEVOTIONAL_HUB_ROUTES, type DevotionalHubTabId } from '@/lib/devotional-hub';

const TAB_IDS: DevotionalHubTabId[] = [
  'today',
  'plans',
  'study',
  'actions',
  'review',
  'challenges',
  'reminders',
  'groups',
  'journal',
  'prayer',
];

function parseTab(raw: string | null): DevotionalHubTabId {
  if (raw && TAB_IDS.includes(raw as DevotionalHubTabId)) {
    return raw as DevotionalHubTabId;
  }
  return 'today';
}

export function useDevotionalTab(defaultTab: DevotionalHubTabId = 'today') {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTab = parseTab(searchParams.get('tab'));
  const [tab, setTabState] = useState<DevotionalHubTabId>(urlTab);

  useEffect(() => {
    if (pathname === DEVOTIONAL_HUB_ROUTES.hub) {
      setTabState(urlTab);
    }
  }, [urlTab, pathname]);

  const setTab = useCallback(
    (next: DevotionalHubTabId) => {
      setTabState(next);
      if (pathname !== DEVOTIONAL_HUB_ROUTES.hub) return;
      const params = new URLSearchParams(searchParams.toString());
      if (next === defaultTab) params.delete('tab');
      else params.set('tab', next);
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams, defaultTab],
  );

  return { tab, setTab };
}
