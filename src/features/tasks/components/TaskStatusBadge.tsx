import { Circle, Loader, CheckCircle } from "lucide-react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "~/convex/_generated/api";
import type { TaskStatus } from "@/shared/schemas/tasks";
import { TASK_STATUS_VALUES } from "@/shared/schemas/tasks";
import type { Id } from "~/convex/_generated/dataModel";

const STATUS_CONFIG: Record<
  TaskStatus,
  { icon: typeof Circle; colorClass: string; label: string }
> = {
  todo: { icon: Circle, colorClass: "text-gray-400", label: "To Do" },
  in_progress: {
    icon: Loader,
    colorClass: "text-blue-500",
    label: "In Progress",
  },
  done: {
    icon: CheckCircle,
    colorClass: "text-green-500",
    label: "Done",
  },
};

function getNextStatus(current: TaskStatus): TaskStatus | null {
  const idx = TASK_STATUS_VALUES.indexOf(current);
  if (idx < TASK_STATUS_VALUES.length - 1) {
    return TASK_STATUS_VALUES[idx + 1];
  }
  return null;
}

export function TaskStatusBadge({
  status,
  taskId,
}: {
  status: TaskStatus;
  taskId: Id<"tasks">;
}) {
  const { mutateAsync: updateStatus } = useMutation({
    mutationFn: useConvexMutation(api.tasks.mutations.updateStatus),
  });

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const nextStatus = getNextStatus(status);
  const handleClick = async () => {
    /* v8 ignore next -- defensive guard: button is disabled when nextStatus is null */
    if (!nextStatus) return;
    await updateStatus({ taskId, status: nextStatus });
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!nextStatus}
      className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition hover:bg-primary/5 disabled:cursor-default disabled:opacity-70 ${config.colorClass}`}
      title={nextStatus ? `Mark as ${STATUS_CONFIG[nextStatus].label}` : config.label}
    >
      <Icon className="h-4 w-4" />
      <span>{config.label}</span>
    </button>
  );
}
