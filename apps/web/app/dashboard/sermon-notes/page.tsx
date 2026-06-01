'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SermonNotesPanel } from '@/components/sermon-notes/SermonNotesPanel';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { isTenantModuleEnabled } from '@/lib/tenant-modules';

export default function SermonNotesPage() {
  const router = useRouter();
  const { canAccessSermonNote, isLoading, enabledModules } = useModuleAccess();
  const moduleOn = isTenantModuleEnabled(enabledModules, 'sermonNote');
  const allowed = canAccessSermonNote;

  useEffect(() => {
    if (isLoading) return;
    if (!moduleOn) {
      router.replace('/dashboard');
      return;
    }
    if (!allowed) {
      router.replace('/dashboard');
    }
  }, [isLoading, allowed, moduleOn, router]);

  if (isLoading || !moduleOn || !allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return <SermonNotesPanel />;
}
