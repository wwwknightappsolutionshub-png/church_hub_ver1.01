'use client';

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const sync = () => setMatches(mql.matches);
    sync();
    setReady(true);
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, [query]);

  return { matches, ready };
}
