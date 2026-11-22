'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { MinistryCellsPageShell } from '@/components/ministry-cells/MinistryCellsApp';
import { ModuleGate } from '@/components/app/ModuleGate';

export default function MinistryCellsPage() {
  return (
    <ModuleGate gate="ministryCells">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <MinistryCellsPageShell />
      </Suspense>
    </ModuleGate>
  );
}
