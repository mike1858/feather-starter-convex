# Phase 3: Tasks - Research

**Researched:** 2026-03-10
**Domain:** Task CRUD, visibility/assignment logic, drag-reorder, Convex backend + React frontend
**Confidence:** HIGH

## Summary

Phase 3 builds the core task management domain: a `tasks` table in Convex with CRUD mutations, status workflow (todo/in_progress/done), visibility (private/shared), assignment to team members, drag-reorder via position field, and three frontend views (My Tasks, Team Pool, sidebar nav updates). This is a vertical slice following the project's established entity pattern (Zod schema -> Convex table -> backend functions -> frontend feature -> route -> wiring).

The project already has all necessary infrastructure: `zCustomMutation` with Zod4 for validated mutations, `convexQuery`/`useConvexMutation` patterns for frontend data, TanStack Form for input, `useDoubleCheck` for delete confirmation, co-located test patterns with `convex-test` and Testing Library. The main new dependency is `@dnd-kit/core` + `@dnd-kit/sortable` for drag-reorder (TASK-10).

**Primary recommendation:** Follow the exact entity creation pattern from CLAUDE.md. Use fractional indexing (or simple float position) for drag-reorder. Design Convex indexes carefully for the two main query patterns: "my assigned tasks" and "unassigned shared tasks."

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TASK-01 | Create task with title, optional description (markdown), priority (boolean) | Zod schema + zCustomMutation pattern; no markdown editor needed (plain textarea, render later) |
| TASK-02 | View tasks in "My Tasks" list | Convex query with index on `assigneeId`; frontend list component |
| TASK-03 | Edit task title, description, priority | zCustomMutation with partial update pattern |
| TASK-04 | Delete task with confirmation | `useDoubleCheck` hook already exists in project |
| TASK-05 | Status workflow: todo -> in_progress -> done | Zod enum for status; mutation that validates transitions |
| TASK-06 | Quick task (no project) is private by default | `visibility` field defaults to "private"; `projectId` is optional |
| TASK-07 | Auto-flip to shared when assigned to another user | Mutation logic: if `assigneeId !== creatorId`, set `visibility = "shared"` |
| TASK-08 | Assign task to any team member | Users query to list team members; `assigneeId` field on task |
| TASK-09 | Unassigned tasks in "Team Pool" view | Query: `visibility === "shared" && assigneeId === undefined` |
| TASK-10 | Drag-reorder tasks within a list (position field) | `@dnd-kit/sortable` + float position field in Convex |
| VIEW-01 | My Tasks view | Route + feature component querying assigned tasks |
| VIEW-02 | Team Pool view | Route + feature component querying unassigned shared tasks |
| VIEW-06 | Sidebar with My Tasks, Team Pool, Projects sections | Update `navItems` in `src/shared/nav.ts` |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| convex | ^1.32.0 | Backend database + real-time queries | Project's backend |
| convex-helpers | ^0.1.114 | `zCustomMutation`, `zodToConvex` | Zod4-validated mutations |
| zod | ^4.3.6 | Schema definitions | Single source of truth for validation |
| @tanstack/react-query | ^5.90.21 | Frontend data fetching | `convexQuery` wrapper |
| @tanstack/react-form | ^1.28.4 | Form state + validation | Project standard for forms |
| @tanstack/react-router | ^1.166.3 | Routing | File-based routes |
| lucide-react | ^0.577.0 | Icons | Already used throughout |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit/core | ^6.3 | Drag-and-drop engine | Foundation for sortable lists |
| @dnd-kit/sortable | ^10.0 | Sortable list preset | TASK-10 drag-reorder |
| @dnd-kit/utilities | ^3.2 | CSS transform utilities | Helper for drag transforms |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit | hello-pangea/dnd | Simpler API but less flexible; dnd-kit is more actively maintained and better for custom UIs |
| @dnd-kit | HTML5 native drag | No touch support, poor accessibility, limited styling |
| Float position | Fractional indexing (fractional-indexing lib) | Fractional indexing avoids position collisions but adds complexity; float is fine for single-user reorder |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Architecture Patterns

