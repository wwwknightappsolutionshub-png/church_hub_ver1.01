import { Skeleton } from '@/components/ui/skeleton';

export function DashboardPageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8" role="status" aria-label="Loading page content">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
