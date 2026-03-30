# CalmDo Migration Notes — Generated/Custom Split

**Created by:** Plan 999.4-03-02
**Status:** Analysis complete
**Conclusion:** All 5 features are fully custom (no generated code matches the hand-written code)

---

## Summary

The scaffold pipeline (`scaffoldFeature`) generates stub files only — minimal placeholders
with a `// @generated` header and comment bodies. The generated mutations/queries contain
only a single comment line (`// Mutations for Task`), not functional CRUD code.

This means **all existing backend and frontend code is custom** and should remain in
`convex/{name}/` and `src/features/{name}/`. The generated stubs in `convex/generated/{name}/`
and `src/generated/{name}/` represent the baseline scaffold — the starting point before
customization.

---

## Per-Feature Analysis

### tasks

**Backend: `convex/tasks/`** — FULLY CUSTOM
- `mutations.ts`: 7 mutations with complex domain logic:
  - `create` — activity log hook, position=Date.now(), auto-sets visibility=private
  - `update` — selective patch, activity log with changed fields
  - `remove` — cascade delete subtasks+workLogs, activity log
  - `updateStatus` — status transition guards (linear: todo→in_progress→done only)
  - `assign` — auto-flip visibility when assigning/unassigning
  - `createInProject` — auto-sets visibility=shared
  - `assignToProject` — visibility auto-flip based on D-06/D-07 rules
  - `reorder` — position field update
- `queries.ts`: 6 queries:
  - `myTasks` — by assigneeId, sorted by position
  - `teamPool` — shared tasks without assignee
  - `getById` — single task fetch
  - `search` — fulltext via searchIndex
  - `listFiltered` — multi-filter (status, priority, assignee, projectId)
  - `listUsers` — user list for assignment UI

**Generated stubs:** Empty (comment-only) mutations.ts and queries.ts; schema.fragment.ts missing assigneeId, projectId, position, indexes, searchIndex

**Split classification:**
- `convex/generated/tasks/` — Stub files (baseline, DO NOT USE for production)
- `convex/tasks/` — ALL CUSTOM (keep as-is)

**Frontend: `src/features/tasks/`** — FULLY CUSTOM
- 12 hand-written components (TasksPage, TeamPoolPage, TaskItem, TaskList, TaskForm, TaskFilterBar, TaskDetailPanel, TaskStatusBadge, SubtaskItem, SubtaskList, WorkLogForm, WorkLogList)
- Generated stub: single `TasksPage` component stub in `src/generated/tasks/components/TasksPage.tsx`

---

### projects

**Backend: `convex/projects/`** — FULLY CUSTOM
- `mutations.ts`: 3 mutations:
  - `create` — zMutation with createProjectInput Zod schema, activity log
  - `update` — optional name+status patch, dual activity logs (status_changed + edited)
  - `remove` — deep cascade delete (project → tasks → subtasks/workLogs), activity log
- `queries.ts`: 3 queries:
  - `list` — optional status filter, enriched with taskCounts aggregate
  - `search` — fulltext via searchIndex
  - `getWithTasks` — project + tasks + statusSummary aggregate

**Generated stubs:** Empty mutations/queries; schema.fragment.ts missing searchIndex, indexes

**Split classification:**
- `convex/generated/projects/` — Stub files (baseline)
- `convex/projects/` — ALL CUSTOM (keep as-is)

**Frontend: `src/features/projects/`** — FULLY CUSTOM
- 6 hand-written components (ProjectsPage, ProjectDetailPage, ProjectCard, ProjectForm, ProjectStatusBadge, TaskSummaryBar)

---

### subtasks

**Backend: `convex/subtasks/`** — FULLY CUSTOM
- `mutations.ts`: 6 mutations:
  - `create` — basic insert with taskId parent reference
  - `update` — title-only patch
  - `remove` — hard delete
  - `toggleDone` — todo↔done toggle (blocks if promoted), activity log on completion
  - `reorder` — position field update
  - `promote` — complex: creates new full task from subtask, inherits projectId, marks as promoted

**Generated stubs:** Empty; schema.fragment.ts missing taskId (parent ref), position, promotedToTaskId