### Recommended Project Structure
```
src/shared/schemas/
  tasks.ts                    # Zod schemas: taskStatus, taskVisibility, createTask, updateTask

convex/
  schema.ts                   # Add tasks table with zodToConvex validators
  tasks/
    queries.ts                # myTasks, teamPool, listTeamMembers
    mutations.ts              # create, update, delete, updateStatus, assign, reorder
    queries.test.ts           # Backend query tests
    mutations.test.ts         # Backend mutation tests

src/features/tasks/
  components/
    TasksPage.tsx             # "My Tasks" page component
    TeamPoolPage.tsx          # "Team Pool" page component
    TaskList.tsx              # Reusable sortable task list
    TaskItem.tsx              # Single task row (status, title, priority, assignee)
    TaskForm.tsx              # Create/edit task form (inline or modal)
    TaskStatusBadge.tsx       # Status indicator with click-to-advance
  hooks/
    index.ts                  # Task-specific hooks if needed
  index.ts                    # Barrel exports
  tasks.test.tsx              # Frontend component tests

src/routes/_app/_auth/dashboard/
  _layout.tasks.tsx           # My Tasks route (thin wrapper)
  _layout.team-pool.tsx       # Team Pool route (thin wrapper)
```

### Pattern 1: Convex Table Schema with Indexes
**What:** Define the tasks table with indexes optimized for the two primary query patterns.
**When to use:** Always for this phase.
**Example:**
```typescript
// convex/schema.ts addition
import { zodToConvex } from "convex-helpers/server/zod4";
import { taskStatusSchema, taskVisibilitySchema } from "../src/shared/schemas/tasks";

// In defineSchema:
tasks: defineTable({
  title: v.string(),
  description: v.optional(v.string()),
  priority: v.boolean(),                    // true = high priority
  status: zodToConvex(taskStatusSchema),    // "todo" | "in_progress" | "done"
  visibility: zodToConvex(taskVisibilitySchema), // "private" | "shared"
  creatorId: v.id("users"),
  assigneeId: v.optional(v.id("users")),
  projectId: v.optional(v.id("projects")),  // optional, for future Phase 4
  position: v.number(),                      // float for drag-reorder
})
  .index("by_assignee", ["assigneeId"])
  .index("by_visibility", ["visibility"])
  .index("by_creator", ["creatorId"])
  .index("by_assignee_status", ["assigneeId", "status"])
```

### Pattern 2: Zod Schema as Single Source of Truth
**What:** Define task validation in Zod, derive Convex validators via `zodToConvex`.
**When to use:** For all user-input fields.
**Example:**
```typescript
// src/shared/schemas/tasks.ts
import { z } from "zod";

export const TASK_STATUS_VALUES = ["todo", "in_progress", "done"] as const;
export const taskStatus = z.enum(TASK_STATUS_VALUES);
export type TaskStatus = z.infer<typeof taskStatus>;

export const TASK_VISIBILITY_VALUES = ["private", "shared"] as const;
export const taskVisibility = z.enum(TASK_VISIBILITY_VALUES);
export type TaskVisibility = z.infer<typeof taskVisibility>;

export const TASK_TITLE_MAX_LENGTH = 200;
export const taskTitle = z.string().min(1).max(TASK_TITLE_MAX_LENGTH).trim();

export const TASK_DESCRIPTION_MAX_LENGTH = 5000;
export const taskDescription = z.string().max(TASK_DESCRIPTION_MAX_LENGTH).optional();

export const createTaskInput = z.object({
  title: taskTitle,
  description: taskDescription,
  priority: z.boolean().default(false),
});
```

### Pattern 3: Mutation with Auto-Flip Visibility
**What:** When assigning a task to someone other than the creator, auto-set visibility to "shared."
**When to use:** TASK-07 requirement.
**Example:**
```typescript
// convex/tasks/mutations.ts
export const assignTask = zMutation({
  args: {
    taskId: v.id("tasks"),
    assigneeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const patch: Record<string, unknown> = { assigneeId: args.assigneeId };
    // Auto-flip: assigning to another user makes task shared
    if (args.assigneeId && args.assigneeId !== task.creatorId) {
      patch.visibility = "shared";
    }
    await ctx.db.patch(args.taskId, patch);
  },
});
```

### Pattern 4: Position-Based Reorder
**What:** Use float position values for drag-reorder. When moving item between two others, use midpoint.
**When to use:** TASK-10.
**Example:**
```typescript
// When creating: position = Date.now() (monotonically increasing)
// When reordering: position = (prevPosition + nextPosition) / 2
// Edge cases:
//   Moving to top: position = firstItem.position - 1000
//   Moving to bottom: position = lastItem.position + 1000

export const reorderTask = mutation({
  args: {
    taskId: v.id("tasks"),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;
    await ctx.db.patch(args.taskId, { position: args.newPosition });
  },
});
```

