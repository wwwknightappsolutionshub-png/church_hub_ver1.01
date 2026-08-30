'use client';

import { Suspense } from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardAuthGate } from '@/components/dashboard/DashboardAuthGate';
import { PlatformRouteGuard } from '@/components/dashboard/PlatformRouteGuard';
import { ChangePasswordGate } from '@/components/auth/ChangePasswordGate';
import { IdleSessionTimeout } from '@/components/auth/IdleSessionTimeout';
import { AppSplashGate } from '@/components/app/AppSplashGate';
import { DemoTourProvider } from '@/components/demo/DemoTourContext';
import { DemoTourController } from '@/components/demo/DemoTourController';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoTourProvider>
      <AppSplashGate>
        <DashboardShell>
          <DashboardAuthGate>
            <ChangePasswordGate>
              <IdleSessionTimeout />
              <PlatformRouteGuard>{children}</PlatformRouteGuard>
            </ChangePasswordGate>
          </DashboardAuthGate>
        </DashboardShell>
        <Suspense fallback={null}>
          <DemoTourController />
        </Suspense>
      </AppSplashGate>
    </DemoTourProvider>
  );
}
