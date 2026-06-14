'use client';

import { useState, type ReactNode } from 'react';
import { Cake, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import type {
  CelebrationAnniversaryItemDto,
  CelebrationBirthdayItemDto,
  CelebrationPaginatedListDto,
  MembershipCelebrationsDto,
} from '@church-hub/shared-types';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardPageSkeleton } from '@/components/dashboard/DashboardPageSkeleton';
import { cn } from '@/lib/utils';

interface Props {
  days?: number;
  compact?: boolean;
}

const PAGE_SIZE_OPTIONS = [5, 8, 12, 20] as const;

const EMPTY_PAGE = {
  items: [],
  total: 0,
  page: 1,
  limit: 8,
  totalPages: 1,
};

function buildCelebrationsUrl(
  days: number,
  birthdaysPage: number,
  birthdaysLimit: number,
  anniversariesPage: number,
  anniversariesLimit: number,
) {
  const params = new URLSearchParams({
    days: String(days),
    birthdaysPage: String(birthdaysPage),
    birthdaysLimit: String(birthdaysLimit),
    anniversariesPage: String(anniversariesPage),
    anniversariesLimit: String(anniversariesLimit),
  });
  return `/membership/celebrations?${params.toString()}`;
}

interface CelebrationColumnProps<T> {
  title: string;
  description: string;
  icon: typeof Cake;
  accent: 'birthday' | 'anniversary';
  list: CelebrationPaginatedListDto<T>;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  renderItem: (item: T) => ReactNode;
  emptyMessage: string;
  testId: string;
}

