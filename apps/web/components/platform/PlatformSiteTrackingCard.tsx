'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SiteTrackingConfig = {
  gtmContainerId: string | null;
  gaMeasurementId: string | null;
  facebookPixelId: string | null;
  googleSiteVerification: string | null;
  updatedAt: string | null;
};

export function PlatformSiteTrackingCard({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useApiQuery<SiteTrackingConfig>(
    ['platform-site-tracking'],
    '/platform/integrations/site-tracking',
  );
  const [gtmContainerId, setGtmContainerId] = useState('');
  const [gaMeasurementId, setGaMeasurementId] = useState('');
  const [facebookPixelId, setFacebookPixelId] = useState('');
  const [googleSiteVerification, setGoogleSiteVerification] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!data) return;
    setGtmContainerId(data.gtmContainerId ?? '');
    setGaMeasurementId(data.gaMeasurementId ?? '');
    setFacebookPixelId(data.facebookPixelId ?? '');
    setGoogleSiteVerification(data.googleSiteVerification ?? '');
    setHydrated(true);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: saved } = await api.patch<SiteTrackingConfig>(
        '/platform/integrations/site-tracking',
        {
          gtmContainerId: gtmContainerId.trim() || null,
          gaMeasurementId: gaMeasurementId.trim() || null,
          facebookPixelId: facebookPixelId.trim() || null,
          googleSiteVerification: googleSiteVerification.trim() || null,
        },
      );
      return saved;
    },
    onSuccess: async () => {
      toast.success('Site measurement saved. Public pages pick it up within a minute.');
      await qc.invalidateQueries({ queryKey: ['platform-site-tracking'] });
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'Could not save site measurement'));
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" aria-hidden />
          Site measurement
        </CardTitle>
        <CardDescription>
          These IDs load on the public marketing site and church home pages. Leave a field blank to
          turn that tag off. Paste the ID only, not a script. If Tag Manager already sends the same
          Analytics property, clear the Analytics ID so visits are not counted twice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !hydrated ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading measurement IDs…
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="site-gtm">Google Tag Manager</Label>
                <Input
                  id="site-gtm"
                  placeholder="GTM-XXXX"
                  value={gtmContainerId}
                  disabled={!canWrite}
                  onChange={(e) => setGtmContainerId(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site-ga">Google Analytics</Label>
                <Input
                  id="site-ga"
                  placeholder="G-XXXXXXXX"
                  value={gaMeasurementId}
                  disabled={!canWrite}
                  onChange={(e) => setGaMeasurementId(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site-pixel">Facebook Pixel</Label>
                <Input
                  id="site-pixel"
                  placeholder="Numeric pixel ID"
                  value={facebookPixelId}
                  disabled={!canWrite}
                  onChange={(e) => setFacebookPixelId(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site-gsc">Search Console verification</Label>
                <Input
                  id="site-gsc"
                  placeholder="Verification code"
                  value={googleSiteVerification}
                  disabled={!canWrite}
                  onChange={(e) => setGoogleSiteVerification(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
            {canWrite && (
              <Button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save measurement
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
