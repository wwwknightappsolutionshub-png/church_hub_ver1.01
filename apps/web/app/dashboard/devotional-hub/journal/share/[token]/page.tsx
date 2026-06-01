'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { DevotionalJournalEntryDto } from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { DEVOTIONAL_HUB_ROUTES } from '@/lib/devotional-hub';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function SharedJournalPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<DevotionalJournalEntryDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.token) return;
    (async () => {
      try {
        const { data } = await api.get<DevotionalJournalEntryDto>(
          `/devotional-hub/journals/share/${params.token}`,
        );
        setEntry(data);
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not load shared journal'));
      } finally {
        setLoading(false);
      }
    })();
  }, [params.token]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !entry) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {error ?? 'Journal not found'}
          <div className="mt-4">
            <Button variant="outline" onClick={() => router.push(DEVOTIONAL_HUB_ROUTES.hub)}>
              Back to Devotional Hub
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <Button variant="ghost" size="sm" onClick={() => router.push(DEVOTIONAL_HUB_ROUTES.hub)}>
        ← Devotional Hub
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{entry.title || 'Shared journal'}</CardTitle>
          <p className="text-sm text-muted-foreground">{entry.authorName}</p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {entry.moods.map((m) => (
            <Badge key={m} variant="secondary">
              {m}
            </Badge>
          ))}
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: entry.body }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