function CelebrationColumn<T>({
  title,
  description,
  icon: Icon,
  accent,
  list,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  renderItem,
  emptyMessage,
  testId,
}: CelebrationColumnProps<T>) {
  const isBirthday = accent === 'birthday';
  const rangeStart = list.total === 0 ? 0 : (list.page - 1) * list.limit + 1;
  const rangeEnd = list.total === 0 ? 0 : Math.min(list.page * list.limit, list.total);

  return (
    <Card
      className={cn(
        'overflow-hidden border-2 shadow-sm',
        isBirthday
          ? 'border-amber-200/90 bg-gradient-to-b from-amber-50/80 to-background dark:border-amber-900/50 dark:from-amber-950/30'
          : 'border-violet-200/90 bg-gradient-to-b from-violet-50/80 to-background dark:border-violet-900/50 dark:from-violet-950/30',
      )}
      data-testid={testId}
    >
      <CardHeader
        className={cn(
          'border-b pb-4',
          isBirthday
            ? 'border-amber-200/70 bg-amber-100/40 dark:border-amber-900/40 dark:bg-amber-950/20'
            : 'border-violet-200/70 bg-violet-100/40 dark:border-violet-900/40 dark:bg-violet-950/20',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full',
                  isBirthday
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    : 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              {title}
            </CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              'shrink-0 px-2.5 py-1 text-sm font-semibold tabular-nums',
              isBirthday
                ? 'border border-amber-300/60 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100'
                : 'border border-violet-300/60 bg-violet-100 text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100',
            )}
          >
            {list.total}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {list.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <ul className="space-y-2">
            {list.items.map((item) => renderItem(item))}
          </ul>
        )}

        {list.total > 0 && (
          <div
            className={cn(
              'flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between',
              isBirthday ? 'border-amber-200/60' : 'border-violet-200/60',
            )}
          >
            <p className="text-xs text-muted-foreground sm:text-sm">
              Showing {rangeStart}–{rangeEnd} of {list.total}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                Per page
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs sm:text-sm"
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  aria-label={`${title} per page`}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                aria-label={`Previous ${title} page`}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[4.5rem] text-center text-xs tabular-nums sm:text-sm">
                {page} / {Math.max(1, list.totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page >= list.totalPages}
                onClick={() => onPageChange(page + 1)}
                aria-label={`Next ${title} page`}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CelebrationColumnsPanel({ days = 30, compact }: Props) {
  const defaultPageSize = compact ? 5 : 8;
  const [birthdaysPage, setBirthdaysPage] = useState(1);
  const [birthdaysLimit, setBirthdaysLimit] = useState(defaultPageSize);
  const [anniversariesPage, setAnniversariesPage] = useState(1);
  const [anniversariesLimit, setAnniversariesLimit] = useState(defaultPageSize);

  const url = buildCelebrationsUrl(
    days,
    birthdaysPage,
    birthdaysLimit,
    anniversariesPage,
    anniversariesLimit,
  );

  const { data, isLoading, isError, refetch } = useApiQuery<MembershipCelebrationsDto>(
    [
      'membership-celebrations',
      String(days),
      String(birthdaysPage),
      String(birthdaysLimit),
      String(anniversariesPage),
      String(anniversariesLimit),
    ],
    url,
  );

  if (isLoading) {
    return compact ? null : <DashboardPageSkeleton cards={2} />;
  }

  if (isError) {
    return (
      <div
        className="rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
        data-testid="celebration-columns-error"
      >
        Could not load celebrations — restart the API server and refresh this page.{' '}
        <button type="button" className="font-semibold underline" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const birthdays = data?.birthdays ?? EMPTY_PAGE;
  const anniversaries = data?.anniversaries ?? EMPTY_PAGE;

  return (
    <div className="space-y-3" data-testid="celebration-columns">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Celebration Emails</h3>
          <p className="text-sm text-muted-foreground">
            Upcoming birthdays and anniversaries in the next {days} days
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <CelebrationColumn<CelebrationBirthdayItemDto>
          title="Birthday Celebrants"
          description="Congregants with a date of birth in this window"
          icon={Cake}
          accent="birthday"
          list={birthdays}
          page={birthdaysPage}
          pageSize={birthdaysLimit}
          onPageChange={setBirthdaysPage}
          onPageSizeChange={(size) => {
            setBirthdaysLimit(size);
            setBirthdaysPage(1);
          }}
          emptyMessage="No upcoming birthdays in this window."
          testId="celebration-birthdays-column"
          renderItem={(b) => (
            <li
              key={b.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-amber-200/70 bg-white/80 px-3 py-3 shadow-sm dark:border-amber-900/40 dark:bg-slate-950/50"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 dark:text-slate-50">
                  {b.firstName} {b.lastName}
                </p>
                {b.email ? (
                  <p className="truncate text-xs text-muted-foreground">{b.email}</p>
                ) : null}
                {b.age != null ? (
                  <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-200">
                    Turning {b.age}
                  </p>
                ) : null}
              </div>
              <Badge className="shrink-0 border-amber-300/70 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                {b.label}
              </Badge>
            </li>
          )}
        />

        <CelebrationColumn<CelebrationAnniversaryItemDto>
          title="Anniversaries"
          description="Member and family special occasions in this window"
          icon={Heart}
          accent="anniversary"
          list={anniversaries}
          page={anniversariesPage}
          pageSize={anniversariesLimit}
          onPageChange={setAnniversariesPage}
          onPageSizeChange={(size) => {
            setAnniversariesLimit(size);
            setAnniversariesPage(1);
          }}
          emptyMessage="No upcoming anniversaries in this window."
          testId="celebration-anniversaries-column"
          renderItem={(a) => (
            <li
              key={`${a.type}-${a.id}`}
              className="flex items-start justify-between gap-3 rounded-lg border border-violet-200/70 bg-white/80 px-3 py-3 shadow-sm dark:border-violet-900/40 dark:bg-slate-950/50"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 dark:text-slate-50">{a.name}</p>
                <p className="text-xs text-violet-800 dark:text-violet-200">{a.occasion}</p>
                {a.type === 'family' ? (
                  <Badge variant="outline" className="mt-1 text-[10px] uppercase tracking-wide">
                    Family
                  </Badge>
                ) : null}
              </div>
              <Badge className="shrink-0 border-violet-300/70 bg-violet-100 text-violet-900 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100">
                {a.label}
              </Badge>
            </li>
          )}
        />
      </div>
    </div>
  );
}
