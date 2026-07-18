'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

type ModuleChromeContextValue = {
  /** When set, the sticky app bar shows this instead of the church name. */
  stickyModuleTitle: string | null;
  setStickyModuleTitle: (title: string | null) => void;
};

const ModuleChromeContext = createContext<ModuleChromeContextValue | null>(null);

export function ModuleChromeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [stickyModuleTitle, setStickyModuleTitleState] = useState<string | null>(null);
  const setStickyModuleTitle = useCallback((title: string | null) => {
    setStickyModuleTitleState(title);
  }, []);

  // Reset when navigating between modules so a previous title never sticks.
  useEffect(() => {
    setStickyModuleTitleState(null);
  }, [pathname]);

  const value = useMemo(
    () => ({ stickyModuleTitle, setStickyModuleTitle }),
    [stickyModuleTitle, setStickyModuleTitle],
  );

  return <ModuleChromeContext.Provider value={value}>{children}</ModuleChromeContext.Provider>;
}

export function useModuleChrome() {
  const ctx = useContext(ModuleChromeContext);
  return (
    ctx ?? {
      stickyModuleTitle: null,
      setStickyModuleTitle: () => undefined,
    }
  );
}
