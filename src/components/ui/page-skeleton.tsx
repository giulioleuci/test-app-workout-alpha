import { Skeleton } from '@/components/ui/skeleton';

/** Generic detail page skeleton: header + cards */
export function DetailPageSkeleton() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      {/* Cards */}
      <CardSkeleton />
      <CardSkeleton lines={4} />
      <CardSkeleton lines={3} />
    </div>
  );
}

/** Generic list page skeleton */
export function ListPageSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-end">
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} lines={2} />
        ))}
      </div>
    </div>
  );
}

/** Single card skeleton */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <Skeleton className="h-5 w-36" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4" style={{ width: `${85 - i * 12}%` }} />
      ))}
    </div>
  );
}
