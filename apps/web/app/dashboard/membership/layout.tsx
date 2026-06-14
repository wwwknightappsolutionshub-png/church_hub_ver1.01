import type { ReactNode } from 'react';
import { CongregantsModuleShell } from '@/components/membership/CongregantsModuleShell';

export default function CongregantsLayout({ children }: { children: ReactNode }) {
  return <CongregantsModuleShell>{children}</CongregantsModuleShell>;
}
