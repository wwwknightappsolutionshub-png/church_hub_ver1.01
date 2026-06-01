import Link from 'next/link';
import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Offline — Church Hub',
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <WifiOff className="h-14 w-14 text-muted-foreground" aria-hidden />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">You are offline</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Church Hub saved your last visit. Reconnect to sync outreach captures, attendance rolls,
          and membership updates.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Try again</Link>
      </Button>
    </div>
  );
}
