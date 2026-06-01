'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link2, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ParentLink {
  id: string;
  relation: string;
  parent: { id: string; firstName: string; lastName: string; email?: string | null; phone?: string | null };
  child: {
    id: string;
    firstName: string;
    lastName: string;
    youthMemberships?: Array<{ youthGroup: { name: string } }>;
    gamification?: { points: number; attendanceStreak: number } | null;
  };
}

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
}

export function YouthParentsPanel() {
  const queryClient = useQueryClient();
  const links = useApiQuery<ParentLink[]>(['youth-parents'], '/youth/parents');
  const youthMembers = useApiQuery<MemberOption[]>(['youth-member-list'], '/youth/members');
  const allMembers = useApiQuery<MemberOption[]>(['membership-members'], '/membership/members');
  const [parentId, setParentId] = useState('');
  const [childId, setChildId] = useState('');
  const [linking, setLinking] = useState(false);

  const linkParent = async () => {
    if (!parentId || !childId) return;
    setLinking(true);
    try {
      await api.post('/youth/parents/link', { parentId, childId, relation: 'PARENT' });
      toast.success('Parent/guardian linked');
      setParentId('');
      setChildId('');
      queryClient.invalidateQueries({ queryKey: ['youth-parents'] });
    } catch {
      toast.error('Could not create link');
    } finally {
      setLinking(false);
    }
  };

  const adults = (allMembers.data ?? []).filter((m) => !(youthMembers.data ?? []).some((y) => y.id === m.id));

  if (links.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" />
            Link parent or guardian
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <select
            className="h-10 min-w-[200px] flex-1 rounded-md border border-input bg-background px-3 text-sm"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">Parent / guardian…</option>
            {adults.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </select>
          <select
            className="h-10 min-w-[200px] flex-1 rounded-md border border-input bg-background px-3 text-sm"
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
          >
            <option value="">Youth member…</option>
            {(youthMembers.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </select>
          <Button onClick={linkParent} disabled={linking}>
            {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Link'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {(links.data ?? []).map((link) => (
          <Card key={link.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {link.parent.firstName} {link.parent.lastName}
                <span className="mx-2 text-muted-foreground">→</span>
                {link.child.firstName} {link.child.lastName}
              </CardTitle>
              <Badge variant="outline">{link.relation}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {link.parent.email && <p>{link.parent.email}</p>}
              {link.parent.phone && <p>{link.parent.phone}</p>}
              <div className="flex flex-wrap gap-1">
                {(link.child.youthMemberships ?? []).map((ym, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    <Users className="mr-1 h-3 w-3" />
                    {ym.youthGroup.name}
                  </Badge>
                ))}
              </div>
              {link.child.gamification && (
                <p>
                  Youth progress: {link.child.gamification.points} pts · {link.child.gamification.attendanceStreak} week streak
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {!links.data?.length && (
          <p className="col-span-2 text-center text-sm text-muted-foreground">
            No parent links yet — link guardians to youth for visibility into groups and attendance.
          </p>
        )}
      </div>
    </div>
  );
}
