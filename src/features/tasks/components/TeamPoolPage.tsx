import { useState } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { api } from "~/convex/_generated/api";
import { TaskList } from "./TaskList";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { TaskFilterBar } from "./TaskFilterBar";
import type { Id } from "~/convex/_generated/dataModel";
import type { TaskStatus } from "@/shared/schemas/tasks";

interface FilterSearch {
  status?: string;
  priority?: string;
  assignee?: string;
  project?: string;
}

export function TeamPoolPage() {
  const search = useSearch({ strict: false }) as FilterSearch;

  // Build query args from URL params
  const filterArgs: {
    status?: TaskStatus;
    priority?: boolean;
    assigneeId?: string;
    projectId?: Id<"projects">;
  } = {};
  if (search.status) filterArgs.status = search.status as TaskStatus;
  if (search.priority)
    filterArgs.priority = search.priority === "high";
  if (search.assignee) filterArgs.assigneeId = search.assignee;
  if (search.project)
    filterArgs.projectId = search.project as Id<"projects">;

  // Default to "unassigned" filter when no assignee filter is set (Team Pool view)
  if (!search.assignee) filterArgs.assigneeId = "unassigned";

  const { data: tasks = [] } = useQuery(
    convexQuery(api.tasks.queries.listFiltered, filterArgs),
  );
  const { data: currentUser } = useQuery(
    convexQuery(api.users.queries.getCurrentUser, {}),
  );
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(
    null,
  );
  const handleTaskClick = (taskId: Id<"tasks">) => setSelectedTaskId(taskId);

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-primary">Team Pool</h1>
        <p className="text-sm text-primary/60">Unassigned tasks available for the team.</p>
      </div>

      <TaskFilterBar />

      <TaskList
        tasks={tasks}
        emptyMessage="No tasks in the pool."
        showGrab
        currentUserId={currentUser?._id as Id<"users"> | undefined}
        onTaskClick={handleTaskClick}
      />

      <TaskDetailPanel
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
      />
    </div>
  );
}
