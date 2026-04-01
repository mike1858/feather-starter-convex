import { useState } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { api } from "~/convex/_generated/api";
import { TaskForm } from "./TaskForm";
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

export function TasksPage() {
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

  // Default to "me" filter when no assignee filter is set (My Tasks view)
  if (!search.assignee) filterArgs.assigneeId = "me";

  const { data: tasks = [] } = useQuery(
    convexQuery(api.tasks.queries.listFiltered, filterArgs),
  );

  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(
    null,
  );

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-primary">My Tasks</h1>
        <p className="text-sm text-primary/60">Your assigned tasks across all projects.</p>
      </div>

      <TaskFilterBar />

      <TaskForm />

      <TaskList
        tasks={tasks}
        emptyMessage="No tasks yet. Create one above!"
        onTaskClick={(taskId) => setSelectedTaskId(taskId)}
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
