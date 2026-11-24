'use client';

import Link from 'next/link';
import type { MembershipAnalyticsEstablishmentOpsDto } from '@church-hub/shared-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AnalyticsEstablishmentOpsPanel({
  ops,
}: {
  ops: MembershipAnalyticsEstablishmentOpsDto;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Establishment SLA</CardTitle>
        <CardDescription>Action items aligned with Establishment stats.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Overdue" value={ops.overdue} href="/dashboard/establishment" />
          <Stat label="Due today" value={ops.dueToday} href="/dashboard/establishment" />
          <Stat label="Archive requested" value={ops.archiveRequested} href="/dashboard/establishment" />
          <Stat label="Joined Group (day 6+)" value={ops.joinedGroupDay6} href="/dashboard/establishment" />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-border bg-muted/20 px-3 py-2 transition hover:border-primary/40"
    >
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Link>
  );
}