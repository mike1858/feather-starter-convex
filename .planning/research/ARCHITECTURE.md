# Architecture Patterns

**Domain:** Composable task management system (CalmDo Core) on existing SaaS starter kit
**Researched:** 2026-03-10

## Recommended Architecture

CalmDo Core adds a **composable feature block** layer to the existing feature-folder + Convex architecture. The key insight: the existing architecture already separates concerns cleanly (frontend feature folders, backend domain folders, shared schemas). CalmDo features slot into this structure as new feature folders and backend domains, with two additions: a **config layer** that defines which features are active and how they relate, and **shared CalmDo infrastructure** (audit fields, org-scoping, activity logging) that all blocks depend on.

```
+-----------------------------------------------------------+
|                    Config Layer                            |
|  _calmdo/config.ts (build-time feature manifest)          |
|  convex/calmdo/settings (runtime config in Convex DB)     |
+-------------+---------------------------+-----------------+
              |                           |
   +----------v------------+  +-----------v-----------+
   |  Build-Time Effect    |  |  Runtime Effect       |
   |  - Schema composition |  |  - Status options     |
   |  - Route registration |  |  - Priority config    |
   |  - Nav item wiring    |  |  - Field labels       |
   |  - i18n namespace     |  |  - Feature toggles    |
   +----------+------------+  +-----------+-----------+
              |                           |
   +----------v---------------------------v---------------+
   |              Feature Blocks                          |
   |  +----------+ +-----------+ +-----------+           |
   |  |  Tasks   | | Projects  | | Subtasks  |  ...      |
   |  |(frontend)| |(frontend) | |(frontend) |           |
   |  |(backend) | |(backend)  | |(backend)  |           |
   |  |(schema)  | |(schema)   | |(schema)   |           |
   |  +----+-----+ +-----+-----+ +-----+-----+           |
   |       |              |             |                 |
   |  +----v--------------v-------------v-----------+    |
   |  |     CalmDo Shared Infrastructure            |    |
   |  |  - Audit field helpers                      |    |
   |  |  - Org-scoping wrappers                     |    |
   |  |  - Activity log writer                      |    |
   |  |  - Shared Zod schemas (status, priority)    |    |
   |  +--------------------------------------------- +    |
   +------------------------------------------------------+
              |
   +----------v------------------------------+
   |     Existing Starter Kit Core           |
   |  Auth, Billing, Users, Layout, etc.     |
   +-----------------------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `_calmdo/config.ts` | Build-time feature manifest: which blocks are enabled, relationship modes | Generators, schema composition, nav wiring |
| `convex/calmdo/settings/` | Runtime config: status options, priority levels, labels | All CalmDo backend functions, frontend UI |
| `convex/calmdo/shared/` | Audit field helpers, org-scoped query wrappers, activity log writer | All CalmDo backend domain folders |
| `src/shared/schemas/calmdo/` | Zod schemas for CalmDo entities (shared client+server) | Frontend forms, backend mutations via zodToConvex |
| `src/features/tasks/` | Task UI: list, detail, create/edit forms | Backend `convex/tasks/`, shared schemas, runtime config |
| `src/features/projects/` | Project UI: list, detail, task association | Backend `convex/projects/`, tasks feature (when enabled) |
| `src/features/subtasks/` | Subtask UI: inline list within task detail, promotion | Backend `convex/subtasks/`, tasks feature |
| `src/features/work-logs/` | Work log UI: timeline entries within task detail | Backend `convex/work-logs/`, tasks feature |
| `src/features/activity-logs/` | Activity timeline UI: read-only audit display | Backend `convex/activity-logs/`, consumes events from all features |
| `convex/tasks/` | Task CRUD, status transitions, assignment, search | Schema, shared infra, activity log writer |
| `convex/projects/` | Project CRUD, status management | Schema, shared infra, activity log writer |
| `convex/subtasks/` | Subtask CRUD, promotion to task | Schema, shared infra, tasks domain |
| `convex/work-logs/` | Work log CRUD | Schema, shared infra |
| `convex/activity-logs/` | Activity log queries (writes come from other domains) | Schema |

### Data Flow

**Build-time flow (config to code):**
```
_calmdo/config.ts
    |
    +-- convex/schema.ts reads config --> includes only enabled table definitions
    +-- src/shared/nav.ts reads config --> registers nav items for enabled features
    +-- Plop generators read config --> scaffold correct relationship wiring
    +-- i18n namespaces --> load only enabled feature translations
