'use client';

import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { HubBoard } from '@/components/hubs/HubBoard';

export default function TestimonyHubPage() {
  return (
    <HubBoard
      type="praise"
      hubPath="testimony-hub"
      title="Testimony Hub"
      description={MODULE_DESCRIPTIONS.testimonyHub}
    />
  );
}
