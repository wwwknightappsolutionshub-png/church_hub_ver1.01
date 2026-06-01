'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SyncConflictRow {
  id: string;
  clientId: string;
  entityType: string;
  status: string;
  serverPayload: Record<string, unknown>;
  clientPayload: Record<string, unknown>;
  outreachContact?: {
    firstName: string;
    lastName?: string | null;
    phone?: string | null;
  } | null;
}

export function SyncConflictsPanel() {
  const [conflicts, setConflicts] = useState<SyncConflictRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<SyncConflictRow[]>('/outreach/sync/conflicts')
      .then((r) => setConflicts(r.data))
      .catch(() => setConflicts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (id: string, strategy: 'CLIENT_WINS' | 'SERVER_WINS' | 'MERGED') => {
    setResolvingId(id);
    try {
      await api.post(`/outreach/sync/conflicts/${id}/resolve`, { strategy });
      load();
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading sync conflicts…
        </CardContent>
      </Card>
    );
  }

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-500/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Sync conflicts
          <Badge variant="gold">{conflicts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {conflicts.map((c) => {
          const name =
            c.outreachContact?.firstName ??
            String(c.clientPayload.firstName ?? 'Contact');
          return (
            <div
              key={c.id}
              className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">Client ID: {c.clientId}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resolvingId === c.id}
                  onClick={() => resolve(c.id, 'SERVER_WINS')}
                >
                  Keep server
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resolvingId === c.id}
                  onClick={() => resolve(c.id, 'CLIENT_WINS')}
                >
                  Use offline
                </Button>
                <Button
                  size="sm"
                  disabled={resolvingId === c.id}
                  onClick={() => resolve(c.id, 'MERGED')}
                >
                  {resolvingId === c.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-1 h-4 w-4" />
                  )}
                  Merge
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