```

**Runtime config flow (Convex DB to UI):**
```
convex/calmdo/settings table
    |
    +-- convex/tasks/mutations.ts --> validates status against allowed values
    +-- convex/tasks/queries.ts --> includes status/priority metadata in response
    +-- src/features/tasks/ --> reads config to render correct dropdowns, labels
```

**Mutation flow (user action to database):**
```
User action (e.g., change task status)
    |
    +-- Frontend form validates via Zod schema (src/shared/schemas/calmdo/task.ts)
    +-- Calls convex/tasks/mutations.ts --> updateTaskStatus
    |   +-- Auth check (userId from ctx)
    |   +-- Org-scope check (task.orgId matches user.orgId)
    |   +-- Status transition validation (against runtime config)
    |   +-- DB update (ctx.db.patch)
    |   +-- Activity log write (ctx.runMutation --> internal.activityLogs.create)
    +-- Convex real-time pushes update to all subscribed clients
```

---

## Patterns to Follow

### Pattern 1: Feature Block Structure (The "Lego" Convention)

Each CalmDo feature block follows a strict file convention that mirrors the existing starter kit pattern but adds CalmDo-specific concerns.

**What:** Every feature block is a self-contained unit with frontend feature folder, backend domain folder, shared schema, and optional route files.

**When:** Every CalmDo entity (tasks, projects, subtasks, work-logs, activity-logs).

**Frontend structure:**
```
src/features/tasks/
+-- components/
|   +-- TaskList.tsx         # List view component
|   +-- TaskDetail.tsx       # Detail/show view
|   +-- TaskForm.tsx         # Create/edit form
|   +-- TaskStatusBadge.tsx  # Shared UI atoms
+-- hooks/
|   +-- useTasks.ts          # Query hooks wrapping Convex queries
|   +-- useTaskMutations.ts  # Mutation hooks
+-- index.ts                 # Public API barrel export
+-- tasks.test.tsx           # Integration tests
```

**Backend structure:**
```
convex/tasks/
+-- queries.ts               # All task queries (list, getById, search)
+-- mutations.ts             # All task mutations (create, update, delete, changeStatus)
+-- queries.test.ts          # Backend query tests
+-- mutations.test.ts        # Backend mutation tests
```

**Shared schema:**
```
src/shared/schemas/calmdo/
+-- task.ts                  # Zod schema for task (used by frontend forms + backend via zodToConvex)
+-- project.ts               # Zod schema for project
+-- subtask.ts               # Zod schema for subtask
+-- work-log.ts              # Zod schema for work log
+-- index.ts                 # Barrel export
```

### Pattern 2: Config-Driven Schema Composition

**What:** `convex/schema.ts` remains the single schema file (Convex requirement), but it imports table definitions from domain-specific files and conditionally includes them based on the CalmDo config.

**When:** When assembling the Convex schema from composable feature blocks.

**Why not dynamic schema:** Convex requires `schema.ts` to be statically analyzable at deploy time. The schema cannot be truly "dynamic." But we can use build-time config to control which table definitions are imported.

**Important correction from v1.0 research:** The v1.0 ARCHITECTURE.md listed "splitting schema.ts by domain" as an anti-pattern. That was correct for v1.0 where only 3 small tables existed. For CalmDo's 8+ tables, extracting table definitions into separate files is the right call -- the anti-pattern was about barrel re-exports in `convex/`, not about factoring out table definitions. The root `schema.ts` still has the single `defineSchema()` call, it just imports the table shapes.

**Example:**
```typescript
// convex/calmdo/tables/tasks.ts
import { defineTable } from "convex/server";
import { v } from "convex/values";
import { auditFields } from "../shared/audit";

