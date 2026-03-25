# Phase 4: Projects - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Add project CRUD with a 4-value status lifecycle (active/on_hold/completed/archived), project-task relationship (optional projectId on tasks), and two new views: Projects List (card grid with status filter tabs) and Project Detail (standalone page with task list, filters, status summary bar, and inline task creation). Sidebar navigation gains a dynamic "Projects" section listing active projects.

</domain>

<decisions>
## Implementation Decisions

### Sidebar Navigation Structure
- **D-01:** Sidebar gets a "Projects" section header (clickable — links to `/dashboard/projects`) with individual active projects listed below it
- **D-02:** Only active-status projects appear in the sidebar; on_hold/completed/archived visible from the Projects list page
- **D-03:** Nav component needs a Convex query for active projects (dynamic section, not static nav items)

### Task-to-Project Assignment Flow
- **D-04:** Project dropdown added to existing task create/edit form (optional field — blank = quick task)
- **D-05:** No separate "Move to Project" context menu action — the form dropdown is sufficient
- **D-06:** Assigning a task to a project auto-flips visibility to "shared" (per kiro spec AC 2.2 and domain model)
- **D-07:** Removing a task from a project restores visibility to "private" if creator=assignee, otherwise stays "shared"
- **D-08:** Inline task creation on project detail page — an "Add task" input pre-fills projectId

### Project List Presentation
- **D-09:** Projects displayed as cards in a responsive grid (2-3 columns)
- **D-10:** Each card shows: project name, status badge (color-coded), task count (number only — no summary bar on cards), and a menu button (edit/delete)
- **D-11:** Status filter via horizontal tabs: All | Active | On Hold | Completed | Archived (default: Active)
- **D-12:** Status filter persisted in URL as search param (`?status=active`) for back-navigation preservation

### Project Detail Page
- **D-13:** Standalone full page at `/dashboard/projects/:projectId` (not a master-detail layout)
- **D-14:** Header shows: project name, inline status dropdown (click to change), menu button (edit name/delete)
- **D-15:** Status summary bar below header: "3 todo · 2 in progress · 5 done" with colored progress bar
- **D-16:** Filter controls: Status dropdown, Assignee dropdown, High Priority checkbox
- **D-17:** Task list reuses existing TaskItem/TaskList components from Phase 3

### Delete Cascade UX
- **D-18:** Double-confirm with task count: "Delete 'Project Name'? This will also delete N tasks in this project."
- **D-19:** Uses existing `useDoubleCheck` hook pattern from task delete

### Claude's Discretion
- Project card visual details (shadows, padding, hover states) — follow existing UI patterns
- Filter controls styling and positioning — follow existing patterns or make reasonable choices
- "Back to Projects" link styling on detail page
- Empty state messaging (no projects, no tasks in project)
- Project name edit UX (inline vs dialog) — from the menu button
- Whether task filters on project detail page also persist in URL search params

### Folded Todos
None — no matching todos for this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Domain Model
- `_calmdo/DOMAIN.md` — Project entity definition, delete policy (cascade to tasks+work logs), status flow diagram, task-project relationship rules
- `_calmdo/DOMAIN.md` §Quick task rules — Visibility auto-flip when moving tasks to/from projects

### Kiro Feature Specs
- `_reference/kiro-specs/04-project-management/requirements.md` — 5 requirements with acceptance criteria (project CRUD, task creation in project, project view, project list, moving tasks)
- `_reference/kiro-specs/04-project-management/design.md` — Data model, API design, component wireframes, cascade delete design, status colors, correctness properties

### Phase Research
- `.planning/phases/04-projects/04-RESEARCH.md` — Architecture patterns, code examples, pitfalls (by_project index, optional projectId in queries, route naming), test map

### Existing Code Patterns
- `src/shared/schemas/tasks.ts` — Zod schema pattern to follow for projects
- `convex/tasks/mutations.ts` — Mutation patterns (auth guard, error handling)
- `convex/tasks/queries.ts` — Query patterns (auth guard, return conventions)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TaskItem`, `TaskList` components — reuse inside project detail view for displaying project tasks
- `TaskForm` component — extend with optional project dropdown field
- `TaskStatusBadge` component — pattern reference for `ProjectStatusBadge`
- `useDoubleCheck` hook (`src/ui/use-double-check.ts`) — reuse for cascade delete confirmation
- Radix `Select` component (`src/ui/select.tsx`) — for status dropdown and filter controls
- `asyncMap` from `convex-helpers` — for cascade delete (already used in auth account cleanup)

### Established Patterns
- Zod schema in `src/shared/schemas/` → `zodToConvex()` in `convex/schema.ts` — follow exactly
- `zCustomMutation` for user input validation, plain `mutation` for simple ops
- Auth guard first: `if (!userId) return;` for mutations, `return []`/`return null` for queries
- Data-driven nav in `src/shared/nav.ts` — but dynamic projects section needs a query, not static items
- i18n namespace per feature with JSON files in `public/locales/{en,es}/`
- Error constants in root `errors.ts` under domain key

### Integration Points
- `convex/schema.ts` — Add `projects` table with `zodToConvex` validators; add `by_project` index on tasks table (currently missing)
- `src/shared/nav.ts` — Projects section replaces a static nav item with a dynamic query-driven section
- `src/shared/errors.ts` — Add `projects` error group
- `src/i18n.ts` — Add `projects` namespace
- `public/locales/{en,es}/projects.json` — Translation files
- Task create/update mutations — Accept optional `projectId`, auto-flip visibility
- Dashboard navigation component — Needs restructuring to support dynamic projects section

</code_context>

<specifics>
## Specific Ideas

- Tasks table already has `projectId: v.optional(v.id("projects"))` from Phase 3 — the field exists, just needs the `projects` table and `by_project` index
- Kiro design.md has specific wireframes for project card layout and project detail layout — reference those
- Status colors from kiro spec: active=green, on_hold=amber, completed=gray, archived=gray (dimmed)
- Research identified that `by_project` index does NOT exist yet on tasks table — must be added as first step

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-projects*
*Context gathered: 2026-03-25*
