import { DevotionalHubProvider } from '@/components/devotional-hub/DevotionalHubProvider';
import { DevotionalHubShell } from '@/components/devotional-hub/DevotionalHubShell';
import { DevotionalOfflineBanner } from '@/components/devotional-hub/DevotionalOfflineBanner';

/**
 * Devotional Hub — all ages; integrated with Youth community routes.
 */
export default function DevotionalHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DevotionalHubProvider>
      <DevotionalHubShell>
        <div className="px-6 pt-4 md:px-8">
          <DevotionalOfflineBanner />
        </div>
        {children}
      </DevotionalHubShell>
    </DevotionalHubProvider>
  );
}