export const tasksTable = defineTable({
  title: v.string(),
  description: v.optional(v.string()),
  status: v.string(),  // Validated at runtime against config, not hardcoded union
  isHighPriority: v.boolean(),
  visibility: v.union(v.literal("private"), v.literal("shared")),
  projectId: v.optional(v.id("projects")),
  orgId: v.id("organizations"),
  assigneeId: v.optional(v.id("users")),
  ...auditFields,
})
  .index("by_org", ["orgId"])
  .index("by_project", ["projectId"])
  .index("by_assignee", ["assigneeId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_project_status", ["projectId", "status"])
  .searchIndex("search_title_description", {
    searchField: "title",
    filterFields: ["orgId", "projectId", "status"],
  });

// convex/schema.ts
import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
// Existing tables (inline, as today)
// CalmDo tables (extracted)
import { organizationsTable } from "./calmdo/tables/organizations";
import { tasksTable } from "./calmdo/tables/tasks";
import { projectsTable } from "./calmdo/tables/projects";
import { subtasksTable } from "./calmdo/tables/subtasks";
import { taskLinksTable } from "./calmdo/tables/taskLinks";
import { workLogsTable } from "./calmdo/tables/workLogs";
import { activityLogsTable } from "./calmdo/tables/activityLogs";
import { settingsTable } from "./calmdo/tables/settings";

export default defineSchema({
  ...authTables,
  users: /* existing inline definition */,
  plans: /* existing inline definition */,
  subscriptions: /* existing inline definition */,
  // CalmDo tables
  organizations: organizationsTable,
  tasks: tasksTable,
  projects: projectsTable,
  subtasks: subtasksTable,
  taskLinks: taskLinksTable,
  workLogs: workLogsTable,
  activityLogs: activityLogsTable,
  settings: settingsTable,
});
```

**Key decision: `v.string()` for status, not `v.union(v.literal(...))`.**
Using `v.string()` for configurable enum fields (status, priority) and validating at the mutation level against runtime config. This avoids needing schema migration when status options change. The trade-off is losing Convex-level type enforcement, but runtime validation in mutations catches invalid values just as effectively. This decision should be validated during implementation -- if the loss of type safety creates too many bugs, hardcoded unions with a migration path may be preferable.

### Pattern 3: Audit Field Helpers

**What:** A shared helper that adds standard audit fields to any table definition and provides mutation helpers that auto-populate them.

**When:** Every CalmDo table.

**Example:**
```typescript
// convex/calmdo/shared/audit.ts
import { v } from "convex/values";
import { Id } from "@cvx/_generated/dataModel";

export const auditFields = {
  createdAt: v.number(),
  createdBy: v.id("users"),
  updatedAt: v.number(),
  updatedBy: v.id("users"),
};

export function withAuditCreate(userId: Id<"users">) {
  const now = Date.now();
  return {
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
  };
}

export function withAuditUpdate(userId: Id<"users">) {
  return {
    updatedAt: Date.now(),
    updatedBy: userId,
  };
}
```

### Pattern 4: Org-Scoped Query Wrapper

**What:** A helper that enforces org-scoping on every CalmDo query, preventing data leaks between organizations.

**When:** Every CalmDo query and mutation.

**Example:**
```typescript
// convex/calmdo/shared/org.ts
import { auth } from "@cvx/auth";
import { QueryCtx, MutationCtx } from "@cvx/_generated/server";

export async function requireOrgUser(ctx: QueryCtx | MutationCtx) {
  const userId = await auth.getUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user || !user.orgId) throw new Error("User has no organization");
  return { userId, orgId: user.orgId, user };
}
```

**Note:** This requires adding `orgId` to the existing `users` table. That is a schema change to the existing user table -- the one modification CalmDo makes to the starter kit's core schema.

### Pattern 5: Activity Log Writer (Cross-Cutting Audit)

**What:** An internal mutation that any domain can call to record activity. Decouples activity log writes from domain logic.

**When:** After any state change that should be audited.

**Example:**
```typescript
// convex/activity-logs/mutations.ts
import { internalMutation } from "@cvx/_generated/server";
import { v } from "convex/values";
import { auditFields, withAuditCreate } from "../calmdo/shared/audit";

export const logActivity = internalMutation({
  args: {
    taskId: v.optional(v.id("tasks")),
    projectId: v.optional(v.id("projects")),
    orgId: v.id("organizations"),
    action: v.string(),
    details: v.optional(v.any()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activityLogs", {
      taskId: args.taskId,
      projectId: args.projectId,
      orgId: args.orgId,
      action: args.action,
      details: args.details,
      ...withAuditCreate(args.userId),
    });
  },
});

