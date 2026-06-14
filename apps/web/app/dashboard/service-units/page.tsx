'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { ServiceUnitJoinSheet } from '@/components/service-units/ServiceUnitJoinSheet';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import {
  EnterpriseContent,
  EnterpriseHero,
  EnterpriseShell,
} from '@/components/layout/EnterpriseModuleShell';
import { OnlineIndicator } from '@/components/service-units/OnlineIndicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface ServiceUnitListItem {
  id: string;
  name: string;
  description?: string | null;
  activities?: string | null;
  leaders: Array<{ member: { id: string; firstName: string; lastName: string } }>;
  presence: Array<{ memberId: string; isOnline: boolean }>;
  _count: { members: number; meetings: number };
}

export default function ServiceUnitsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, member, isChurchStaff, unitMembershipIds } = useModuleAccess();
  const units = useApiQuery<ServiceUnitListItem[]>(['service-units'], '/service-units');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [joinTarget, setJoinTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: '', description: '', activities: '' });

  const openUnit = async (unit: ServiceUnitListItem) => {
    if (isChurchStaff || unitMembershipIds.includes(unit.id)) {
      router.push(`/dashboard/service-units/${unit.id}`);
      return;
    }
    setCheckingId(unit.id);
    try {
      const { data } = await api.get<{
        canView: boolean;
        pendingJoinRequest?: { id: string } | null;
      }>(`/service-units/${unit.id}/access`);
      if (data.canView) {
        router.push(`/dashboard/service-units/${unit.id}`);
      } else if (data.pendingJoinRequest) {
        toast.message('Your join request is pending approval');
      } else {
        setJoinTarget({ id: unit.id, name: unit.name });
      }
    } catch {
      setJoinTarget({ id: unit.id, name: unit.name });
    } finally {
      setCheckingId(null);
    }
  };

  const createUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post('/service-units', form);
      toast.success('Service unit created');
      setForm({ name: '', description: '', activities: '' });
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['service-units'] });
    } catch {
      toast.error('Could not create service unit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <EnterpriseShell>
      <EnterpriseHero
        eyebrow="Ministries"
        title="Service Unit Hub"
        description={MODULE_DESCRIPTIONS.serviceUnits}
        badge={
          <Badge className="border-slate-600 bg-slate-800 text-slate-100">
            {(units.data ?? []).length} units
          </Badge>
        }
        actions={
          isChurchStaff ? (
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New unit
            </Button>
          ) : undefined
        }
      />
      <EnterpriseContent className="space-y-6">
        {showForm && isChurchStaff && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create service unit</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createUnit} className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Unit name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <Input
                  placeholder="Short description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <Input
                  className="md:col-span-2"
                  placeholder="Activities summary"
                  value={form.activities}
                  onChange={(e) => setForm({ ...form, activities: e.target.value })}
                />
                <div className="flex gap-2 md:col-span-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save unit'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {units.isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {units.isError && (
          <p className="text-sm text-destructive">
            Could not load service units — ensure the API is running and you are signed in.
          </p>
        )}

        {!units.isLoading && !units.isError && (units.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            No service units yet. Refresh the page or create a unit above — the church catalog loads
            automatically on first visit.
          </p>
        )}

        {!units.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(units.data ?? []).map((unit) => {
            const onlineCount = unit.presence.filter((p) => p.isOnline).length;
            const leader = unit.leaders[0]?.member;
            return (
              <button
                key={unit.id}
                type="button"
                className="text-left"
                disabled={checkingId === unit.id}
                onClick={() => openUnit(unit)}
              >
                <Card className="h-full transition-shadow hover:shadow-elevated">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">{unit.name}</CardTitle>
                      {onlineCount > 0 && (
                        <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                          <OnlineIndicator online size="sm" />
                          {onlineCount} online
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {unit.description ?? 'Church service group'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {unit._count.members} members · {unit._count.meetings} meetings
                    </div>
                    {leader && (
                      <p className="font-sans text-xs text-muted-foreground">
                        Leader: {leader.firstName} {leader.lastName}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
        )}
      </EnterpriseContent>

      {joinTarget && (
        <ServiceUnitJoinSheet
          unitId={joinTarget.id}
          unitName={joinTarget.name}
          open
          defaultValues={{
            firstName: user?.firstName ?? member?.firstName,
            lastName: user?.lastName ?? member?.lastName,
            email: user?.email,
            memberId: member?.id,
          }}
          onClose={() => setJoinTarget(null)}
          onSubmitted={() => queryClient.invalidateQueries({ queryKey: ['service-units'] })}
        />
      )}
    </EnterpriseShell>
  );
}
