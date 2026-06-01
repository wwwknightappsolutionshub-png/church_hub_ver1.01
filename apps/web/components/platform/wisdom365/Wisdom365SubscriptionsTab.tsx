'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { formatPence } from '@/lib/wisdom365-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SubscriptionItem {
  id: string;
  licenseCount: number;
  status: string;
  amountPaidPence: number | null;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  user: { email: string; firstName: string; lastName: string };
  church: { name: string };
  assignments: Array<{ variant: { name: string } }>;
}

export function Wisdom365SubscriptionsTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [data, setData] = useState<{ items: SubscriptionItem[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get<{ items: SubscriptionItem[]; total: number }>(
        '/platform/wisdom365/subscriptions',
        { params: { page, limit: 20, ...(status ? { status } : {}) } },
      );
      setData(res);
    } catch {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page, status]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/platform/wisdom365/subscriptions/${id}/status`, { status: newStatus });
      toast.success('Status updated');
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Update failed'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscriptions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <select
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PENDING">PENDING</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="EXPIRED">EXPIRED</option>
        </select>

        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <div className="space-y-2">
            {data?.items.map((s) => (
              <div key={s.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {s.user.firstName} {s.user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.user.email} · {s.church.name}</p>
                    <p className="mt-1 text-xs">
                      {s.licenseCount} license(s)
                      {s.amountPaidPence != null && ` · ${formatPence(s.amountPaidPence, s.currency)}`}
                    </p>
                    {s.periodEnd && (
                      <p className="text-xs text-muted-foreground">
                        Until {new Date(s.periodEnd).toLocaleDateString('en-GB')}
                      </p>
                    )}
                    <p className="mt-1 text-xs">
                      Journeys:{' '}
                      {s.assignments.length
                        ? s.assignments.map((a) => a.variant.name).join(', ')
                        : 'Unassigned'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge>{s.status}</Badge>
                    {s.status === 'ACTIVE' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(s.id, 'CANCELLED')}>
                        Cancel
                      </Button>
                    )}
                    {s.status === 'CANCELLED' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(s.id, 'ACTIVE')}>
                        Reactivate
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 text-xs">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <span className="self-center">Page {page}</span>
          <Button
            size="sm"
            variant="outline"
            disabled={(data?.items.length ?? 0) < 20}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