// Usage in any domain mutation:
// convex/tasks/mutations.ts
await ctx.scheduler.runAfter(0, internal.activityLogs.mutations.logActivity, {
  taskId: task._id,
  orgId,
  action: "task.status_changed",
  details: { from: oldStatus, to: newStatus },
  userId,
});
```

**Why `ctx.scheduler.runAfter(0, ...)` instead of `ctx.runMutation`:** Convex mutations are transactional. Using `runAfter(0, ...)` runs the activity log write in a separate transaction, so a failure to log activity does not roll back the primary mutation. This is the correct trade-off for audit logs -- losing an audit entry is better than failing the user's action.

### Pattern 6: Runtime Config via Settings Table

**What:** A Convex table that stores configurable values (status options, priority modes, labels) per organization. UI reads this via real-time queries; mutations validate against it.

**When:** For any field where the options should be changeable without code deployment.

**Example schema:**
```typescript
// convex/calmdo/tables/settings.ts
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const settingsTable = defineTable({
  orgId: v.id("organizations"),
  key: v.string(),   // e.g., "task.statuses", "task.priorityMode"
  value: v.any(),    // JSON value
  updatedAt: v.number(),
  updatedBy: v.id("users"),
})
  .index("by_org_key", ["orgId", "key"]);
```

**Settings keys and their default values:**
```typescript
const DEFAULT_SETTINGS = {
  "task.statuses": [
    { key: "todo", label: "To Do", color: "gray", isDefault: true },
    { key: "in_progress", label: "In Progress", color: "blue" },
    { key: "done", label: "Done", color: "green", isTerminal: true },
  ],
  "task.priorityMode": "boolean",  // "boolean" (isHighPriority) or "levels" (P1-P4)
  "project.statuses": [
    { key: "active", label: "Active", color: "green", isDefault: true },
    { key: "on_hold", label: "On Hold", color: "yellow" },
    { key: "completed", label: "Completed", color: "blue", isTerminal: true },
    { key: "archived", label: "Archived", color: "gray", isTerminal: true },
  ],
  "features.subtasks": true,
  "features.workLogs": true,
  "features.taskLinks": true,
  "task.projectRequirement": "optional",  // "optional" | "required" | "disabled"
};
```

**Frontend hook for runtime config:**
```typescript
// src/features/calmdo/hooks/useSettings.ts
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@cvx/_generated/api";

export function useSetting<T = unknown>(key: string): T | undefined {
  const { data } = useQuery(
    convexQuery(api.calmdo.settings.queries.get, { key })
  );
  return data?.value as T | undefined;
}

export function useTaskStatuses() {
  return useSetting<Array<{ key: string; label: string; color: string }>>(
    "task.statuses"
  );
}
```

### Pattern 7: Conditional Feature Wiring in UI

**What:** UI components check runtime config to show/hide feature-specific sections. No build-time conditional compilation needed -- runtime toggles are simpler and work with Convex's real-time nature.

**When:** A parent component (like TaskDetail) needs to optionally show child features (subtasks, work logs).

**Example:**
```typescript
// src/features/tasks/components/TaskDetail.tsx
import { SubtaskList } from "@/features/subtasks";
import { WorkLogTimeline } from "@/features/work-logs";
import { ActivityTimeline } from "@/features/activity-logs";
import { useSetting } from "@/features/calmdo/hooks/useSettings";

