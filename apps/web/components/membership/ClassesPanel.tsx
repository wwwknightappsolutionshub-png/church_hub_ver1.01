'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useClassDefinitions, useClassEnrollments } from '@/lib/hooks/use-membership-hub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ClassesPanelProps {
  canManage: boolean;
  members: Array<{ id: string; firstName: string; lastName: string }>;
}

export function ClassesPanel({ canManage, members }: ClassesPanelProps) {
  const queryClient = useQueryClient();
  const { data: definitions, isLoading: defsLoading } = useClassDefinitions();
  const { data: enrollments, isLoading: enLoading } = useClassEnrollments();
  const [memberId, setMemberId] = useState('');
  const [classId, setClassId] = useState('');
  const [busy, setBusy] = useState(false);

  const enroll = async () => {
    if (!memberId || !classId) {
      toast.error('Select a member and class');
      return;
    }
    setBusy(true);
    try {
      await api.post('/membership/class-enrollments', {
        memberId,
        classDefinitionId: classId,
      });
      toast.success('Enrolled');
      setMemberId('');
      setClassId('');
      queryClient.invalidateQueries({ queryKey: ['membership-class-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['membership-timeline'] });
    } catch {
      toast.error('Could not enroll');
    } finally {
      setBusy(false);
    }
  };

  const markComplete = async (enrollmentId: string) => {
    try {
      await api.patch(`/membership/class-enrollments/${enrollmentId}`, {
        status: 'COMPLETED',
      });
      toast.success('Marked complete');
      queryClient.invalidateQueries({ queryKey: ['membership-class-enrollments'] });
    } catch {
      toast.error('Update failed');
    }
  };

  if (defsLoading || enLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            Class levels (per church)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {definitions?.map((d) => (
            <Badge key={d.id} variant="secondary">
              {d.code} — {d.name}
            </Badge>
          ))}
          {!definitions?.length && (
            <p className="text-sm text-muted-foreground">
              No classes defined. Seed defaults from Settings or POST /membership/config/seed-defaults.
            </p>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Enroll member</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <select
              className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            >
              <option value="">Member</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </select>
            <select
              className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">Class</option>
              {definitions?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
            <Button onClick={enroll} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enroll'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">Enrollments</p>
        {enrollments?.map((e) => (
          <div
            key={e.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
          >
            <div>
              <p className="text-sm font-medium">
                {e.member.firstName} {e.member.lastName}
              </p>
              <p className="text-xs text-muted-foreground">
                {e.classDefinition.code} — {e.classDefinition.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{e.status}</Badge>
              {canManage && e.status !== 'COMPLETED' && (
                <Button size="sm" variant="outline" onClick={() => markComplete(e.id)}>
                  Complete
                </Button>
              )}
            </div>
          </div>
        ))}
        {!enrollments?.length && (
          <p className="text-sm text-muted-foreground">No enrollments yet.</p>
        )}
      </div>
    </div>
  );
}
