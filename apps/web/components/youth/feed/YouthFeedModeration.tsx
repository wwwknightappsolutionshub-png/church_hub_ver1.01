'use client';

import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { YouthContentReportItem, YouthFeedPost } from '@church-hub/shared-types';

export function YouthFeedModeration() {
  const queryClient = useQueryClient();
  const reports = useApiQuery<YouthContentReportItem[]>(
    ['youth-feed-reports'],
    '/youth/feed/reports?status=OPEN',
    { retry: false },
  );
  const flagged = useApiQuery<YouthFeedPost[]>(
    ['youth-feed-flagged'],
    '/youth/feed/posts/flagged',
    { retry: false },
  );

  const review = async (reportId: string, status: 'REVIEWED' | 'ACTIONED' | 'DISMISSED', hidePost?: boolean) => {
    try {
      await api.patch(`/youth/feed/reports/${reportId}`, { status, hidePost });
      toast.success('Report updated');
      queryClient.invalidateQueries({ queryKey: ['youth-feed-reports'] });
      queryClient.invalidateQueries({ queryKey: ['youth-feed'] });
      queryClient.invalidateQueries({ queryKey: ['youth-feed-flagged'] });
    } catch {
      toast.error('Could not update report');
    }
  };

  const moderatePost = async (postId: string, status: 'PUBLISHED' | 'HIDDEN') => {
    try {
      await api.patch(`/youth/feed/posts/${postId}/moderate`, { status });
      toast.success('Post updated');
      queryClient.invalidateQueries({ queryKey: ['youth-feed-flagged'] });
      queryClient.invalidateQueries({ queryKey: ['youth-feed'] });
    } catch {
      toast.error('Moderation failed');
    }
  };

  if (reports.isError && flagged.isError) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card className="border-amber-200/60 bg-amber-50/20 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Moderation queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reports.isLoading || flagged.isLoading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Open reports ({reports.data?.length ?? 0})
                </p>
                <ul className="space-y-2">
                  {(reports.data ?? []).map((r) => (
                    <li key={r.id} className="rounded-lg border bg-background p-3 text-sm">
                      <p className="font-medium">{r.reason}</p>
                      <p className="mt-1 line-clamp-2 text-muted-foreground">{r.post?.content}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => review(r.id, 'DISMISSED')}>
                          Dismiss
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => review(r.id, 'ACTIONED', true)}
                        >
                          <EyeOff className="mr-1 h-3 w-3" />
                          Hide post
                        </Button>
                        <Button type="button" size="sm" onClick={() => review(r.id, 'REVIEWED')}>
                          <Check className="mr-1 h-3 w-3" />
                          Reviewed
                        </Button>
                      </div>
                    </li>
                  ))}
                  {!reports.data?.length && (
                    <p className="text-sm text-muted-foreground">No open reports.</p>
                  )}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Flagged posts ({flagged.data?.length ?? 0})
                </p>
                <ul className="space-y-2">
                  {(flagged.data ?? []).map((p) => (
                    <li key={p.id} className="rounded-lg border bg-background p-3 text-sm">
                      <Badge variant="outline" className="mb-1">
                        {p.status}
                      </Badge>
                      <p className="line-clamp-3">{p.content}</p>
                      <div className="mt-2 flex gap-2">
                        <Button type="button" size="sm" onClick={() => moderatePost(p.id, 'PUBLISHED')}>
                          Approve
                        </Button>
                        <Button type="button" size="sm" variant="destructive" onClick={() => moderatePost(p.id, 'HIDDEN')}>
                          Hide
                        </Button>
                      </div>
                    </li>
                  ))}
                  {!flagged.data?.length && (
                    <p className="text-sm text-muted-foreground">No flagged posts.</p>
                  )}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
