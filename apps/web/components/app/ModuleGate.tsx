'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import {
  MODULE_GATE_LABELS,
  canAccessGate,
  gateRequirementHint,
  type ModuleGateType,
} from '@/lib/module-gates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ModuleGateProps {
  gate: ModuleGateType;
  children: React.ReactNode;
  /** Redirect to lounge when locked (default true) */
  redirectOnDeny?: boolean;
}

export function ModuleGate({ gate, children, redirectOnDeny = false }: ModuleGateProps) {
  const router = useRouter();
  const {
    isLoading,
    canAccessFollowUp,
    canAccessServiceUnitHub,
    canAccessDepartmentTools,
    canAccessMyProfile,
    canAccessSermonNote,
    canAccessMinistryCells,
    memberStatus,
    memberRoles,
    isChurchStaff,
  } = useModuleAccess();

  const access = {
    canAccessFollowUp,
    canAccessServiceUnitHub,
    canAccessDepartmentTools,
    canAccessMyProfile,
    canAccessSermonNote,
    canAccessMinistryCells,
    accessLoading: isLoading,
  };

  const allowed = canAccessGate(gate, access);

  useEffect(() => {
    if (!redirectOnDeny || isLoading || allowed) return;
    router.replace('/dashboard/lounge');
  }, [redirectOnDeny, isLoading, allowed, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) {
    if (redirectOnDeny) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <Card className="max-w-md shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">{MODULE_GATE_LABELS[gate]} is locked</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
            <p>{gateRequirementHint(gate, memberStatus, memberRoles)}</p>
            {isChurchStaff && (
              <p className="text-xs text-primary">
                You have church staff access in other areas; this module still follows membership rules
                for your linked member record.
              </p>
            )}
            <Button asChild className="w-full">
              <Link href="/dashboard/lounge">Back to Lounge</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
