import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { api } from "~/convex/_generated/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { Button } from "@/ui/button";
import { TASK_STATUS_VALUES } from "@/shared/schemas/tasks";

interface FilterSearch {
  status?: string;
  priority?: string;
  assignee?: string;
  project?: string;
}

/** Task filter bar with status, priority, assignee, and project dropdowns. */
export function TaskFilterBar() {
  const search = useSearch({ strict: false }) as FilterSearch;
  const navigate = useNavigate();

  const { data: users = [] } = useQuery(
    convexQuery(api.tasks.queries.listUsers, {}),
  );
  const { data: projects = [] } = useQuery(
    convexQuery(api.projects.queries.list, {}),
  );

  const hasActiveFilters =
    search.status || search.priority || search.assignee || search.project;

  const updateFilter = (key: string, value: string | undefined) => {
    void navigate({
      search: ((prev: Record<string, unknown>) => {
        const next = { ...prev, [key]: value };
        for (const k of Object.keys(next)) {
          if (!next[k]) delete next[k];
        }
        return next;
      }) as never,
    });
  };

  const clearFilters = () => {
    void navigate({ search: {} as never });
  };

  const formatStatus = (s: string): string => {
    if (s === "in_progress") return "In Progress";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="task-filter-bar">
      <Select
        value={search.status ?? "all"}
        onValueChange={(v) =>
          updateFilter("status", v === "all" ? undefined : v)
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {TASK_STATUS_VALUES.map((s) => (
            <SelectItem key={s} value={s}>
              {formatStatus(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={search.priority ?? "all"}
        onValueChange={(v) =>
          updateFilter("priority", v === "all" ? undefined : v)
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priority</SelectItem>
          <SelectItem value="high">High Priority</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={search.assignee ?? "all"}
        onValueChange={(v) =>
          updateFilter("assignee", v === "all" ? undefined : v)
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          <SelectItem value="me">Assigned to Me</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {users.map((u: { _id: string; name?: string; username?: string; email?: string }) => (
            <SelectItem key={u._id} value={u._id}>
              {u.name ?? u.username ?? u.email ?? u._id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={search.project ?? "all"}
        onValueChange={(v) =>
          updateFilter("project", v === "all" ? undefined : v)
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {projects.map((p: { _id: string; name: string }) => (
            <SelectItem key={p._id} value={p._id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
