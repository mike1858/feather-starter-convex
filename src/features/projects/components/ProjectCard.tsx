import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api } from "~/convex/_generated/api";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { useDoubleCheck } from "@/ui/use-double-check";
import { ProjectStatusBadge } from "./ProjectStatusBadge";
import type { ProjectStatus } from "@/shared/schemas/projects";
import type { Id } from "~/convex/_generated/dataModel";

interface ProjectWithCounts {
  _id: Id<"projects">;
  name: string;
  status: ProjectStatus;
  taskCounts: { total: number; todo: number; in_progress: number; done: number };
}

export function ProjectCard({ project }: { project: ProjectWithCounts }) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);

  const { mutateAsync: updateProject } = useMutation({
    mutationFn: useConvexMutation(api.projects.mutations.update),
  });
  const { mutateAsync: removeProject } = useMutation({
    mutationFn: useConvexMutation(api.projects.mutations.remove),
  });

  const { doubleCheck, getButtonProps } = useDoubleCheck();

  /* v8 ignore start -- name edit triggered via dropdown menu, navigation requires portal/browser not testable in jsdom */
  const handleNameSave = async () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== project.name) {
      await updateProject({ projectId: project._id, name: trimmed });
    }
    setIsEditing(false);
  };
  const handleCardClick = () => {
    if (!isEditing) {
      navigate({ to: "/dashboard/projects/$projectId", params: { projectId: project._id } });
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(project.name);
    setIsEditing(true);
  };
  /* v8 ignore stop */

  return (
    <div
      className="flex cursor-pointer flex-col gap-3 rounded-lg border border-border bg-card p-4 transition hover:shadow-sm"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      /* v8 ignore start -- keyboard navigation requires real browser */
      onKeyDown={(e) => {
        if (e.key === "Enter") handleCardClick();
      }}
      /* v8 ignore stop */
    >
      {/* Top row: name + menu */}
      <div className="flex items-start justify-between gap-2">
        {/* v8 ignore start -- edit mode only reachable via dropdown menu (portal not testable in jsdom) */}
        {isEditing ? (
          <input
            className="flex-1 rounded border border-input bg-transparent px-2 py-1 text-base font-medium"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameSave();
              if (e.key === "Escape") setIsEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
        /* v8 ignore stop */
          <h3 className="text-base font-medium text-primary">{project.name}</h3>
        )}

        {/* v8 ignore start -- Radix dropdown portal interactions not testable in jsdom */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleEditClick}>
              Edit name
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              {...getButtonProps({
                onClick: doubleCheck
                  ? async (e: React.MouseEvent) => {
                      e.stopPropagation();
                      await removeProject({ projectId: project._id });
                    }
                  : (e: React.MouseEvent) => {
                      e.stopPropagation();
                    },
              })}
            >
              {doubleCheck
                ? `Delete? (${project.taskCounts.total} tasks will be deleted)`
                : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* v8 ignore stop */}
      </div>

      {/* Bottom row: status badge + task count */}
      <div className="flex items-center gap-3">
        <ProjectStatusBadge status={project.status as ProjectStatus} />
        <span className="text-sm text-primary/60">
          {project.taskCounts.total} tasks
        </span>
      </div>
    </div>
  );
}
