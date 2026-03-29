import { useState } from "react";
import { Flag, Trash2, Clock } from "lucide-react";
import { convexQuery } from "@convex-dev/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "~/convex/_generated/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/ui/sheet";
import { Button } from "@/ui/button";
import { useDoubleCheck } from "@/ui/use-double-check";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { SubtaskList } from "./SubtaskList";
import { WorkLogForm } from "./WorkLogForm";
import { WorkLogList } from "./WorkLogList";
import { formatMinutes } from "@/shared/utils/time-parser";
import type { Id } from "~/convex/_generated/dataModel";
import type { TaskStatus } from "@/shared/schemas/tasks";

export function TaskDetailPanel({
  taskId,
  open,
  onOpenChange,
}: {
  taskId: Id<"tasks"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: task } = useQuery({
    ...convexQuery(api.tasks.queries.getById, taskId ? { taskId } : "skip"),
    enabled: !!taskId,
  });

  const { data: subtaskData } = useQuery({
    ...convexQuery(
      api.subtasks.queries.listByTask,
      taskId ? { taskId } : "skip",
    ),
    enabled: !!taskId,
  });

  const { data: workLogData } = useQuery({
    ...convexQuery(
      api.workLogs.queries.listByTask,
      taskId ? { taskId } : "skip",
    ),
    enabled: !!taskId,
  });

  const { mutateAsync: updateTask } = useMutation({
    mutationFn: useConvexMutation(api.tasks.mutations.update),
  });
  const { mutateAsync: removeTask } = useMutation({
    mutationFn: useConvexMutation(api.tasks.mutations.remove),
  });

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const { doubleCheck, getButtonProps } = useDoubleCheck();

  const handleTitleSave = async () => {
    if (!taskId) return;
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task?.title) {
      await updateTask({ taskId, title: trimmed });
    }
    setIsEditingTitle(false);
  };

  const handlePriorityToggle = async () => {
    if (!taskId || !task) return;
    await updateTask({ taskId, priority: !task.priority });
  };
  const handleDelete = async () => {
    if (!taskId) return;
    await removeTask({ taskId });
    onOpenChange(false);
  };
  const completionCount = subtaskData?.completionCount;
  const totalMinutes = workLogData?.totalMinutes ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {!task ? (
          <>
            <SheetTitle>Loading...</SheetTitle>
            <SheetDescription>Loading task details</SheetDescription>
          </>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  {}
                  {isEditingTitle ? (
                    <input
                      className="w-full rounded border border-input bg-transparent px-2 py-1 text-lg font-semibold"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={handleTitleSave}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleTitleSave();
                        if (e.key === "Escape") setIsEditingTitle(false);
                      }}
                      autoFocus
                    />
                  ) : (
                    <SheetTitle
                      className="cursor-pointer"
                      onClick={() => {
                        setEditTitle(task.title);
                        setIsEditingTitle(true);
                      }}
                    >
                      {task.title}
                    </SheetTitle>
                  )}
                  {}
                </div>

                <button
                  type="button"
                  onClick={handlePriorityToggle}
                  className={`rounded p-1 transition hover:bg-primary/5 ${
                    task.priority ? "text-orange-500" : "text-primary/20"
                  }`}
                  title={task.priority ? "High Priority" : "Normal"}
                >
                  <Flag className="h-4 w-4" />
                </button>
              </div>

              <SheetDescription>
                <span className="flex items-center gap-3">
                  <TaskStatusBadge
                    status={task.status as TaskStatus}
                    taskId={task._id}
                  />
                  {completionCount && completionCount.total > 0 && (
                    <span className="text-xs text-primary/50">
                      {completionCount.done}/{completionCount.total} done
                    </span>
                  )}
                  {totalMinutes > 0 && (
                    <span className="flex items-center gap-1 text-xs text-primary/50">
                      <Clock className="h-3 w-3" />
                      {formatMinutes(totalMinutes)}
                    </span>
                  )}
                </span>
              </SheetDescription>
            </SheetHeader>

            {/* Subtasks */}
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-medium text-primary/70">
                Subtasks
              </h3>
              <SubtaskList taskId={task._id} />
            </div>

            {/* Work Log */}
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-medium text-primary/70">
                Work Log
              </h3>
              <WorkLogForm taskId={task._id} />
              <WorkLogList taskId={task._id} />
            </div>

            {/* Delete button */}
            <div className="mt-auto pt-4 border-t border-border">
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                {...getButtonProps({
                  onClick: doubleCheck ? handleDelete : undefined,
                })}
              >
                {doubleCheck ? (
                  <span className="text-xs">Delete this task?</span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Trash2 className="h-4 w-4" />
                    <span className="text-xs">Delete task</span>
                  </span>
                )}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
