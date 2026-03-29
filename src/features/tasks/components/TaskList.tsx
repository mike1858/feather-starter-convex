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
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "~/convex/_generated/api";
import { TaskItem } from "./TaskItem";
import type { Id } from "~/convex/_generated/dataModel";
import type { TaskStatus } from "@/shared/schemas/tasks";

interface Task {
  _id: Id<"tasks">;
  title: string;
  description?: string;
  priority: boolean;
  status: TaskStatus;
  visibility: string;
  creatorId: Id<"users">;
  assigneeId?: Id<"users">;
  position: number;
}

function SortableTaskItem({
  task,
  showGrab,
  currentUserId,
  onTaskClick,
}: {
  task: Task;
  showGrab?: boolean;
  currentUserId?: Id<"users">;
  onTaskClick?: (taskId: Id<"tasks">) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskItem
        task={task}
        dragHandleProps={listeners}
        showGrab={showGrab}
        currentUserId={currentUserId}
        onTaskClick={onTaskClick}
      />
    </div>
  );
}

export function TaskList({
  tasks,
  emptyMessage = "No tasks yet.",
  showGrab,
  currentUserId,
  onTaskClick,
}: {
  tasks: Task[];
  emptyMessage?: string;
  showGrab?: boolean;
  currentUserId?: Id<"users">;
  onTaskClick?: (taskId: Id<"tasks">) => void;
}) {
  const { mutateAsync: reorderTask } = useMutation({
    mutationFn: useConvexMutation(api.tasks.mutations.reorder),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sorted = [...tasks].sort((a, b) => a.position - b.position);
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIdx = sorted.findIndex((t) => t._id === active.id);
    const overIdx = sorted.findIndex((t) => t._id === over.id);
    if (activeIdx === -1 || overIdx === -1) return;

    let newPosition: number;
    if (overIdx === 0 && activeIdx > overIdx) {
      // Moving to top
      newPosition = sorted[0].position - 1000;
    } else if (overIdx === sorted.length - 1 && activeIdx < overIdx) {
      // Moving to bottom
      newPosition = sorted[sorted.length - 1].position + 1000;
    } else {
      // Moving between two items
      const targetIdx = activeIdx < overIdx ? overIdx : overIdx;
      const before = sorted[targetIdx - 1]?.position ?? sorted[targetIdx].position - 1000;
      const after = sorted[targetIdx + 1]?.position ?? sorted[targetIdx].position + 1000;
      newPosition = (before + after) / 2;
    }

    await reorderTask({
      taskId: active.id as Id<"tasks">,
      newPosition,
    });
  };
  if (sorted.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-primary/50">
        {emptyMessage}
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sorted.map((t) => t._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          {sorted.map((task) => (
            <SortableTaskItem
              key={task._id}
              task={task}
              showGrab={showGrab}
              currentUserId={currentUserId}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
