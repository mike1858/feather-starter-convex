import { useState } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "~/convex/_generated/api";
import { TaskForm } from "./TaskForm";
import { TaskList } from "./TaskList";
import { TaskDetailPanel } from "./TaskDetailPanel";
import type { Id } from "~/convex/_generated/dataModel";

export function TasksPage() {
  const { data: tasks = [] } = useQuery(
    convexQuery(api.tasks.queries.myTasks, {}),
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

      <TaskForm />

      <TaskList
        tasks={tasks}
        emptyMessage="No tasks yet. Create one above!"
        onTaskClick={(taskId) => setSelectedTaskId(taskId)}
      />

      {/* v8 ignore start -- TaskDetailPanel opens via task click; Radix Dialog portal not testable in jsdom */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
      />
      {/* v8 ignore stop */}
    </div>
  );
}
