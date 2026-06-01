'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { Wisdom365Landing } from '@/components/wisdom365/Wisdom365Landing';
import { Wisdom365Hub } from '@/components/wisdom365/Wisdom365Hub';
import { Wisdom365Upsell } from '@/components/wisdom365/Wisdom365Upsell';
import { Wisdom365JourneyPanel } from '@/components/wisdom365/Wisdom365JourneyPanel';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { isTenantModuleEnabled } from '@/lib/tenant-modules';
import { useWisdom365Reminder } from '@/lib/hooks/use-wisdom365-reminder';
import { fetchWisdom365Catalog, type Wisdom365CatalogResponse } from '@/lib/wisdom365-api';
import { apiErrorMessage } from '@/lib/api-errors';
import { Button } from '@/components/ui/button';

export function Wisdom365App() {
  const router = useRouter();
  const { isLoading: authLoading, enabledModules, isChurchStaff } = useModuleAccess();
  const params = useSearchParams();
  const forceBuy = params.get('buy') === '1';

  const [catalog, setCatalog] = useState<Wisdom365CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const moduleOn = isTenantModuleEnabled(enabledModules, 'wisdom365Plus');

  useWisdom365Reminder(Boolean(catalog?.me.entitlements.length));

  const refresh = useCallback(async () => {
    if (!moduleOn) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchWisdom365Catalog();
      setCatalog(data);
    } catch (err) {
      setCatalog(null);
      setLoadError(
        apiErrorMessage(
          err,
          'Wisdom365+ is unavailable. Restart the API server if you recently pulled updates.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [moduleOn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (authLoading || (moduleOn && loading && !catalog)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!moduleOn) {
    return <Wisdom365Upsell isChurchStaff={isChurchStaff} />;
  }

  if (loadError) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-semibold">Could not load Wisdom365+</p>
        <p className="max-w-md text-sm text-muted-foreground">{loadError}</p>
        <Button variant="outline" className="gap-2" onClick={() => void refresh()}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!catalog.me.churchAvailable) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="font-semibold">Wisdom365+ is not available for your church</p>
        <p className="text-sm text-muted-foreground">
          Your church administrator or Church_Hub operator can enable access.
        </p>
      </div>
    );
  }

  const me = catalog.me;
  const licensePricePence = catalog.product?.licensePricePence;
  const hasEntitlements = me.entitlements.length > 0;

  if (forceBuy || (!hasEntitlements && me.activeLicenses === 0)) {
    return <Wisdom365Landing catalog={catalog} onRefresh={refresh} />;
  }

  if (me.unassignedLicenses > 0 && !hasEntitlements) {
    router.replace('/dashboard/wisdom365/assign');
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasEntitlements && me.entitlements.length === 1 && me.unassignedLicenses === 0) {
    return (
      <Wisdom365JourneyPanel
        variant={me.entitlements[0].variant}
        subscriptions={me.subscriptions ?? []}
        licensePricePence={licensePricePence}
      />
    );
  }

  if (hasEntitlements) {
    return <Wisdom365Hub me={me} onRefresh={refresh} licensePricePence={licensePricePence} />;
  }

  return <Wisdom365Landing catalog={catalog} onRefresh={refresh} />;
}
