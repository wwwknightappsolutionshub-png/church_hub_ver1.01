'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ListPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  className,
}: {
  page: number;
  totalPages: number;
  total?: number;
  pageSize?: number;
  onPage: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1 && (total ?? 0) <= (pageSize ?? 20)) return null;

  const rangeStart = total && pageSize ? (page - 1) * pageSize + 1 : null;
  const rangeEnd = total && pageSize ? Math.min(page * pageSize, total) : null;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 pt-3 ${className ?? ''}`}
      data-testid="list-pagination"
    >
      {total != null && rangeStart != null && rangeEnd != null ? (
        <p className="text-xs text-muted-foreground">
          Showing {rangeStart}–{rangeEnd} of {total}
        </p>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[5.5rem] text-center text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