function TaskDetail({ taskId }: { taskId: Id<"tasks"> }) {
  const subtasksEnabled = useSetting<boolean>("features.subtasks");
  const workLogsEnabled = useSetting<boolean>("features.workLogs");

  return (
    <div>
      <TaskHeader taskId={taskId} />
      <TaskDescription taskId={taskId} />
      {subtasksEnabled && <SubtaskList taskId={taskId} />}
      {workLogsEnabled && <WorkLogTimeline taskId={taskId} />}
      <ActivityTimeline taskId={taskId} />
    </div>
  );
}
```

**Trade-off acknowledged:** This creates import-time coupling between features even when they're toggled off at runtime. The code for SubtaskList is bundled even if subtasks are disabled. For v2.0 this is fine -- all features are enabled. For future client-specific repos, tree-shaking or lazy imports (`React.lazy`) can eliminate unused feature code.

### Pattern 8: Relationship Modes (The Key Composability Pattern)

**What:** The relationship between Projects and Tasks is configurable: tasks can require a project (enterprise mode) or be standalone quick tasks (personal mode). This is expressed through a runtime config value, not schema differences.

**When:** When the same entity can operate independently or as part of a parent-child relationship.

**Why this matters:** This is the core "lego" composability. A Task block works alone (quick tasks). When Projects block is added, Tasks can optionally belong to projects. The schema always has `projectId: v.optional(v.id("projects"))` -- the config controls whether the UI enforces the relationship.

**Config values:**
```typescript
"task.projectRequirement": "optional"  // "optional" | "required" | "disabled"
// "optional" = quick tasks + project tasks (CalmDo default)
// "required" = all tasks must belong to a project
// "disabled" = projects feature off, tasks are standalone
```

**Implementation:** The mutation checks the config before accepting a task creation:
```typescript
// convex/tasks/mutations.ts
export const createTask = mutation({
  args: { title: v.string(), projectId: v.optional(v.id("projects")), /* ... */ },
  handler: async (ctx, args) => {
    const { userId, orgId } = await requireOrgUser(ctx);
    const projectReq = await getSettingValue(ctx, orgId, "task.projectRequirement");

    if (projectReq === "required" && !args.projectId) {
      throw new Error("A project is required for all tasks");
    }
    if (projectReq === "disabled" && args.projectId) {
      throw new Error("Projects are not enabled");
    }
    // ... proceed with creation
  },
});
```

---

## Integration Points with Existing Architecture

### New Files (CalmDo adds these)

| Location | Files | Purpose |
|----------|-------|---------|
| `src/features/tasks/` | Full feature folder | Task management UI |
| `src/features/projects/` | Full feature folder | Project management UI |
| `src/features/subtasks/` | Full feature folder | Subtask UI (embedded in task detail) |
| `src/features/work-logs/` | Full feature folder | Work log UI (embedded in task detail) |
| `src/features/activity-logs/` | Full feature folder | Activity timeline UI |
| `src/features/calmdo/` | hooks/useSettings.ts, shared utilities | CalmDo-wide frontend utilities |
| `convex/tasks/` | queries.ts, mutations.ts, tests | Task backend |
| `convex/projects/` | queries.ts, mutations.ts, tests | Project backend |
| `convex/subtasks/` | queries.ts, mutations.ts, tests | Subtask backend |
| `convex/work-logs/` | queries.ts, mutations.ts, tests | Work log backend |
| `convex/activity-logs/` | queries.ts, mutations.ts, tests | Activity log backend |
| `convex/calmdo/shared/` | audit.ts, org.ts | Shared CalmDo backend infra |
| `convex/calmdo/tables/` | One file per table definition | Table definitions extracted for schema.ts |
| `convex/calmdo/settings/` | queries.ts, mutations.ts | Runtime config CRUD |
| `src/shared/schemas/calmdo/` | task.ts, project.ts, subtask.ts, work-log.ts, index.ts | Shared Zod schemas |
| `src/routes/_app/_auth/dashboard/` | Route files for CalmDo views | My Tasks, Team Pool, Projects, Task Detail |
| `public/locales/{en,es}/` | tasks.json, projects.json | CalmDo i18n translations |

### Modified Files (CalmDo touches these)

| File | Change | Risk |
|------|--------|------|
| `convex/schema.ts` | Import CalmDo table definitions, add to defineSchema | **LOW** -- additive, no existing table changes (except users.orgId) |
| `src/shared/nav.ts` | Add CalmDo nav items (My Tasks, Projects, etc.) | **LOW** -- append to existing array, designed for this |
| `public/locales/en/translation.json` | Add CalmDo-related keys OR create separate namespace files | **LOW** -- additive |
| `convex/init.ts` | Seed CalmDo default settings + create default organization | **MEDIUM** -- must not break existing Stripe seed logic |
| `src/features/dashboard/components/Navigation.tsx` | May need updates if nav rendering changes | **LOW** -- already data-driven from nav.ts |
| `users` table in schema | Add `orgId: v.optional(v.id("organizations"))` field | **MEDIUM** -- touches existing auth-managed table |

### Unchanged Files (Existing starter kit)

Everything in `src/features/auth/`, `src/features/billing/`, `src/features/settings/`, `src/features/onboarding/`, `convex/billing/`, `convex/users/` (except schema addition) remains untouched. The existing Stripe integration, auth flow, and onboarding continue to work exactly as they do today.

---

## Build Order (Respects Feature Dependencies)

The build order follows the domain model's dependency graph. Each phase is a vertical slice: schema + backend + frontend + tests. Every commit maintains 100% coverage.

```
Phase 1: Foundation Infrastructure
    |  Organizations table + settings table + audit helpers + org-scoping
    |  + users.orgId addition + default org creation in init.ts
    |  (Everything else depends on this)
    |
Phase 2: Tasks (standalone)
    |  Tasks CRUD + quick tasks + status workflow
    |  My Tasks view (frontend route + feature folder)
    |  (No projects yet -- tasks work independently as quick tasks)
    |
Phase 3: Projects
    |  Projects CRUD + status management
    |  Projects List view (frontend route + feature folder)
    |  (Independent of tasks at this point)
    |
