'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { ArrowRight, CheckCircle2, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { deptToolsApiBase } from '@/lib/dept-module-catalog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type BoardChild = {
  childId: string;
  firstName: string;
  lastName: string;
  classGroup: string | null;
  classLabel: string | null;
  age: number | null;
};

type WaitingChild = BoardChild & {
  status: 'available' | 'checked_out';
  checkInId?: string;
  checkedOutAt?: string | null;
};

type CheckedInChild = BoardChild & {
  checkInId: string;
  checkedInAt: string;
};

type CheckInBoard = {
  serviceDate: string;
  stats: {
    registered: number;
    checkedIn: number;
    checkedOut: number;
    waiting: number;
  };
  waiting: WaitingChild[];
  checkedIn: CheckedInChild[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function childName(c: BoardChild) {
  return `${c.firstName} ${c.lastName}`.trim();
}

export function ChildrenCheckInBoard({
  unitId,
  canEdit,
}: {
  unitId: string;
  canEdit: boolean;
}) {
  const base = deptToolsApiBase(unitId);
  const queryClient = useQueryClient();
  const [serviceDate, setServiceDate] = useState(todayIso());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [optimisticBoard, setOptimisticBoard] = useState<CheckInBoard | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const { data: board, isLoading, isError, error, refetch } = useApiQuery<CheckInBoard>(
    ['children-check-in-board', unitId, serviceDate],
    `${base}/children/check-in-board?serviceDate=${serviceDate}`,
  );

  useEffect(() => {
    setOptimisticBoard(null);
  }, [serviceDate]);

  const displayBoard = optimisticBoard ?? board;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['children-check-in-board', unitId] });
    await queryClient.invalidateQueries({ queryKey: ['dept-checkins', unitId] });
    await queryClient.invalidateQueries({ queryKey: ['dept-dashboard', unitId] });
  };

  const applyOptimisticCheckIn = (child: WaitingChild): CheckInBoard => {
    const source = optimisticBoard ?? board;
    if (!source) throw new Error('Board not loaded');

    const now = new Date().toISOString();
    const checkedInRow: CheckedInChild = {
      childId: child.childId,
      firstName: child.firstName,
      lastName: child.lastName,
      classGroup: child.classGroup,
      classLabel: child.classLabel,
      age: child.age,
      checkInId: `optimistic-${child.childId}`,
      checkedInAt: now,
    };

    const waiting = source.waiting.filter((w) => w.childId !== child.childId);
    const checkedIn = [...source.checkedIn, checkedInRow].sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
    );

    return {
      ...source,
      waiting,
      checkedIn,
      stats: {
        ...source.stats,
        checkedIn: checkedIn.length,
        waiting: waiting.filter((w) => w.status === 'available').length,
      },
    };
  };

  const applyOptimisticCheckOut = (child: CheckedInChild): CheckInBoard => {
    const source = optimisticBoard ?? board;
    if (!source) throw new Error('Board not loaded');

    const now = new Date().toISOString();
    const waitingRow: WaitingChild = {
      childId: child.childId,
      firstName: child.firstName,
      lastName: child.lastName,
      classGroup: child.classGroup,
      classLabel: child.classLabel,
      age: child.age,
      status: 'checked_out',
      checkInId: child.checkInId.startsWith('optimistic-') ? undefined : child.checkInId,
      checkedOutAt: now,
    };

    const checkedIn = source.checkedIn.filter((c) => c.childId !== child.childId);
    const waiting = [...source.waiting, waitingRow].sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
    );

    return {
      ...source,
      waiting,
      checkedIn,
      stats: {
        ...source.stats,
        checkedIn: checkedIn.length,
        checkedOut: waiting.filter((w) => w.status === 'checked_out').length,
        waiting: waiting.filter((w) => w.status === 'available').length,
      },
    };
  };

  const checkIn = async (child: WaitingChild) => {
    if (!canEdit || child.status !== 'available' || pendingId) return;

    const name = childName(child);
    const optimistic = applyOptimisticCheckIn(child);
    setOptimisticBoard(optimistic);
    setHighlightId(child.childId);
    setPendingId(child.childId);

    toast.success(`${name} checked in`, {
      description: 'Moved to the building — shown in green on the right.',
    });

    try {
      const { data: created } = await api.post<{
        id: string;
        checkedInAt: string;
      }>(`${base}/check-ins`, {
        childMemberId: child.childId,
        classGroup: child.classGroup ?? undefined,
        serviceDate,
      });

      const finalBoard: CheckInBoard = {
        ...optimistic,
        checkedIn: optimistic.checkedIn.map((row) =>
          row.childId === child.childId
            ? {
                ...row,
                checkInId: created.id,
                checkedInAt: created.checkedInAt,
              }
            : row,
        ),
      };

      queryClient.setQueryData(['children-check-in-board', unitId, serviceDate], finalBoard);
      setOptimisticBoard(null);
      await refresh();
    } catch (err) {
      setOptimisticBoard(null);
      setHighlightId(null);
      toast.error(apiErrorMessage(err as AxiosError, 'Check-in failed'));
    } finally {
      setPendingId(null);
      window.setTimeout(() => setHighlightId(null), 1200);
    }
  };

  const checkOut = async (child: CheckedInChild) => {
    if (!canEdit || pendingId || child.checkInId.startsWith('optimistic-')) return;

    const name = childName(child);
    setOptimisticBoard(applyOptimisticCheckOut(child));
    setPendingId(child.childId);

    toast.success(`${name} checked out`, {
      description: 'Returned to the left column for this session.',
    });

    try {
      await api.patch(`${base}/check-ins/${child.checkInId}/checkout`);
      setOptimisticBoard(null);
      await refresh();
    } catch (err) {
      setOptimisticBoard(null);
      toast.error(apiErrorMessage(err as AxiosError, 'Check-out failed'));
    } finally {
      setPendingId(null);
    }
  };

  const available = useMemo(
    () => displayBoard?.waiting.filter((w) => w.status === 'available') ?? [],
    [displayBoard],
  );
  const checkedOut = useMemo(
    () => displayBoard?.waiting.filter((w) => w.status === 'checked_out') ?? [],
    [displayBoard],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Pickup tracking</h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Tap a child on the left to check them in. Tap again on the right when they are picked up.
            Checked-out children return to the left and are grayed out for this session.
          </p>
        </div>
        <div className="w-full max-w-[11rem]">
          <Label htmlFor="checkin-date" className="text-xs">
            Service date
          </Label>
          <Input
            id="checkin-date"
            type="date"
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
          />
        </div>
      </div>

      {displayBoard ? (
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{displayBoard.stats.registered} registered</Badge>
          <Badge className="border-green-600/30 bg-green-600 text-white hover:bg-green-600">
            {displayBoard.stats.checkedIn} checked in
          </Badge>
          <Badge variant="outline">{displayBoard.stats.waiting} waiting</Badge>
          <Badge variant="outline" className="text-muted-foreground">
            {displayBoard.stats.checkedOut} checked out
          </Badge>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex min-h-[280px] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <Card className="border-destructive/40">
          <CardContent className="space-y-3 py-8 text-center text-sm">
            <p className="text-muted-foreground">{pickupBoardErrorMessage(error as AxiosError)}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="h-4 w-4 text-primary" />
                Waiting
              </CardTitle>
              <CardDescription>
                {canEdit ? 'Tap a child to check them in' : 'Children not yet checked in'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {available.length === 0 && checkedOut.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No registered children for this session.
                </p>
              ) : null}

              {available.map((child) => (
                <ChildTile
                  key={child.childId}
                  name={childName(child)}
                  classLabel={child.classLabel}
                  age={child.age}
                  disabled={!canEdit}
                  pending={pendingId === child.childId}
                  onClick={() => checkIn(child)}
                />
              ))}

              {checkedOut.length > 0 ? (
                <div className="pt-2">
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Checked out this session
                  </p>
                  <div className="space-y-2">
                    {checkedOut.map((child) => (
                      <ChildTile
                        key={child.childId}
                        name={childName(child)}
                        classLabel={child.classLabel}
                        age={child.age}
                        checkedOut
                        disabled
                        subtitle={
                          child.checkedOutAt
                            ? `Out ${new Date(child.checkedOutAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : 'Checked out'
                        }
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-green-500/25 bg-green-500/[0.03]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-green-800 dark:text-green-300">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Checked in
              </CardTitle>
              <CardDescription>
                {canEdit ? 'Tap a child when they are picked up' : 'Currently in the building'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(displayBoard?.checkedIn ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No children checked in yet.
                </p>
              ) : (
                displayBoard?.checkedIn.map((child) => (
                  <ChildTile
                    key={child.checkInId}
                    name={childName(child)}
                    classLabel={child.classLabel}
                    age={child.age}
                    checkedIn
                    highlighted={highlightId === child.childId}
                    disabled={!canEdit}
                    pending={pendingId === child.childId}
                    subtitle={`In since ${new Date(child.checkedInAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`}
                    onClick={() => checkOut(child)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {canEdit ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowRight className="h-3.5 w-3.5" />
          Left column → check in · Right column → check out
        </p>
      ) : null}
    </div>
  );
}

function pickupBoardErrorMessage(err: AxiosError | null): string {
  const status = err?.response?.status;
  const apiMessage =
    typeof err?.response?.data === 'object' &&
    err.response.data !== null &&
    'message' in err.response.data &&
    typeof (err.response.data as { message: unknown }).message === 'string'
      ? (err.response.data as { message: string }).message
      : null;

  if (status === 404) {
    return 'Pickup board API not found. Restart the Church API so the latest routes load, then retry.';
  }
  if (status === 403) {
    return (
      apiMessage ??
      "Check-in is limited to Church Admin, Pastor, or Children Church Admin. Ask a leader to grant access."
    );
  }
  if (!err?.response) {
    return 'Cannot reach the Church API. Ensure it is running on port 4000.';
  }
  return apiMessage ?? 'Could not load the pickup board.';
}

function ChildTile({
  name,
  classLabel,
  age,
  subtitle,
  checkedIn,
  highlighted,
  checkedOut,
  disabled,
  pending,
  onClick,
}: {
  name: string;
  classLabel: string | null;
  age: number | null;
  subtitle?: string;
  checkedIn?: boolean;
  highlighted?: boolean;
  checkedOut?: boolean;
  disabled?: boolean;
  pending?: boolean;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick) && !disabled && !checkedOut;

  return (
    <button
      type="button"
      disabled={!interactive || pending}
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-300',
        checkedOut && 'cursor-default border-border/40 bg-muted/30 opacity-60',
        checkedIn &&
          'border-green-500/50 bg-green-50 shadow-sm hover:border-green-600/60 hover:bg-green-100/80 dark:border-green-500/40 dark:bg-green-950/40 dark:hover:bg-green-950/60',
        highlighted && checkedIn && 'ring-2 ring-green-500/50 ring-offset-2 ring-offset-background',
        interactive &&
          !checkedIn &&
          !checkedOut &&
          'border-border/70 bg-background hover:border-green-500/40 hover:bg-green-50/50 dark:hover:bg-green-950/20',
        !interactive && !checkedOut && !checkedIn && 'cursor-default border-border/60 bg-background',
        pending && !checkedIn && 'pointer-events-none opacity-70',
      )}
    >
      <div className="min-w-0">
        <p
          className={cn(
            'truncate font-medium',
            checkedIn && 'text-green-900 dark:text-green-100',
            checkedOut && 'text-muted-foreground line-through decoration-muted-foreground/50',
          )}
        >
          {name}
        </p>
        <p
          className={cn(
            'mt-0.5 text-xs',
            checkedIn ? 'text-green-800/70 dark:text-green-200/70' : 'text-muted-foreground',
          )}
        >
          {[classLabel, age != null ? `Age ${age}` : null, subtitle].filter(Boolean).join(' · ')}
        </p>
      </div>
      {pending && !checkedIn ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-green-600" />
      ) : checkedOut ? (
        <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">
          Out
        </Badge>
      ) : checkedIn ? (
        <Badge className="shrink-0 border-0 bg-green-600 text-[10px] text-white hover:bg-green-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Checked in
        </Badge>
      ) : interactive ? (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          Tap to check in
        </Badge>
      ) : null}
    </button>
  );
}
