import type { ReactNode } from 'react';

export default function Wisdom365Layout({ children }: { children: ReactNode }) {
  return (
    <div className="wisdom365-module -mx-4 -mt-4 min-h-[100dvh] bg-background sm:-mx-6 md:-mx-8 xl:mx-0 xl:mt-0">
      {children}
    </div>
  );
}
