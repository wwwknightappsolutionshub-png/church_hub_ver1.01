'use client';

import { MinistryCellsPageShell } from '@/components/ministry-cells/MinistryCellsApp';
import { ModuleGate } from '@/components/app/ModuleGate';

export default function MinistryCellsPage() {
  return (
    <ModuleGate gate="ministryCells">
      <MinistryCellsPageShell />
    </ModuleGate>
  );
}
