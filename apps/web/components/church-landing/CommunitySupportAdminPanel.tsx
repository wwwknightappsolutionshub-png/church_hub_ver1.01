'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminRequest {
  id: string;
  requestType: 'JOB_SEARCH' | 'BUSINESS_SEARCH';
  title: string;
  description: string;
  location?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  skills?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  approvedAt?: string | null;
  validUntil?: string | null;
  member: { firstName: string; lastName: string; email?: string | null; phone?: string | null };
}

export function CommunitySupportAdminPanel() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useApiQuery<AdminRequest[]>(
    ['community-support-admin', filter],
    filter === 'PENDING' ? '/community-support/admin?status=PENDING' : '/community-support/admin',
  );

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      await api.patch(`/community-support/${id}/approve`, { validityDays: 90 });
      toast.success('Approved — now visible on landing and Job Board');
      queryClient.invalidateQueries({ queryKey: ['community-support-admin'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not approve'));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    try {
      await api.patch(`/community-support/${id}/reject`, { note: 'Not approved for public listing' });
      toast.success('Request rejected');
      queryClient.invalidateQueries({ queryKey: ['community-support-admin'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not reject'));
    } finally {
      setBusyId(null);
    }
  };

  const rows = data ?? [];
  const pending = rows.filter((r) => r.status === 'PENDING');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Members submit from their profile. Approve to show anonymously on the landing page and Kingdom Konnect Job Board.
          Admin and pastor receive email and in-app notifications.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === 'PENDING' ? 'default' : 'outline'}
            onClick={() => setFilter('PENDING')}
          >
            Pending ({pending.length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'ALL' ? 'default' : 'outline'}
            onClick={() => setFilter('ALL')}
          >
            All
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No requests to review.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">{row.title}</CardTitle>
                  <Badge variant={row.status === 'PENDING' ? 'secondary' : 'outline'}>{row.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.requestType === 'JOB_SEARCH' ? 'Job search' : 'Business search'} · Submitted by{' '}
                  {row.member.firstName} {row.member.lastName}
                  {row.member.email ? ` · ${row.member.email}` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(row.createdAt).toLocaleString()}
                  {row.approvedAt ? ` · Approved ${new Date(row.approvedAt).toLocaleString()}` : ''}
                  {row.validUntil ? ` · Valid until ${new Date(row.validUntil).toLocaleDateString()}` : ''}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{row.description}</p>
                {[row.location, row.skills, row.contactEmail, row.contactPhone]
                  .filter(Boolean)
                  .map((line) => (
                    <p key={line} className="text-xs text-muted-foreground">
                      {line}
                    </p>
                  ))}
                {row.status === 'PENDING' && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" disabled={busyId === row.id} onClick={() => approve(row.id)}>
                      {busyId === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="mr-1 h-4 w-4" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.id}
                      onClick={() => reject(row.id)}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
