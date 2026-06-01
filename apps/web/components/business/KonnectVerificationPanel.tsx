'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { VERIFICATION_LABELS } from '@/lib/konnect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BusinessProfile {
  id: string;
  businessName: string;
  category?: string | null;
  description?: string | null;
  website?: string | null;
  verificationStatus: string;
  member: { firstName: string; lastName: string; email?: string | null };
}

export function KonnectVerificationPanel() {
  const queryClient = useQueryClient();
  const pending = useApiQuery<BusinessProfile[]>(['konnect-pending'], '/business/profiles');

  const verify = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await api.patch(`/business/profiles/${id}/verify`, {
        status,
        rejectionNote: status === 'REJECTED' ? 'Does not meet church business guidelines' : undefined,
      });
      toast.success(status === 'VERIFIED' ? 'Business verified' : 'Profile rejected');
      queryClient.invalidateQueries({ queryKey: ['konnect-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['konnect-pending'] });
      queryClient.invalidateQueries({ queryKey: ['konnect-stats'] });
      queryClient.invalidateQueries({ queryKey: ['konnect-marketplace'] });
    } catch {
      toast.error('Verification action failed');
    }
  };

  const queue = (pending.data ?? []).filter((p) => p.verificationStatus === 'PENDING');

  if (pending.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Review member-submitted business profiles before they appear in the public directory and marketplace.
      </p>
      {queue.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">No profiles awaiting verification.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {queue.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">{p.businessName}</CardTitle>
                  <Badge variant="gold">{VERIFICATION_LABELS.PENDING}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {p.member.firstName} {p.member.lastName}
                  {p.member.email ? ` · ${p.member.email}` : ''} · {p.category}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.description && <p className="text-sm">{p.description}</p>}
                {p.website && <p className="text-xs text-muted-foreground">{p.website}</p>}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => verify(p.id, 'VERIFIED')}>
                    <Check className="mr-1.5 h-4 w-4" />
                    Verify
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => verify(p.id, 'REJECTED')}>
                    <X className="mr-1.5 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
