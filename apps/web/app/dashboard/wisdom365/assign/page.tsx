'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Wisdom365AssignPage } from '@/components/wisdom365/Wisdom365AssignPage';

export default function Wisdom365AssignRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <Wisdom365AssignPage />
    </Suspense>
  );
}