**Split classification:**
- `convex/generated/subtasks/` — Stub files (baseline)
- `convex/subtasks/` — ALL CUSTOM (keep as-is)

**Frontend: `src/features/subtasks/`** — STUB ONLY (no components directory)
- Existing: only `feather.yaml` + `index.ts` (empty barrel)
- Generated: `src/generated/subtasks/components/SubtasksPage.tsx` (stub)

---

### workLogs (work-logs)

**Backend: `convex/workLogs/`** — FULLY CUSTOM
- `mutations.ts`: 3 mutations:
  - `create` — taskId + body + optional timeMinutes
  - `update` — ownership validation (NOT_OWNER error), selective patch
  - `remove` — ownership validation before delete

**Generated stubs:** Empty; schema.fragment.ts missing taskId parent reference

**Split classification:**
- `convex/generated/workLogs/` — Stub files (baseline)
- `convex/workLogs/` — ALL CUSTOM (keep as-is)

**Frontend: `src/features/work-logs/`** — STUB ONLY (no components directory)
- Existing: only `feather.yaml` + `index.ts` (empty barrel)
- Generated: `src/generated/workLogs/components/WorkLogsPage.tsx` (stub)

---

### activityLogs (activity-logs)

**Backend: `convex/activityLogs/`** — FULLY CUSTOM
- `helpers.ts`: `logActivity()` — the central hook called by all other mutations to record events
- `mutations.ts`: no direct mutations (system-only, writes via logActivity helper)
- `queries.ts`: `listByEntity` — paginated activity log for a given entity

**Generated stubs:** Empty; schema.fragment.ts missing entityType, entityId, action, metadata fields (uses generic string() for actor)

**Split classification:**
- `convex/generated/activityLogs/` — Stub files (baseline, DO NOT USE)
- `convex/activityLogs/` — ALL CUSTOM (keep as-is)

**Frontend: `src/features/activity-logs/`** — STUB ONLY (no components directory)
- Existing: only `feather.yaml` + `index.ts` (empty barrel)
- Generated: `src/generated/activityLogs/components/ActivityLogsPage.tsx` (stub)

---

## Schema Analysis

**Current `convex/schema.ts`** defines all tables inline with full field definitions:
- tasks: 9 fields + 5 indexes + 1 searchIndex
- projects: 3 fields + 2 indexes + 1 searchIndex
- subtasks: 6 fields + 1 index
- workLogs: 4 fields + 1 index
- activityLogs: 5 fields + 2 indexes

**Generated schema fragments** (`convex/generated/{name}/schema.fragment.ts`) contain only:
- Basic field types from YAML (missing all extra fields: position, assigneeId, projectId, etc.)
- No indexes
- No searchIndexes
- No zodToConvex() for enum fields (uses plain v.string())

**Conclusion:** `convex/schema.ts` MUST NOT be changed to import from generated fragments.
The generated schema fragments are structural baselines, not production-ready schemas.
The existing hand-written schema is authoritative.

---

## Routes and Tests

**Route files** in `src/routes/_app/_auth/dashboard/` import from `@/features/tasks`,
`@/features/projects` — these should NOT change because the components are in `src/features/`.

**Test files** are co-located with the custom code they test:
- `convex/tasks/mutations.test.ts` — tests the custom tasks mutations
- `convex/projects/mutations.test.ts` — tests the custom projects mutations
- etc.
No test import changes needed.

---

## Migration Decision

**Decision:** PARTIAL MIGRATION
The directory structure (`src/generated/`, `convex/generated/`) is created as the foundation.
The generated stubs provide the baseline scaffold interface.
All functional code remains in `convex/{name}/` and `src/features/{name}/` as the custom layer.

This is the correct state — the generated/custom split architecture is in place:
- Generated stubs document what a vanilla scaffold produces
- Custom code extends/replaces the stubs with domain-specific logic
- Future improvements to the scaffold template will narrow the generated↔custom gap

**NOT performing:** Steps 3-6 of the plan (updating schema imports, routes, tests) because:
1. Schema fragments are incomplete stubs — using them would break the schema
2. Generated frontend components are stubs — using them would break the UI
3. All functional code is custom and should stay in its current location
