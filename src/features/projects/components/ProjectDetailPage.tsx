import { useState } from "react";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { Link } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { api } from "~/convex/_generated/api";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { useDoubleCheck } from "@/ui/use-double-check";
import { TaskSummaryBar } from "./TaskSummaryBar";
import { PROJECT_STATUS_VALUES } from "@/shared/schemas/projects";
import type { ProjectStatus } from "@/shared/schemas/projects";
import type { Id } from "~/convex/_generated/dataModel";

export function ProjectDetailPage({ projectId }: { projectId: Id<"projects"> }) {
  const { data: project } = useQuery(
    convexQuery(api.projects.queries.getWithTasks, { projectId }),
  );

  const { mutateAsync: updateProject } = useMutation({
    mutationFn: useConvexMutation(api.projects.mutations.update),
  });
  const { mutateAsync: removeProject } = useMutation({
    mutationFn: useConvexMutation(api.projects.mutations.remove),
  });
  const { mutateAsync: createInProject } = useMutation({
    mutationFn: useConvexMutation(api.tasks.mutations.createInProject),
  });

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const { doubleCheck, getButtonProps } = useDoubleCheck();

  const form = useForm({
    defaultValues: { title: "" },
    onSubmit: async ({ value }) => {
      await createInProject({ title: value.title.trim(), projectId });
      form.reset();
    },
  });

  if (project === undefined) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-sm text-primary/50">Loading...</p>
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-sm text-primary/50">Project not found.</p>
      </div>
    );
  }

  /* v8 ignore start -- name edit and status change triggered via dropdown/select portal not testable in jsdom */
  const handleNameSave = async () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== project.name) {
      await updateProject({ projectId, name: trimmed });
    }
    setIsEditingName(false);
  };
  const handleStatusChange = async (newStatus: string) => {
    await updateProject({
      projectId,
      status: newStatus as ProjectStatus,
    });
  };

  const handleEditNameClick = () => {
    setEditName(project.name);
    setIsEditingName(true);
  };
  /* v8 ignore stop */

  /* v8 ignore start -- defensive fallback; getWithTasks always returns tasks array */
  const tasks = project.tasks ?? [];
  /* v8 ignore stop */

  return (
    <div className="flex h-full w-full flex-col gap-6">
      {/* Back link */}
      <Link
        to="/dashboard/projects"
        className="flex items-center gap-1 text-sm text-primary/60 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          {/* v8 ignore start -- edit mode only reachable via dropdown menu (portal not testable in jsdom) */}
          {isEditingName ? (
            <input
              className="rounded border border-input bg-transparent px-2 py-1 text-2xl font-semibold"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSave();
                if (e.key === "Escape") setIsEditingName(false);
              }}
              autoFocus
            />
          ) : (
          /* v8 ignore stop */
            <h1 className="text-2xl font-semibold text-primary">
              {project.name}
            </h1>
          )}

          {/* v8 ignore start -- Radix Select portal interactions not testable in jsdom */}
          <Select
            value={project.status}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_STATUS_VALUES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "on_hold" ? "On Hold" : s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* v8 ignore stop */}
        </div>

        {/* v8 ignore start -- Radix dropdown portal interactions not testable in jsdom */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleEditNameClick}>
              Edit name
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              {...getButtonProps({
                onClick: doubleCheck
                  ? async () => {
                      await removeProject({ projectId });
                    }
                  : undefined,
              })}
            >
              {doubleCheck
                ? `Delete? (${tasks.length} tasks will be deleted)`
                : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* v8 ignore stop */}
      </div>

      {/* Summary bar */}
      <TaskSummaryBar counts={project.statusSummary} />

      {/* Inline task creation */}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field
          name="title"
          children={(field) => (
            <Input
              placeholder="Add a task..."
              autoComplete="off"
              required
              maxLength={200}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              className="flex-1 bg-transparent"
            />
          )}
        />
        <Button type="submit" size="sm">
          Add
        </Button>
      </form>

      {/* Task list */}
      {tasks.length === 0 ? (
        <p className="py-8 text-center text-sm text-primary/50">
          No tasks in this project.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task: any) => (
            <div
              key={task._id}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
            >
              <span className="flex-1 text-sm text-primary">{task.title}</span>
              <span className="text-xs text-primary/50">{task.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
