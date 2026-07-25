'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import PlatformInboxInner from './inbox-client';

export default function PlatformInboxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PlatformInboxInner />
    </Suspense>
  );
}
