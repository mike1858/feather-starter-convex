import { useRef, useEffect, useCallback, useState } from "react";
import { Pencil, Trash2, ImageIcon, LayoutGrid } from "lucide-react";
import { Button } from "@/ui/button";
import { TestGenEmptyState } from "./TestGenEmptyState";

interface TestGenCardViewProps {
  items: Array<Record<string, unknown>>;
  isLoading: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onCardClick?: (item: Record<string, unknown>) => void;
  onEdit?: (item: Record<string, unknown>) => void;
  onDelete?: (item: Record<string, unknown>) => void;
}

const GRID_CLASSES = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
const SIZE_PADDING = "p-6";
const TITLE_CLASSES = "text-sm font-semibold";

export function TestGenCardView({
  items,
  isLoading,
  onLoadMore,
  hasMore,
  onCardClick,
  onEdit,
  onDelete,
}: TestGenCardViewProps) {
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
      <div className={GRID_CLASSES}>
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

  // Empty state
  if (!isLoading && items.length === 0) {
    return <TestGenEmptyState variant="noData" icon={LayoutGrid} />;
  }

  const renderCard = (item: Record<string, unknown>) => {
    const handleCardClick = () => onCardClick?.(item);
    const handleEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit?.(item);
    };
    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(item);
    };

    return (
      <div
        key={item._id as string}
        className="group relative"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCardClick();
        }}
      >
        {/* @custom-start card-content */}
        {/* @custom-end card-content */}
        <div
          className={`rounded-lg border border-border bg-card ${SIZE_PADDING} shadow-card hover:shadow-card-hover hover:-translate-y-px transition-all duration-200 ease-out cursor-pointer`}
        >
          <div className="flex flex-col gap-4">
            {/* Top row: title + status */}
            <div className="flex items-start justify-between">
              <span className={`${TITLE_CLASSES} text-primary line-clamp-2`}>
                {item.title as string}
              </span>
              
              <span className="inline-flex items-center gap-1.5 text-xs">
                <span className="h-1.5 w-1.5 rounded-full" />
                <span>{item.status as string}</span>
              </span>
            </div>

            {/* Body: description + metadata */}
            <div className="flex flex-col gap-1.5">
              {item.description && (
                <p className="text-xs text-primary/60 line-clamp-2">
                  {item.description as string}
                </p>
              )}
            </div>

            {/* Footer: timestamp + actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                {item._creationTime
                  ? new Date(item._creationTime as number).toLocaleDateString()
                  : ""}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleEdit}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>



      </div>
    );
  };

  return (
    <>
      <div className={GRID_CLASSES}>
        {items.map((item) => renderCard(item))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-px" />

      {/* Loading more indicator */}
      {isLoading && hasMore && (
        <div className={GRID_CLASSES + " mt-4"}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-6">
              <div className="h-4 w-3/4 rounded bg-muted mb-4 animate-pulse" />
              <div className="h-3 w-full rounded bg-muted mb-1 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
