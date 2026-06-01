import type { ReactNode } from 'react';
import { YouthErrorBoundary } from '@/components/youth/YouthErrorBoundary';
import { YouthProvider } from '@/components/youth/YouthProvider';
import { YouthShell } from '@/components/youth/YouthShell';

/**
 * Youth Community layout — shared safe mode, feature nav, access context.
 */
export default function YouthLayout({ children }: { children: ReactNode }) {
  return (
    <YouthProvider>
      <YouthShell>
        <YouthErrorBoundary>{children}</YouthErrorBoundary>
      </YouthShell>
    </YouthProvider>
  );
}