### Pattern 5: Query Patterns for Views
**What:** Two primary queries for My Tasks and Team Pool.
**Example:**
```typescript
// My Tasks: tasks assigned to current user
export const myTasks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("tasks")
      .withIndex("by_assignee", (q) => q.eq("assigneeId", userId))
      .collect();
  },
});

// Team Pool: unassigned shared tasks
export const teamPool = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    // Unassigned tasks that are shared (not private)
    const sharedTasks = await ctx.db
      .query("tasks")
      .withIndex("by_visibility", (q) => q.eq("visibility", "shared"))
      .collect();
    return sharedTasks.filter((t) => !t.assigneeId);
  },
});
```

### Pattern 6: Frontend Data Flow
**What:** Use `convexQuery` for real-time queries, `useConvexMutation` for mutations.
**Example:**
```typescript
// Reading tasks
const { data: tasks } = useQuery(convexQuery(api.tasks.queries.myTasks, {}));

// Creating a task
const { mutateAsync: createTask } = useMutation({
  mutationFn: useConvexMutation(api.tasks.mutations.create),
});
```

### Anti-Patterns to Avoid
- **Don't duplicate Zod validation in Convex validators:** Use `zodToConvex()` to derive, not manual `v.union(v.literal(...))`.
- **Don't use string comparison for status transitions:** Use an ordered array/map to validate `todo -> in_progress -> done`.
- **Don't filter in frontend what should be indexed:** Use Convex indexes for primary query patterns; only use `.filter()` for secondary criteria on small result sets.
- **Don't put position calculation in backend only:** Calculate new position on frontend (knows sibling positions), send final value to backend.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag and drop | Custom pointer event tracking | @dnd-kit/sortable | Touch support, accessibility, keyboard nav, animation |
| Delete confirmation | Custom modal state | `useDoubleCheck` hook | Already exists in project, battle-tested pattern |
| Form validation | Manual onChange + state | @tanstack/react-form + Zod validators | Project standard, consistent with Settings/Onboarding |
| Real-time data sync | Manual refetch/polling | Convex reactive queries via `convexQuery` | Built-in real-time; queries auto-update |

## Common Pitfalls

### Pitfall 1: Convex Index Design for Compound Filters
**What goes wrong:** Creating too many indexes or using `.filter()` on large datasets when an index would work.
**Why it happens:** Convex indexes only support prefix equality + optional range on last field. Can't do `WHERE assigneeId = X AND status = Y` without a compound index.
**How to avoid:** Create `by_assignee_status` compound index for "my tasks filtered by status." For Team Pool (unassigned + shared), index on `visibility` then filter `!assigneeId` in JS since unassigned tasks should be a small set.
**Warning signs:** Slow queries, full table scans mentioned in Convex dashboard.

### Pitfall 2: Position Collisions After Many Reorders
**What goes wrong:** Float midpoint calculation eventually loses precision after ~50+ reorders between the same two items.
**Why it happens:** IEEE 754 double precision has ~15 significant digits.
**How to avoid:** On the frontend, after a reorder, if the gap between adjacent positions is < 1, trigger a "normalize" mutation that reassigns evenly spaced positions to all items in the list (e.g., 1000, 2000, 3000...).
**Warning signs:** Items appearing in wrong order, positions like 1000.00000000001.

### Pitfall 3: Visibility Auto-Flip Edge Cases
**What goes wrong:** Task assigned to another user becomes "shared," but when un-assigned (set to null), it stays shared instead of reverting.
**Why it happens:** The requirement says "auto-flips to shared when assigned to another user" but doesn't mention reverting.
**How to avoid:** Decide upfront: once shared, always shared? Or revert to private when unassigned? The requirement (TASK-07) only says "auto-flips to shared" -- implement as one-way flip. Don't auto-revert.
**Warning signs:** User confusion about why their unassigned task appears in Team Pool.

### Pitfall 4: Route Naming with TanStack Router
**What goes wrong:** New routes don't appear or conflict with existing layout routes.
**Why it happens:** TanStack Router uses file-based routing with specific naming conventions. The `_layout` prefix creates layout routes.
**How to avoid:** Follow existing pattern: `_layout.tasks.tsx` and `_layout.team-pool.tsx` under `dashboard/` directory. These become child routes of the dashboard layout (which provides the Navigation component).
**Warning signs:** 404 on new routes, layout not rendering.

