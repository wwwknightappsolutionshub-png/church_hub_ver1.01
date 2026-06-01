'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ReportsInboxPanel } from '@/components/reports/ReportsInboxPanel';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { isChurchAdminRole } from '@/lib/session-role';

export default function AdminReportsPage() {
  const router = useRouter();
  const { userRoles, isLoading: accessLoading } = useModuleAccess();
  const isAdmin = isChurchAdminRole(userRoles);

  useEffect(() => {
    if (!accessLoading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [accessLoading, isAdmin, router]);

  if (accessLoading || !isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ReportsInboxPanel
      queryKey="admin-reports"
      inboxPath="/communications/admin-reports"
      replyPath="/communications/admin-reports/reply"
      replyFormId="admin-reply-form"
      eyebrow="Administration"
      title="Admin reports center"
      description="Centralized capture of department reports, automation queue, notifications, and all in-app messages—respond to members, leaders, and pastors."
      defaultReplySubject="Re: Church communication"
    />
  );
}
