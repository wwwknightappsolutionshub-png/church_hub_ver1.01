'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { SermonPlayer } from '@/components/sermons/SermonPlayer';
import { SermonPlayerProvider } from '@/components/sermons/SermonPlayerContext';
import { Button } from '@/components/ui/button';

interface Sermon {
  id: string;
  title: string;
  speaker?: string | null;
  description?: string | null;
  audioUrl?: string | null;
  seriesName?: string | null;
  preachedAt?: string | null;
  durationSec?: number | null;
}

export default function SpirifySermonsPage() {
  const pathname = usePathname();
  const fromMemberNav = pathname.startsWith('/dashboard/spirify');
  const { data, isLoading } = useApiQuery<Sermon[]>(['sermons'], '/communications/sermons');

  return (
    <DashboardModuleShell
      title="Spirify"
      description="Enterprise sermon library—stream messages, series, and archives with governed church media access."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href={fromMemberNav ? '/dashboard/lounge' : '/dashboard/communications'}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {fromMemberNav ? 'Lounge' : 'Communications'}
          </Link>
        </Button>
      }
      contentClassName="p-4 md:p-6"
    >
      <div>
        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <SermonPlayerProvider>
            <SermonPlayer sermons={data ?? []} />
          </SermonPlayerProvider>
        )}
      </div>
    </DashboardModuleShell>
  );
}
