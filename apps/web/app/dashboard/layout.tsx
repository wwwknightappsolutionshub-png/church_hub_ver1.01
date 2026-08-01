'use client';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardAuthGate } from '@/components/dashboard/DashboardAuthGate';
import { PlatformRouteGuard } from '@/components/dashboard/PlatformRouteGuard';
import { ChangePasswordGate } from '@/components/auth/ChangePasswordGate';
import { IdleSessionTimeout } from '@/components/auth/IdleSessionTimeout';
import { AppSplashGate } from '@/components/app/AppSplashGate';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppSplashGate>
      <DashboardShell>
        <DashboardAuthGate>
          <ChangePasswordGate>
            <IdleSessionTimeout />
            <PlatformRouteGuard>{children}</PlatformRouteGuard>
          </ChangePasswordGate>
        </DashboardAuthGate>
      </DashboardShell>
    </AppSplashGate>
  );
}
