'use client';

import Link from 'next/link';
import { Layers, RefreshCw } from 'lucide-react';
import { ModuleGate } from '@/components/app/ModuleGate';
import { AxiosError } from 'axios';
import { DashboardPageSkeleton } from '@/components/dashboard/DashboardPageSkeleton';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DepartmentUnit {
  id: string;
  name: string;
  departmentCode: string;
  description?: string | null;
  _count: { members: number; meetings: number };
}

const CODE_LABEL: Record<string, string> = {
  USHERING: 'Ushering',
  CHOIR: 'Choir',
  EVANGELISM: 'Evangelism',
  YOUTH: 'Youth',
  TEENS: 'Teens',
  CHILDREN: 'Children',
  PROTOCOL: 'Protocol',
  PRAYER: 'Prayer',
  MEDIA: 'Media',
  MEDICAL: 'Medical',
};

function listErrorMessage(err: AxiosError | null): string {
  const status = err?.response?.status;
  if (status === 403) {
    return 'Department tools are available to church admin, pastor, and department admin only.';
  }
  if (!err?.response) {
    return 'Cannot reach the API. Ensure the Church API is running (default port 4000).';
  }
  if (status === 404) {
    return 'Departments list API was not found. Restart the API after pulling the latest code.';
  }
  if (status && status >= 500) {
    const detail =
      typeof err?.response?.data === 'object' &&
      err.response.data !== null &&
      'message' in err.response.data
        ? String((err.response.data as { message: unknown }).message).slice(0, 200)
        : null;
    return (
      detail ??
      'Server error loading departments. In apps/api run: npx prisma migrate deploy — then restart the API.'
    );
  }
  return 'Could not load department units.';
}

export default function DepartmentsPage() {
  const {
    data: units,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useApiQuery<DepartmentUnit[]>(['departments'], '/service-units/departments');

  if (isLoading) {
    return <DashboardPageSkeleton cards={6} />;
  }

  if (isError) {
    return (
      <ModuleGate gate="departmentTools">
        <DashboardModuleShell
          eyebrow="Ministries"
          title="Department tools"
          description="Specialized operations for choir, media, children, prayer squad, medical, and related ministry units."
        >
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
              <span>{listErrorMessage(error)}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={isFetching ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
                Retry
              </Button>
            </CardContent>
          </Card>
        </DashboardModuleShell>
      </ModuleGate>
    );
  }

  const list = Array.isArray(units) ? units : [];

  return (
    <ModuleGate gate="departmentTools">
      <DashboardModuleShell
        eyebrow="Ministries"
        title="Department tools"
        description="Specialized operations for choir, media, children, prayer squad, medical, and related ministry units—with attendance and reporting."
      >
        {list.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No department units yet</CardTitle>
              <CardDescription>
                Department units are provisioned when you open this page. If none appear, verify church setup or open
                Service Unit Hub.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link href="/dashboard/service-units">Go to Service Unit Hub</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((unit) => (
              <Link key={unit.id} href={`/dashboard/service-units/${unit.id}?tab=department`}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{unit.name}</CardTitle>
                      <Badge variant="secondary">
                        {CODE_LABEL[unit.departmentCode] ?? unit.departmentCode}
                      </Badge>
                    </div>
                    {unit.description && (
                      <CardDescription className="line-clamp-2">{unit.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{unit._count.members} members</span>
                    <span>{unit._count.meetings} meetings</span>
                    <Layers className="ml-auto h-4 w-4" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </DashboardModuleShell>
    </ModuleGate>
  );
}
