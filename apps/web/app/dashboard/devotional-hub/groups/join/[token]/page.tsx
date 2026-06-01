'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { DEVOTIONAL_HUB_ROUTES } from '@/lib/devotional-hub';
import { Card, CardContent } from '@/components/ui/card';

export default function JoinDevotionalGroupPage({
  params,
}: {
  params: { token: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api.post(`/devotional-hub/groups/join/${params.token}`);
        if (!cancelled) {
          toast.success('Joined devotional group');
          router.replace(DEVOTIONAL_HUB_ROUTES.hub);
        }
      } catch (err) {
        if (!cancelled) {
          setError(apiErrorMessage(err, 'Could not join group'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.token, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8">
      <Card className="max-w-md">
        <CardContent className="py-8 text-center">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <>
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Joining group…</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
