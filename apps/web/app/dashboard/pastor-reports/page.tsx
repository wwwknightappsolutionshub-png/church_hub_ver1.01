'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ReportsInboxPanel } from '@/components/reports/ReportsInboxPanel';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { isPastorRole } from '@/lib/session-role';

export default function PastorReportsPage() {
  const router = useRouter();
  const { userRoles, isLoading: accessLoading } = useModuleAccess();
  const isPastor = isPastorRole(userRoles);

  useEffect(() => {
    if (!accessLoading && !isPastor) {
      router.replace('/dashboard');
    }
  }, [accessLoading, isPastor, router]);

  if (accessLoading || !isPastor) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ReportsInboxPanel
      queryKey="pastor-reports"
      inboxPath="/communications/pastor-reports"
      replyPath="/communications/pastor-reports/reply"
      replyFormId="pastor-reply-form"
      eyebrow="Pastoral leadership"
      title="Pastor reports inbox"
      description="Triage department and weekly reports, pastoral alerts, and messages routed to pastoral leadership—with governed replies."
      defaultReplySubject="Re: Department report"
    />
  );
}