Phase 4: Project-Task Relationship
    |  Wire tasks to projects (optional projectId)
    |  Project View (task list within project), move task to project
    |  Team Pool view (unassigned tasks across projects)
    |  (Requires both Phase 2 + 3)
    |
Phase 5: Subtasks
    |  Subtask CRUD + promotion to task (creates task + task link)
    |  Subtask list within Task Detail view
    |  (Requires Phase 2 -- tasks)
    |
Phase 6: Work Logs
    |  Work log CRUD + timeline display within Task Detail
    |  (Requires Phase 2 -- tasks)
    |
Phase 7: Task Links
    |  spawned_from + blocked_by relationships
    |  Display in Task Detail view
    |  (Requires Phase 2 -- tasks; Phase 5 wires promotion links)
    |
Phase 8: Activity Logs
    |  Auto-generated audit trail + timeline view
    |  Hooks into mutations from Phases 2-7
    |  (Requires Phase 2-7 so all events exist to capture)
    |
Phase 9: Assignment + Views
    |  Task assignment to org members
    |  My Tasks view (assigned to me), Team Pool view (unassigned)
    |  (Requires Phase 2 + optionally Phase 4)
    |
Phase 10: Filters + Search
    |  Status/project/assignee filters, text search
    |  Search box in header, filter controls on list views
    |  (Requires Phases 2-9 -- polishing layer)
```

**Dependency graph:**
```
[1: Infra] --> [2: Tasks] --> [5: Subtasks] --> [7: Links]
                    |                                |
               [3: Projects]                    [8: Activity Logs]
                    |                                |
               [4: Task+Project] --> [9: Assignment] --> [10: Filters]
                    |
               [6: Work Logs]
