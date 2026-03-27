import { useRef, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SubtasksItem } from "./SubtasksItem";
import { SubtasksEmptyState } from "./SubtasksEmptyState";

interface SubtasksListViewProps {
  items: Array<Record<string, unknown>>;
  isLoading: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onReorder?: (itemId: string, newPosition: number) => void;
}

export function SubtasksListView({
  items,
  isLoading,
  onLoadMore,
  hasMore,
  onReorder,
}: SubtasksListViewProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;

    const activeIdx = items.findIndex((item) => item._id === active.id);
    const overIdx = items.findIndex((item) => item._id === over.id);
    if (activeIdx === -1 || overIdx === -1) return;

    const sorted = [...items].sort(
      (a, b) => (a.position as number) - (b.position as number),
    );
    let newPosition: number;
    if (overIdx === 0 && activeIdx > overIdx) {
      newPosition = (sorted[0].position as number) - 1000;
    } else if (overIdx === sorted.length - 1 && activeIdx < overIdx) {
      newPosition = (sorted[sorted.length - 1].position as number) + 1000;
    } else {
      const targetIdx = activeIdx < overIdx ? overIdx : overIdx;
      const before =
        (sorted[targetIdx - 1]?.position as number) ??
        (sorted[targetIdx].position as number) - 1000;
      const after =
        (sorted[targetIdx + 1]?.position as number) ??
        (sorted[targetIdx].position as number) + 1000;
      newPosition = (before + after) / 2;
    }

    onReorder(active.id as string, newPosition);
  };

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
    return <SubtasksEmptyState variant="noData" />;
  }

  const listContent = (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item._id as string}
          className="py-4 gap-4"
        >
          <SubtasksItem
            item={item}
            density="comfortable"
            draggable
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item._id as string)}
        strategy={verticalListSortingStrategy}
      >
        {listContent}
      </SortableContext>
    </DndContext>
  );
}
