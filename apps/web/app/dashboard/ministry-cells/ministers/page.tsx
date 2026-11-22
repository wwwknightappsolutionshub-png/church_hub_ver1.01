'use client';

import { ModuleGate } from '@/components/app/ModuleGate';
import { CellMinistersPage } from '@/components/ministry-cells/CellMinistersPage';

export default function MinistryCellsMinistersRoute() {
  return (
    <ModuleGate gate="ministryCells">
      <CellMinistersPage />
    </ModuleGate>
  );
}
