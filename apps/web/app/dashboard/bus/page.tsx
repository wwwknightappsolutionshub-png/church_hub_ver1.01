'use client';

import { Loader2, AlertTriangle, Bus, Navigation } from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useBusRealtime } from '@/lib/hooks/use-bus-realtime';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { BusMap } from '@/components/dashboard/BusMap';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { getChurchIdFromToken } from '@/lib/auth-utils';
import { toast } from 'sonner';

interface Ride {
  id: string;
  status: string;
  pickupAddress: string;
  member: { firstName: string; lastName: string };
}

export default function BusPage() {
  const { data: rides, isLoading, isError } = useApiQuery<Ride[]>(['bus-rides'], '/bus/rides');
  const churchId = getChurchIdFromToken();
  const { locations, connected } = useBusRealtime(churchId);

  const active = (rides ?? []).filter((r) => !['DROPPED_OFF', 'CANCELLED', 'NO_SHOW'].includes(r.status));

  const sendEmergency = async () => {
    try {
      await api.post('/bus/emergency', { driverId: 'demo-driver', message: 'Emergency assistance requested' });
      toast.error('Emergency alert dispatched');
    } catch {
      toast.error('Failed to send alert');
    }
  };

  return (
    <DashboardModuleShell
      title="Bus Ministry"
      description={MODULE_DESCRIPTIONS.bus}
      badge={
        <div className="flex gap-2">
          <Badge variant="gold">{active.length} active rides</Badge>
          {connected && <Badge variant="success">Live GPS</Badge>}
        </div>
      }
      actions={
        <Button size="sm" variant="destructive" onClick={sendEmergency}>
          <AlertTriangle className="mr-1.5 h-4 w-4" />
          Emergency
        </Button>
      }
      contentClassName="p-0 md:p-0"
    >
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Live Map</CardTitle>
            </CardHeader>
            <CardContent>
              <BusMap locations={locations} />
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Today&apos;s Rides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
              {isError && <p className="text-sm text-destructive">Could not load rides</p>}
              {(rides ?? []).length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground">No ride requests — seed database for demo data</p>
              )}
              {(rides ?? []).map((ride) => (
                <div key={ride.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium">{ride.member.firstName} {ride.member.lastName}</p>
                    <p className="text-xs text-muted-foreground">{ride.pickupAddress}</p>
                  </div>
                  <Badge variant="outline">{ride.status.replace(/_/g, ' ')}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><Bus className="h-4 w-4" />Fleet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{(rides ?? []).length}</p>
              <p className="text-sm text-muted-foreground">Total ride requests</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><Navigation className="h-4 w-4" />WebSocket</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{connected ? 'Connected to live tracking' : 'Waiting for driver updates…'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardModuleShell>
  );
}
