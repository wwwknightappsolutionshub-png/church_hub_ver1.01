'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { YouthAccessContext } from '@church-hub/shared-types';
import { useApiQuery } from '@/lib/hooks/use-api-query';

const YouthContext = createContext<YouthAccessContext | null>(null);

export function YouthProvider({ children }: { children: ReactNode }) {
  const { data } = useApiQuery<YouthAccessContext>(
    ['youth-context'],
    '/youth/context',
  );

  return (
    <YouthContext.Provider value={data ?? null}>{children}</YouthContext.Provider>
  );
}

export function useYouthContext() {
  const ctx = useContext(YouthContext);
  return ctx;
}
