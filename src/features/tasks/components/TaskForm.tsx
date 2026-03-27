import { useForm } from "@tanstack/react-form";
import { useConvexMutation, convexQuery } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { TASK_TITLE_MAX_LENGTH } from "@/shared/schemas/tasks";
import type { Id } from "~/convex/_generated/dataModel";

export function TaskForm() {
  const { mutateAsync: createTask } = useMutation({
    mutationFn: useConvexMutation(api.tasks.mutations.create),
  });
  const { mutateAsync: createInProject } = useMutation({
    mutationFn: useConvexMutation(api.tasks.mutations.createInProject),
  });

  const { data: projects } = useQuery(
    convexQuery(api.projects.queries.list, { status: "active" }),
  );

  const form = useForm({
    defaultValues: { title: "", projectId: "" },
    onSubmit: async ({ value }) => {
      const title = value.title.trim();
      /* v8 ignore start -- projectId selection requires Radix Select portal not testable in jsdom */
      if (value.projectId && value.projectId !== "__none__") {
        await createInProject({
          title,
          projectId: value.projectId as Id<"projects">,
        });
      } else {
      /* v8 ignore stop */
        await createTask({ title });
      }
      form.reset();
    },
  });

  const hasProjects = projects && projects.length > 0;

  return (
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
            maxLength={TASK_TITLE_MAX_LENGTH}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            className="flex-1 bg-transparent"
          />
        )}
      />
      {/* v8 ignore start -- Radix Select portal interactions not testable in jsdom */}
      {hasProjects && (
        <form.Field
          name="projectId"
          children={(field) => (
            <Select
              value={field.state.value || "__none__"}
              onValueChange={(val) =>
                field.handleChange(val === "__none__" ? "" : val)
              }
            >
              <SelectTrigger className="w-[160px]" aria-label="Project">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No project</SelectItem>
                {projects?.map((p: any) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      )}
      {/* v8 ignore stop */}
      <Button type="submit" size="sm">
        Add
      </Button>
    </form>
  );
}
