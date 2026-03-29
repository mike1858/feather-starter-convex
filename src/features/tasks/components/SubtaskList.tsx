import { useState } from "react";
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { convexQuery } from "@convex-dev/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "~/convex/_generated/api";
import { SubtaskItem } from "./SubtaskItem";
import { SUBTASK_TITLE_MAX_LENGTH } from "@/shared/schemas/subtasks";
import type { Id } from "~/convex/_generated/dataModel";

function SortableSubtaskItem({
  subtask,
}: {
  subtask: {
    _id: Id<"subtasks">;
    title: string;
    status: "todo" | "done" | "promoted";
    promotedToTaskId?: Id<"tasks">;
    position: number;
  };
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <SubtaskItem subtask={subtask} dragHandleProps={listeners} />
    </div>
  );
}
export function SubtaskList({ taskId }: { taskId: Id<"tasks"> }) {
  const { data } = useQuery(
    convexQuery(api.subtasks.queries.listByTask, { taskId }),
  );

  const { mutateAsync: createSubtask } = useMutation({
    mutationFn: useConvexMutation(api.subtasks.mutations.create),
  });
  const { mutateAsync: reorderSubtask } = useMutation({
    mutationFn: useConvexMutation(api.subtasks.mutations.reorder),
  });

  const [newTitle, setNewTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const subtasks = data?.subtasks ?? [];
  const completionCount = data?.completionCount ?? { done: 0, total: 0 };

  const handleAdd = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    await createSubtask({ taskId, title: trimmed });
    setNewTitle("");
  };
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIdx = subtasks.findIndex((s) => s._id === active.id);
    const overIdx = subtasks.findIndex((s) => s._id === over.id);
    if (activeIdx === -1 || overIdx === -1) return;

    let newPosition: number;
    if (overIdx === 0 && activeIdx > overIdx) {
      newPosition = subtasks[0].position - 1000;
    } else if (overIdx === subtasks.length - 1 && activeIdx < overIdx) {
      newPosition = subtasks[subtasks.length - 1].position + 1000;
    } else {
      const targetIdx = activeIdx < overIdx ? overIdx : overIdx;
      const before =
        subtasks[targetIdx - 1]?.position ??
        subtasks[targetIdx].position - 1000;
      const after =
        subtasks[targetIdx + 1]?.position ??
        subtasks[targetIdx].position + 1000;
      newPosition = (before + after) / 2;
    }

    await reorderSubtask({
      subtaskId: active.id as Id<"subtasks">,
      newPosition,
    });
  };
  return (
    <div>
      {/* Completion count */}
      {completionCount.total > 0 && (
        <p className="mb-2 text-xs text-primary/50">
          {completionCount.done}/{completionCount.total} done
        </p>
      )}

      {/* Subtask list */}
      {subtasks.length === 0 ? (
        <p className="py-2 text-xs text-primary/40">No subtasks yet.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={subtasks.map((s) => s._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-0.5">
              {subtasks.map((subtask) => (
                <SortableSubtaskItem key={subtask._id} subtask={subtask} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Inline add input */}
      <div className="mt-2">
        <input
          className="w-full rounded border border-dashed border-primary/20 bg-transparent px-2 py-1 text-sm placeholder:text-primary/30 focus:border-primary/40 focus:outline-none"
          placeholder="Add a subtask..."
          value={newTitle}
          maxLength={SUBTASK_TITLE_MAX_LENGTH}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />
      </div>
    </div>
  );
}
