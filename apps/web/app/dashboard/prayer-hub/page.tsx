'use client';

import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { HubBoard } from '@/components/hubs/HubBoard';

export default function PrayerHubPage() {
  return (
    <HubBoard
      type="prayer"
      hubPath="prayer-hub"
      title="Prayer Hub"
      description={MODULE_DESCRIPTIONS.prayerHub}
    />
  );
}
