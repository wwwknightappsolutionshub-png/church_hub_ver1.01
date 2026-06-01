'use client';

import { useEffect, useState } from 'react';
import { AppSplash } from '@/components/app/AppSplash';

const MIN_SPLASH_MS = 1400;

interface AppSplashGateProps {
  children: React.ReactNode;
}

export function AppSplashGate({ children }: AppSplashGateProps) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const done = () => {
      const elapsed = Date.now() - start;
      const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
      window.setTimeout(() => {
        setExiting(true);
        window.setTimeout(() => setVisible(false), 480);
      }, wait);
    };
    done();
  }, []);

  return (
    <>
      {visible && <AppSplash exiting={exiting} />}
      <div
        className={visible && !exiting ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}
        aria-hidden={visible && !exiting}
      >
        {children}
      </div>
    </>
  );
}
