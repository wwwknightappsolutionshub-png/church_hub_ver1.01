'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bus, ChevronRight, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { OutreachPipelineDto } from '@church-hub/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STAGE_LABELS: Record<string, string> = {
  CAPTURED: 'Captured',
  CONTACTED: 'Contacted',
  VISITED: 'Visited',
  READY_FOR_MEMBERSHIP: 'Ready',
  CONVERTED: 'Converted',
  ARCHIVED: 'Archived',
};

const STAGE_FLOW = ['CAPTURED', 'CONTACTED', 'VISITED', 'READY_FOR_MEMBERSHIP'] as const;

export function ConvertPipelinePanel({ onRefresh }: { onRefresh: () => void }) {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useApiQuery<OutreachPipelineDto>(
    ['outreach-pipeline'],
    '/outreach/pipeline',
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['outreach-pipeline'] });
    onRefresh();
  };

  const advance = async (id: string, current: string) => {
    const idx = STAGE_FLOW.indexOf(current as (typeof STAGE_FLOW)[number]);
    const next = STAGE_FLOW[idx + 1];
    if (!next) return;
    setBusyId(id);
    try {
      await api.patch(`/outreach/contacts/${id}/pipeline`, { convertStage: next });
      toast.success(`Moved to ${STAGE_LABELS[next]}`);
      refresh();
    } catch {
      toast.error('Could not update pipeline');
    } finally {
      setBusyId(null);
    }
  };

  const convert = async (id: string) => {
    setBusyId(id);
    try {
      const { data: result } = await api.post<{
        member: { id: string; firstName: string };
        ride?: { id: string } | null;
      }>(`/outreach/contacts/${id}/convert-to-member`);
      toast.success(
        result.ride
          ? `Member created — bus pickup scheduled`
          : `Welcome ${result.member.firstName} as a member`,
      );
      refresh();
    } catch {
      toast.error('Convert failed');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />;
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Convert pipeline</CardTitle>
        <p className="text-xs text-muted-foreground">
          Field capture → follow-up linkage → membership. {data.convertedTotal} converted
          {data.needsBusPickup > 0 ? ` · ${data.needsBusPickup} need bus pickup` : ''}.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {STAGE_FLOW.map((stage) => (
            <Badge key={stage} variant="outline" className="text-xs">
              {STAGE_LABELS[stage]}: {data.byStage[stage] ?? 0}
            </Badge>
          ))}
        </div>

        <div className="max-h-[360px] space-y-2 overflow-y-auto">
          {data.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active pipeline contacts.</p>
          ) : (
            data.contacts.map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {c.firstName} {c.lastName ?? ''}
                  </p>
                  <Badge>{STAGE_LABELS[c.convertStage] ?? c.convertStage}</Badge>
                </div>
                {c.needsBusPickup && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                    <Bus className="h-3 w-3" />
                    Bus pickup requested
                  </p>
                )}
                {c.followUp && (
                  <Link
                    href={`/dashboard/follow-up`}
                    className="mt-1 block text-xs text-primary hover:underline"
                  >
                    Outreach · {c.followUp.stage.replace(/_/g, ' ')}
                  </Link>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {STAGE_FLOW.includes(c.convertStage as (typeof STAGE_FLOW)[number]) &&
                    c.convertStage !== 'READY_FOR_MEMBERSHIP' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === c.id}
                        onClick={() => advance(c.id, c.convertStage)}
                      >
                        {busyId === c.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            Advance <ChevronRight className="ml-0.5 h-3 w-3" />
                          </>
                        )}
                      </Button>
                    )}
                  {(c.convertStage === 'READY_FOR_MEMBERSHIP' ||
                    c.convertStage === 'VISITED') && (
                    <Button
                      size="sm"
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
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
