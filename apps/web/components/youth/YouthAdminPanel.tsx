'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Shield, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useYouthContext } from '@/components/youth/YouthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface HubAdminUser {
  userId: string;
  email: string;
  name: string;
  memberId: string | null;
  roleNames: string[];
  isYouthHubLeader: boolean;
  isYouthAdmin: boolean;
}

export function YouthAdminPanel() {
  const ctx = useYouthContext();
  const queryClient = useQueryClient();
  const { data, isLoading } = useApiQuery<HubAdminUser[]>(
    ['youth-hub-admins'],
    '/youth/hub-admins',
    { enabled: !!ctx?.permissions.assignYouthAdmins, retry: false },
  );

  const toggle = async (user: HubAdminUser, enabled: boolean) => {
    try {
      await api.patch(`/youth/hub-admins/${user.userId}`, { enabled });
      toast.success(
        enabled ? `${user.name} is now a Youth Hub admin` : `Removed Youth Hub admin from ${user.name}`,
      );
      queryClient.invalidateQueries({ queryKey: ['youth-hub-admins'] });
      queryClient.invalidateQueries({ queryKey: ['youth-context'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update Youth Hub admin'));
    }
  };

  if (!ctx?.permissions.assignYouthAdmins) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Only church Admin or Pastor can assign Youth Hub administrators.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-violet-200/50 bg-violet-50/20 dark:bg-violet-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-violet-600" />
            Youth Hub administration
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Church Admin and Pastor accounts always have full Youth Hub access. Assign{' '}
          <strong className="text-foreground">Youth Hub admin</strong> to leaders who should manage
          groups, events, resources, prayer wall moderation, feed, and gamification — without full
          church admin rights.
        </CardContent>
      </Card>

      <div className="space-y-2">
        {(data ?? []).map((user) => {
          const isChurchAdmin = user.roleNames.includes('ADMIN');
          const isPastor = user.roleNames.includes('PASTOR');
          const canToggle = !isChurchAdmin && !isPastor;

          return (
            <div
              key={user.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {user.roleNames.map((r) => (
                    <Badge key={r} variant="outline" className="text-[10px]">
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user.isYouthHubLeader && !user.isYouthAdmin && !isChurchAdmin && !isPastor && (
                  <Badge variant="secondary" className="text-[10px]">
                    Leader access
                  </Badge>
                )}
                {isChurchAdmin || isPastor ? (
                  <Badge variant="success" className="text-[10px]">
                    Full access
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant={user.isYouthAdmin ? 'secondary' : 'default'}
                    disabled={!canToggle}
                    onClick={() => toggle(user, !user.isYouthAdmin)}
                    className={cn(!canToggle && 'opacity-60')}
                  >
                    <UserCog className="mr-1.5 h-3.5 w-3.5" />
                    {user.isYouthAdmin ? 'Revoke admin' : 'Make Youth admin'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {!data?.length && (
          <p className="text-sm text-muted-foreground">No church users found.</p>
        )}
      </div>
    </div>
  );
}
