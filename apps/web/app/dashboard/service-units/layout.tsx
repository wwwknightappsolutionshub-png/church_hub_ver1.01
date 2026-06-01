'use client';

import { ModuleGate } from '@/components/app/ModuleGate';

export default function ServiceUnitsLayout({ children }: { children: React.ReactNode }) {
  return <ModuleGate gate="serviceUnitHub">{children}</ModuleGate>;
}
