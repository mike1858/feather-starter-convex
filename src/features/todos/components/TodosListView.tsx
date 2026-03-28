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
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TodosItem } from "./TodosItem";
import { TodosEmptyState } from "./TodosEmptyState";
import type { Id } from "~/convex/_generated/dataModel";

interface TodosListItem {
  _id: Id<"todos">;
  title: string;
  completed?: boolean;
  position: number;
}

interface TodosListViewProps {
  items: Array<TodosListItem>;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onReorder?: (itemId: string, newPosition: number) => void;
}

export function TodosListView({
  items,
  isLoading,
  onLoadMore,
  hasMore,
  onReorder,
}: TodosListViewProps) {
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
      (a, b) => a.position - b.position,
    );
    let newPosition: number;
    if (overIdx === 0 && activeIdx > overIdx) {
      newPosition = sorted[0].position - 1000;
    } else if (overIdx === sorted.length - 1 && activeIdx < overIdx) {
      newPosition = sorted[sorted.length - 1].position + 1000;
    } else {
      const targetIdx = activeIdx < overIdx ? overIdx : overIdx;
      const before =
        sorted[targetIdx - 1]?.position ??
        sorted[targetIdx].position - 1000;
      const after =
        sorted[targetIdx + 1]?.position ??
        sorted[targetIdx].position + 1000;
      newPosition = (before + after) / 2;
    }

    onReorder(String(active.id), newPosition);
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
    return <TodosEmptyState variant="noData" />;
  }

  const listContent = (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item._id}
          className="py-4 gap-4"
        >
          <TodosItem
            item={item}
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
        items={items.map((item) => item._id)}
        strategy={verticalListSortingStrategy}
      >
        {listContent}
      </SortableContext>
    </DndContext>
  );
}
