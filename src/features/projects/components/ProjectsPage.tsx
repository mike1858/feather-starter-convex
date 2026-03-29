import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { api } from "~/convex/_generated/api";
import { PROJECT_STATUS_VALUES } from "@/shared/schemas/projects";
import type { ProjectStatus } from "@/shared/schemas/projects";
import { ProjectForm } from "./ProjectForm";
import { ProjectCard } from "./ProjectCard";

const STATUS_TABS = [
  { label: "All", value: undefined },
  ...PROJECT_STATUS_VALUES.map((s) => ({
    label: s === "on_hold" ? "On Hold" : s.charAt(0).toUpperCase() + s.slice(1),
    value: s as ProjectStatus,
  })),
] as const;

export function ProjectsPage() {
  const search = useSearch({ strict: false }) as { status?: string };
  const navigate = useNavigate();
  const filterStatus = search.status as ProjectStatus | undefined;

  const { data: projects = [] } = useQuery(
    convexQuery(api.projects.queries.list, {
      status: filterStatus || undefined,
    }),
  );

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-primary">Projects</h1>
        <p className="text-sm text-primary/60">
          Manage your projects and their tasks.
        </p>
      </div>

      <ProjectForm />

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={`px-3 py-2 text-sm font-medium transition ${
              (filterStatus ?? undefined) === tab.value
                ? "border-b-2 border-primary text-primary"
                : "text-primary/60 hover:text-primary"
            }`}
            /* v8 ignore start -- navigation requires URL search params not available in jsdom catch-all route */
            onClick={() =>
              navigate({
                search: (tab.value ? { status: tab.value } : {}) as any,
              })
            }
            /* v8 ignore stop */
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Project card grid */}
      {projects.length === 0 ? (
        <p className="py-8 text-center text-sm text-primary/50">
          {}
          {filterStatus
            ? `No ${filterStatus === "on_hold" ? "on hold" : filterStatus} projects.`
            : "No projects yet. Create one above!"}
          {}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: any) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