```

**Why this order:**
1. **Infra first** because audit fields and org-scoping are used by every domain function.
2. **Tasks before Projects** because tasks are the core entity and can work standalone as quick tasks. Projects without tasks are empty shells with no verifiable behavior.
3. **Relationship wiring after both exist** because it is cleaner to add the optional `projectId` relationship after both entities work independently. This also validates the "lego" composability -- tasks genuinely work without projects.
4. **Subtasks and Work Logs are independent** (Phases 5, 6) -- they only depend on tasks, not on each other. They could be built in parallel or either order.
5. **Activity Logs late** because they hook into mutations from all other domains. Building them last means all the events they need to capture already exist.
6. **Filters and Search last** because they are a polish layer that requires all queryable data to be in place.

**Note on Phase 8 (Activity Logs) timing:** Activity log writes can be added retroactively to existing mutations. Building the activity log infrastructure late does not mean retroactively adding `logActivity` calls is hard -- it is a mechanical addition of one `scheduler.runAfter` call per mutation. An alternative is to add activity logging to each mutation as it is built (in Phases 2-7) and only build the activity log query/display UI in Phase 8.

---

## Build-Time vs Runtime Config: The Boundary

| Concern | Build-Time (TypeScript config) | Runtime (Convex DB) | Rationale |
|---------|-------------------------------|---------------------|-----------|
| Which tables exist in schema | X | | Convex schema is static -- must be known at deploy |
| Which nav items appear | X | | Route files must exist at build time |
| Which route files exist | X | | TanStack Router generates route tree from files |
| Status enum options | | X | Business users change these without deploys |
| Priority mode (boolean vs levels) | | X | Per-org customization |
| Field labels | | X | i18n and customization |
| Feature sub-toggles (subtasks on/off) | | X | UI conditionals, no schema impact |
| Relationship mode (project required/optional) | | X | UI enforcement, schema always has optional FK |
| Default org name | X | | Used in init.ts seed script |

**The principle:** Build-time config controls what code exists (schema tables, route files, nav items). Runtime config controls how existing code behaves (labels, options, toggles). The schema is always the maximal set -- runtime config subtracts from it by hiding features in the UI.

---

## Config File Format

For v2.0 CalmDo Core, a TypeScript config file is more appropriate than JSON/YAML because it gets type-checked and can import shared types.

```typescript
// _calmdo/config.ts
export const calmdoConfig = {
  /** Organization setup */
  org: {
    name: "My Team",
    type: "provider" as const,
  },

  /** Which feature blocks are enabled (controls schema + routes + nav) */
  features: {
    tasks: true,         // Core -- always true for CalmDo
    projects: true,      // Projects container
    subtasks: true,      // Subtasks within tasks
    workLogs: true,      // Time/work logging
    taskLinks: true,     // spawned_from, blocked_by
    activityLogs: true,  // Audit trail
  },

  /** Default runtime settings (seeded to Convex on first run via init.ts) */
  defaults: {
    taskStatuses: [
      { key: "todo", label: "To Do", color: "gray", isDefault: true },
      { key: "in_progress", label: "In Progress", color: "blue" },
      { key: "done", label: "Done", color: "green", isTerminal: true },
    ],
    projectStatuses: [
      { key: "active", label: "Active", color: "green", isDefault: true },
      { key: "on_hold", label: "On Hold", color: "yellow" },
      { key: "completed", label: "Completed", color: "blue", isTerminal: true },
      { key: "archived", label: "Archived", color: "gray", isTerminal: true },
    ],
    priorityMode: "boolean" as const,
    taskProjectRequirement: "optional" as const,
  },
} as const;
```

**For v2.0, this config is primarily informational** -- all features are enabled and the config documents defaults for the seed script. The config becomes structurally important in later phases when the platform supports configurable assembly for different clients (per VISION.md Phase 3+).

---

## Declarative Assembly vs LLM-Powered Wiring: The Boundary

| What | Approach | Rationale |
|------|----------|-----------|
| Scaffolding new feature block folders | **Plop.js templates** | Predictable file structure, same every time |
| Generating boilerplate CRUD mutations/queries | **Plop.js templates** | Follows audit + org-scope pattern mechanically |
| Creating route files | **Plop.js templates** | TanStack Router naming convention is formulaic |
| Generating test file skeletons | **Plop.js templates** | Standard integration test structure |
| Wiring nav items into nav.ts | **Plop.js append action** | Append to array |
| Creating shared Zod schemas | **Plop.js templates** | Field definitions from domain model |
| Complex business logic (subtask promotion) | **LLM / human** | Creates task + updates subtask + creates link + logs activity |
| Cross-feature wiring (TaskDetail rendering SubtaskList) | **LLM / human** | Requires understanding which features are optional |
| Status transition validation rules | **LLM / human** | Domain-specific constraints |
| Activity log event definitions | **LLM / human** | Which fields to capture in `details` per action type |
| Search query optimization | **LLM / human** | Which indexes to use for compound filters |
| Test scenarios | **LLM / human** | Deriving meaningful test cases from requirements |

**The principle:** If the output is predictable from the input (name in, files out), use a template. If the output requires understanding intent, domain rules, or making judgment calls, use an LLM (or a human). For v2.0 CalmDo Core, this means generators scaffold the structure and a developer (with Claude Code) writes the business logic within the scaffolded files.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic Schema File
**What:** Putting all 8+ CalmDo table definitions inline in `convex/schema.ts`.
**Why bad:** Schema becomes 300+ lines, impossible to navigate, merge conflicts between feature phases.
**Instead:** Extract each CalmDo table to `convex/calmdo/tables/{entity}.ts`. Import and spread into `schema.ts`. Keep existing starter kit tables (users, plans, subscriptions) inline since they are small and stable.

### Anti-Pattern 2: Hardcoded Status Unions in Schema
**What:** Using `v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done"))` for configurable fields.
**Why bad:** Adding a status requires schema migration and code deployment. Defeats runtime configurability.
**Instead:** Use `v.string()` in schema, validate against runtime config values in mutations. Accept the trade-off of losing Convex-level type narrowing for configurable fields. Consider using TypeScript branded types on the frontend for DX.

### Anti-Pattern 3: Feature Blocks That Import Each Other Directly
**What:** `src/features/subtasks/` importing from `src/features/tasks/` internal components or hooks.
**Why bad:** Creates coupling that prevents independent use. Cannot remove subtasks without breaking tasks.
**Instead:** Feature blocks communicate through: (1) shared schemas in `src/shared/schemas/calmdo/`, (2) Convex API types (`api.tasks.*`), (3) component props (parent passes taskId down). Never import from another feature's `components/` or `hooks/` directly. The parent route or layout component wires features together.

### Anti-Pattern 4: Activity Logging Inline in Domain Mutations
**What:** Every mutation directly calls `ctx.db.insert("activityLogs", ...)` inline.
**Why bad:** Bloats mutations with 5-10 lines of logging boilerplate, duplicates audit field creation, easy to forget in new mutations, and a logging failure rolls back the primary mutation.
**Instead:** Use `ctx.scheduler.runAfter(0, internal.activityLogs.mutations.logActivity, {...})` -- a single line per mutation, decoupled transaction.

