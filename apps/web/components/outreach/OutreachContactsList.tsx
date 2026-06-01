'use client';

import { useState } from 'react';
import { CheckCircle2, MapPin, MessageCircle, UserPlus, Bus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export interface OutreachContactRow {
  id: string;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  locationLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photoConsent: boolean;
  welcomeSentAt?: string | null;
  capturedAt: string;
  convertStage?: string;
  needsBusPickup?: boolean;
  followUpId?: string | null;
  memberId?: string | null;
  evangelist?: { firstName: string; lastName: string } | null;
  followUp?: { id: string; stage: string } | null;
  member?: { id: string; firstName: string; lastName: string } | null;
}

const STAGE_LABELS: Record<string, string> = {
  CAPTURED: 'Captured',
  CONTACTED: 'Contacted',
  VISITED: 'Visited',
  READY_FOR_MEMBERSHIP: 'Ready',
  CONVERTED: 'Converted',
};

export function OutreachContactsList({
  contacts,
  onRefresh,
}: {
  contacts: OutreachContactRow[];
  onRefresh?: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const convert = async (id: string) => {
    setBusyId(id);
    try {
      await api.post(`/outreach/contacts/${id}/convert-to-member`);
      toast.success('Converted to member');
      onRefresh?.();
    } catch {
      toast.error('Convert failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent captures</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[420px] space-y-2 overflow-y-auto">
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contacts captured yet.</p>
        ) : (
          contacts.map((c) => (
            <div key={c.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">
                  {c.firstName} {c.lastName ?? ''}
                </p>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {c.convertStage && (
                    <Badge variant="outline" className="text-[10px]">
                      {STAGE_LABELS[c.convertStage] ?? c.convertStage}
                    </Badge>
                  )}
                  {c.welcomeSentAt && (
                    <Badge variant="success" className="gap-0.5 text-[10px]">
                      <MessageCircle className="h-3 w-3" />
                      Welcomed
                    </Badge>
                  )}
                </div>
              </div>
              {c.phone && <p className="text-muted-foreground">{c.phone}</p>}
              {c.needsBusPickup && (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                  <Bus className="h-3 w-3" />
                  Bus pickup
                </p>
              )}
              {c.member && (
                <p className="mt-1 text-xs text-emerald-700">
                  Member: {c.member.firstName} {c.member.lastName}
                </p>
              )}
              {(c.locationLabel || c.latitude) && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {c.locationLabel ??
                    `${c.latitude?.toFixed(4)}, ${c.longitude?.toFixed(4)}`}
                </p>
              )}
              {c.photoConsent && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3" />
                  Photo on file
                </p>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(c.capturedAt).toLocaleString()}
                {c.evangelist &&
                  ` · ${c.evangelist.firstName} ${c.evangelist.lastName}`}
              </p>
              {!c.memberId &&
                c.convertStage !== 'CONVERTED' &&
                (c.convertStage === 'READY_FOR_MEMBERSHIP' ||
                  c.convertStage === 'VISITED') && (
                  <Button
                    size="sm"
                    className="mt-2"
                    disabled={busyId === c.id}
                    onClick={() => convert(c.id)}
                  >
                    {busyId === c.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="mr-1 h-3 w-3" />
                        Convert to member
                      </>
                    )}
                  </Button>
                )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
