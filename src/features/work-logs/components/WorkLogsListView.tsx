import { useRef, useEffect, useCallback } from "react";
import { WorkLogsItem } from "./WorkLogsItem";
import { WorkLogsEmptyState } from "./WorkLogsEmptyState";

interface WorkLogsListViewProps {
  items: Array<Record<string, unknown>>;
  isLoading: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function WorkLogsListView({
  items,
  isLoading,
  onLoadMore,
  hasMore,
}: WorkLogsListViewProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);


  // Infinite scroll via IntersectionObserver
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && onLoadMore && !isLoading) {
        onLoadMore();
      }
    },
    [hasMore, onLoadMore, isLoading],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0,
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleObserver]);

  // Loading skeleton
  if (isLoading && items.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg bg-muted h-14 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Empty state
  if (!isLoading && items.length === 0) {
    return <WorkLogsEmptyState variant="noData" />;
  }

  const listContent = (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item._id as string}
          className="py-4 gap-4"
        >
          <WorkLogsItem
            item={item}
            density="comfortable"
          />
        </div>
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-px" />

      {/* Loading more indicator */}
      {isLoading && hasMore && (
        <div className="flex flex-col gap-2">
          <div className="rounded-lg bg-muted h-14 animate-pulse" />
          <div className="rounded-lg bg-muted h-14 animate-pulse" />
        </div>
      )}
    </div>
  );

  return listContent;
}
