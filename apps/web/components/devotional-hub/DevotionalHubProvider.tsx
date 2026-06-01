'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { DevotionalHubContext } from '@church-hub/shared-types';
import { DEVOTIONAL_QUERY_KEYS, DEVOTIONAL_QUERY_STALE } from '@/lib/devotional-hub';
import {
  cacheDevotionalContext,
  readCachedDevotionalContext,
} from '@/lib/devotional-cache';
import { useApiQuery } from '@/lib/hooks/use-api-query';

const DevotionalHubContextReact = createContext<DevotionalHubContext | null>(null);

export function DevotionalHubProvider({ children }: { children: ReactNode }) {
  const cachedContext = readCachedDevotionalContext();

  const { data } = useApiQuery<DevotionalHubContext>(
    DEVOTIONAL_QUERY_KEYS.context(),
    '/devotional-hub/context',
    {
      staleTime: DEVOTIONAL_QUERY_STALE.context,
      placeholderData: cachedContext ?? undefined,
    },
  );

  useEffect(() => {
    if (data) cacheDevotionalContext(data);
  }, [data]);

  const value = data ?? cachedContext ?? null;

  return (
    <DevotionalHubContextReact.Provider value={value}>
      {children}
    </DevotionalHubContextReact.Provider>
  );
}

export function useDevotionalHubContext() {
  return useContext(DevotionalHubContextReact);
}
