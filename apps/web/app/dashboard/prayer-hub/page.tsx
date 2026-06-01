'use client';

import { HubBoard } from '@/components/hubs/HubBoard';

export default function PrayerHubPage() {
  return (
    <HubBoard
      type="prayer"
      hubPath="prayer-hub"
      title="Prayer Hub"
      description="Governed prayer wall—browse congregation requests, record intercession, and share encouragement within church policy."
    />
  );
}
