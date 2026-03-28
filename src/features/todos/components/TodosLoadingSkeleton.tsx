
interface TodosLoadingSkeletonProps {
  variant: "list" | "card" | "table";
}

export function TodosLoadingSkeleton({ variant }: TodosLoadingSkeletonProps) {
  if (variant === "list") {
    return (
      <div className="flex flex-col gap-2">
        {/* Comfortable density skeleton */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg px-4 py-4"
          >
            <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
            <div className="h-4 flex-1 max-w-[60%] rounded bg-muted animate-pulse" />
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            <div className="h-4 w-8 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "card") {
    {/* none / thumbnail image style skeleton */}
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-6">
            <div className="h-4 w-3/4 rounded bg-muted mb-4 animate-pulse" />
            <div className="h-3 w-full rounded bg-muted mb-1 animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-muted mb-4 animate-pulse" />
            <div className="flex justify-between">
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              <div className="h-3 w-12 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
        {/* Skeleton header */}
        <div className="bg-surface-secondary px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="h-3 w-[30%] rounded bg-muted animate-pulse" />
            <div className="h-3 w-[15%] rounded bg-muted animate-pulse" />
            <div className="h-3 w-[15%] rounded bg-muted animate-pulse" />
            <div className="h-3 w-[10%] rounded bg-muted animate-pulse" />
          </div>
        </div>

        {/* Skeleton rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-b-0"
          >
            <div className="h-4 w-[30%] rounded bg-muted animate-pulse" />
            <div className="h-4 w-[15%] rounded bg-muted animate-pulse" />
            <div className="h-4 w-[15%] rounded bg-muted animate-pulse" />
            <div className="h-4 w-[10%] rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return null;
}
