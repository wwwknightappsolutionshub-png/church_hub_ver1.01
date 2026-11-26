import { useMemo } from 'react';

/** Stable from/to for outreach panels. Empty props mean the last 30 days, computed once. */
export function useOutreachRange(dateFrom: string, dateTo: string) {
  return useMemo(() => {
    const end = dateTo ? new Date(dateTo) : new Date();
    const start = dateFrom ? new Date(dateFrom) : new Date(end.getTime() - 30 * 86400000);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [dateFrom, dateTo]);
}