### Anti-Pattern 5: Build-Time Config for Runtime Decisions
**What:** Using the `_calmdo/config.ts` file to control what status options appear in dropdowns.
**Why bad:** Requires code deployment to change a dropdown option. Defeats the purpose of a configurable system.
**Instead:** Runtime config in Convex `settings` table for anything a business user might want to change. Build-time config only for structural decisions (which tables exist, which routes are registered).

### Anti-Pattern 6: Convex Barrel Re-exports
**What:** Creating `convex/tasks/index.ts` that re-exports from queries.ts and mutations.ts.
**Why bad:** Convex generates API paths based on file paths. An `index.ts` barrel would create `api.tasks.index.listTasks` instead of `api.tasks.queries.listTasks`. This was verified in v1.0 -- Convex does not follow barrel export conventions.
**Instead:** Import directly from the specific file. Use the full path: `api.tasks.queries.listTasks`.

---

## Scalability Considerations

| Concern | At 2 users (v2.0) | At 100 users | At 10K users |
|---------|--------------------|--------------|----|
| Schema | All tables in one defineSchema, single org | Same schema, multiple orgs | Same schema, org-scoped indexes critical for performance |
| Queries | Direct DB queries, no pagination | Add `.paginate()` to list queries | Pagination mandatory, consider cursor-based pagination |
| Activity Logs | Grows linearly, small volume | Index by recency, paginate timeline view | Archival strategy needed (prune old logs or move to cold storage) |
| Settings | One row per key per org (~10 rows total) | Same pattern, still small | O(features x orgs) rows -- still well under 10K |
| Search | Convex search index on title field | Sufficient for most use cases | May need search index on description too, or external search |
| Real-time | All queries reactive, fine at small scale | Convex handles subscription fanout | Monitor Convex function execution limits per deployment |
| Bundle size | All feature code bundled (~50KB for CalmDo) | Same -- acceptable | Consider React.lazy per feature for code splitting |

---

## Open Questions (To Resolve During Implementation)

1. **`v.string()` vs `v.union()` for status fields:** The recommendation is `v.string()` for runtime configurability. However, if Convex's type inference from `v.union()` provides significant DX benefits in queries (narrowing, autocomplete), it may be worth using unions for the default statuses and accepting the schema migration cost when statuses change. This should be tested during Phase 2.

2. **Activity log write pattern:** `ctx.scheduler.runAfter(0, ...)` is recommended over `ctx.runMutation` to decouple transactions. This needs verification that Convex allows calling `scheduler.runAfter` from a mutation to call an `internalMutation`. The alternative is a simple helper function (not a separate mutation) that inserts directly within the same transaction.

3. **Users table orgId:** Adding `orgId` to the auth-managed users table requires `v.optional()` since existing users will not have it. The onboarding flow or a migration script needs to set it. This is the highest-risk integration point with the existing starter kit.

4. **Settings table query performance:** Every mutation that validates status or checks feature toggles will query the settings table. At small scale this is fine, but at scale each mutation adds a DB read. Consider caching settings in a module-level variable with TTL, or reading all org settings in one query and passing them through.

---

## Sources

- Existing codebase architecture (`convex/schema.ts`, `src/features/`, `src/shared/`, `plopfile.js`) -- **HIGH confidence**, direct analysis
- CalmDo domain model (`_calmdo/DOMAIN.md`) with complete entity definitions and indexes -- **HIGH confidence**
- CalmDo Phase 1 schema design (`_reference/superpowers/2026-01-28-phase1-design.md`) with Convex schema code -- **HIGH confidence**
- CalmDo lessons learned (`_calmdo/LESSONS.md`) across 7+ implementation attempts -- **HIGH confidence**
- VISION.md hybrid runtime+codegen architecture -- **HIGH confidence**, first-party vision document
- v1.0 architecture research (`.planning/research/ARCHITECTURE.md` from 2026-03-09) -- **HIGH confidence**, patterns verified in implementation
- Convex `defineSchema` requirement (single file at `convex/schema.ts`) -- **HIGH confidence**, framework constraint
- TanStack Router file-based routing constraints -- **HIGH confidence**, framework constraint
- Convex `scheduler.runAfter` for cross-mutation calls -- **MEDIUM confidence**, standard pattern but needs verification for internalMutation calls
- `v.string()` vs `v.union()` trade-off for configurable enums -- **MEDIUM confidence**, architecturally sound but DX impact needs validation

---

*Architecture research: 2026-03-10*
