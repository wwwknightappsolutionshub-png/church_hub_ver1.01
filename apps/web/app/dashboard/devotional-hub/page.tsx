import { Suspense } from 'react';
import { DevotionalHubPanel } from '@/components/devotional-hub/DevotionalHubPanel';
import { Skeleton } from '@/components/ui/skeleton';

function DevotionalHubFallback() {
  return (
    <div className="space-y-6 p-6 md:p-8" aria-busy="true" aria-label="Loading Devotional Hub">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export default function DevotionalHubPage() {
  return (
    <Suspense fallback={<DevotionalHubFallback />}>
      <DevotionalHubPanel />
    </Suspense>
  );
}