### Pitfall 5: Auth Guard Pattern
**What goes wrong:** Mutations throw or behave unexpectedly when user is not authenticated.
**Why it happens:** Existing pattern uses early return (`if (!userId) return`) not throws.
**How to avoid:** Follow existing pattern: `return` (not throw) for queries, `return` for mutations. The `_auth.tsx` layout already guards routes -- backend just needs to handle the edge case gracefully.
**Warning signs:** Unhandled errors in production.

### Pitfall 6: Listing Team Members Without Org Layer
**What goes wrong:** TASK-08 requires assigning to "any team member" but there's no org/team table.
**Why it happens:** Org layer is explicitly deferred to v3.0+.
**How to avoid:** For v2.0, "team members" = all users in the system. Create a simple `listUsers` query that returns all users (since this is designed for a 2-person team). Add a comment noting this should be org-scoped in v3.0.
**Warning signs:** Privacy concerns if deployed publicly (mitigated: this is a small-team tool).

## Code Examples

### Zod Schema Pattern (matching project conventions)
```typescript
// src/shared/schemas/tasks.ts
import { z } from "zod";

export const TASK_STATUS_VALUES = ["todo", "in_progress", "done"] as const;
export const taskStatus = z.enum(TASK_STATUS_VALUES);

export const TASK_VISIBILITY_VALUES = ["private", "shared"] as const;
export const taskVisibility = z.enum(TASK_VISIBILITY_VALUES);

export const TASK_TITLE_MAX_LENGTH = 200;
export const taskTitle = z.string().min(1).max(TASK_TITLE_MAX_LENGTH).trim();

export const taskDescription = z.string().max(5000).optional();
```

### Backend Test Pattern (matching convex-test conventions)
```typescript
// convex/tasks/mutations.test.ts
import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

describe("create", () => {
  test("creates a task with default values", async ({ client, userId, testClient }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "My task",
    });
    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect()
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("My task");
    expect(tasks[0].status).toBe("todo");
    expect(tasks[0].visibility).toBe("private");
    expect(tasks[0].creatorId).toBe(userId);
  });
});
```

### Frontend Query + Mutation Pattern
```typescript
// Following SettingsPage.tsx pattern
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "~/convex/_generated/api";

// In component:
const { data: tasks = [] } = useQuery(convexQuery(api.tasks.queries.myTasks, {}));
const { mutateAsync: createTask } = useMutation({
  mutationFn: useConvexMutation(api.tasks.mutations.create),
});
```

