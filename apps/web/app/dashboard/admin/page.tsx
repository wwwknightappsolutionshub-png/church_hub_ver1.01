'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { DashboardPageSkeleton } from '@/components/dashboard/DashboardPageSkeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  UnifiedAdminHub,
  type UnifiedAdminHubDto,
} from '@/components/admin/UnifiedAdminHub';

export default function AdminCommandCenterPage() {
  const router = useRouter();
  const { isChurchStaff, isLoading: accessLoading } = useModuleAccess();
  const [hub, setHub] = useState<UnifiedAdminHubDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (accessLoading) return;
    if (!isChurchStaff) {
      router.replace('/dashboard/lounge');
    }
  }, [accessLoading, isChurchStaff, router]);

  useEffect(() => {
    if (!isChurchStaff || accessLoading) return;
    setLoading(true);
    api
      .get<UnifiedAdminHubDto>('/admin/hub')
      .then((r) => {
        setHub(r.data);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [isChurchStaff, accessLoading]);

  return (
    <DashboardModuleShell
      eyebrow="Administration"
      title="Admin Command Center"
      description={MODULE_DESCRIPTIONS.admin}
      badge={
        <Badge variant="outline" className="gap-1 border-slate-500 text-slate-200">
          <Shield className="h-3 w-3" />
          Leadership
        </Badge>
      }
    >
      <div className="space-y-6">
        {loading && <DashboardPageSkeleton cards={4} />}
        {error && !loading && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Could not load admin hub. Sign in as ADMIN or PASTOR.
            </CardContent>
          </Card>
        )}
        {hub && !loading && <UnifiedAdminHub hub={hub} />}
      </div>
    </DashboardModuleShell>
  );
}
