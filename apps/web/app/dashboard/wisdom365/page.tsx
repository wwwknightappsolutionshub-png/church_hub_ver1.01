'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Wisdom365App } from '@/components/wisdom365/Wisdom365App';

function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function Wisdom365Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Wisdom365App />
    </Suspense>
  );
}