### dnd-kit Sortable List Pattern
```typescript
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableTaskItem({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task._id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskItem task={task} />
    </div>
  );
}

function TaskList({ tasks }: { tasks: Task[] }) {
  const sorted = [...tasks].sort((a, b) => a.position - b.position);
  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sorted.map(t => t._id)} strategy={verticalListSortingStrategy}>
        {sorted.map(task => <SortableTaskItem key={task._id} task={task} />)}
      </SortableContext>
    </DndContext>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit or hello-pangea/dnd | 2023 (rbd deprecated) | Must use dnd-kit or fork |
| Integer position for order | Float/fractional indexing | Ongoing | Avoids rewriting all positions on every reorder |
| convex-helpers Zod (v1-3) | convex-helpers/server/zod4 | With Zod 4 | Project already uses zod4 path |

**Deprecated/outdated:**
- react-beautiful-dnd: Deprecated by Atlassian, replaced by @atlaskit/pragmatic-drag-and-drop
- convex-helpers `zCustomMutation` from `convex-helpers/server/zod`: Old path, project uses `zod4` subpath

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 + convex-test 0.0.41 (backend) / Testing Library (frontend) |
| Config file | vitest implicit config in package.json (`npm test` -> `vitest run`) |
| Quick run command | `npm test -- --reporter=verbose` |
| Full suite command | `npm test` (includes coverage) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TASK-01 | Create task with title/description/priority | unit | `npx vitest run convex/tasks/mutations.test.ts -t "create" -x` | Wave 0 |
| TASK-02 | My Tasks list query | unit | `npx vitest run convex/tasks/queries.test.ts -t "myTasks" -x` | Wave 0 |
| TASK-03 | Edit task fields | unit | `npx vitest run convex/tasks/mutations.test.ts -t "update" -x` | Wave 0 |
| TASK-04 | Delete with confirmation | unit | `npx vitest run convex/tasks/mutations.test.ts -t "delete" -x` | Wave 0 |
| TASK-05 | Status workflow transitions | unit | `npx vitest run convex/tasks/mutations.test.ts -t "updateStatus" -x` | Wave 0 |
| TASK-06 | Quick task defaults private | unit | `npx vitest run convex/tasks/mutations.test.ts -t "private" -x` | Wave 0 |
| TASK-07 | Auto-flip visibility on assign | unit | `npx vitest run convex/tasks/mutations.test.ts -t "assign" -x` | Wave 0 |
| TASK-08 | Assign to team member | unit | `npx vitest run convex/tasks/mutations.test.ts -t "assign" -x` | Wave 0 |
| TASK-09 | Team Pool query | unit | `npx vitest run convex/tasks/queries.test.ts -t "teamPool" -x` | Wave 0 |
| TASK-10 | Drag-reorder position update | unit | `npx vitest run convex/tasks/mutations.test.ts -t "reorder" -x` | Wave 0 |
| VIEW-01 | My Tasks page renders | unit | `npx vitest run src/features/tasks/tasks.test.tsx -t "My Tasks" -x` | Wave 0 |
| VIEW-02 | Team Pool page renders | unit | `npx vitest run src/features/tasks/tasks.test.tsx -t "Team Pool" -x` | Wave 0 |
| VIEW-06 | Sidebar nav items present | unit | `npx vitest run src/features/tasks/tasks.test.tsx -t "nav" -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test` (full suite with coverage)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/shared/schemas/tasks.ts` -- Zod schemas for task domain
- [ ] `convex/tasks/queries.ts` -- backend queries
- [ ] `convex/tasks/mutations.ts` -- backend mutations
- [ ] `convex/tasks/queries.test.ts` -- covers TASK-02, TASK-09
- [ ] `convex/tasks/mutations.test.ts` -- covers TASK-01, TASK-03 through TASK-08, TASK-10
- [ ] `src/features/tasks/tasks.test.tsx` -- covers VIEW-01, VIEW-02, VIEW-06
- [ ] `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` install -- for TASK-10
- [ ] `public/locales/en/tasks.json` + `public/locales/es/tasks.json` -- i18n translations

## Open Questions

1. **Team member listing without org layer**
   - What we know: No org/team table exists. Decision to skip org layer is locked for v2.0.
   - What's unclear: Should "all users" be the team, or should there be an explicit team-invite flow?
   - Recommendation: Use "all users" query. This is a 2-person team tool. Add `// TODO: scope to org in v3.0` comment.

2. **Markdown rendering for task descriptions**
   - What we know: TASK-01 says "optional description (markdown)."
   - What's unclear: Does this mean render markdown in the UI, or just store markdown text?
   - Recommendation: Store as plain text for now. Markdown rendering can be added later (it's a display concern, not a data concern). The textarea stores whatever the user types. If markdown rendering is needed, add `react-markdown` in a later phase.

3. **Should sidebar navigation be restructured?**
   - What we know: Current nav is a flat list of links in a horizontal tab bar. VIEW-06 asks for "My Tasks, Team Pool, Projects sections."
   - What's unclear: Does "sections" mean grouped sidebar, or just additional nav items in the existing horizontal nav?
   - Recommendation: Add nav items to the existing `navItems` array for now (My Tasks, Team Pool). The existing horizontal tab pattern supports this. A full sidebar redesign is out of scope for task CRUD.

## Sources

### Primary (HIGH confidence)
- Project codebase: `convex/schema.ts`, `convex/users/mutations.ts`, `convex/test.setup.ts` -- established patterns
- Project codebase: `src/features/settings/components/SettingsPage.tsx` -- form + mutation patterns
- Project codebase: `src/shared/schemas/billing.ts`, `src/shared/schemas/username.ts` -- Zod schema patterns
- Project codebase: `CLAUDE.md` -- entity creation recipe

### Secondary (MEDIUM confidence)
- [dnd-kit official docs](https://docs.dndkit.com/) -- sortable list patterns
- [dnd-kit website](https://dndkit.com/) -- current version info

### Tertiary (LOW confidence)
- Web search for dnd-kit version numbers (^6.3 core, ^10.0 sortable) -- verify at install time

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all core libraries already in project; dnd-kit is the clear standard
- Architecture: HIGH -- follows established entity pattern exactly
- Pitfalls: HIGH -- based on direct codebase analysis of existing patterns
- Drag-reorder: MEDIUM -- dnd-kit API is stable but exact version numbers should be verified at install

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable domain, no fast-moving dependencies)
