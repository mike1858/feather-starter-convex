# Phase 5: Subtasks & Work Logs - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can break tasks into subtasks (with promotion to full tasks) and log work with optional time tracking. This phase adds a task detail surface (side panel) that becomes the home for subtasks, work logs, and eventually the activity timeline (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Task Detail Surface
- **D-01:** Side panel / drawer that slides in from the right when clicking a task (Linear-style)
- **D-02:** Task list stays visible behind the panel — user keeps context while viewing details
- **D-03:** URL updates to reflect selected task (e.g., `/dashboard/tasks/:id`) for deep linking
- **D-04:** Claude's Discretion: panel width (~40-50%), close behavior (click-outside vs explicit close button), overlay dimming

### Subtask Presentation
- **D-05:** Checklist style — checkbox + title per subtask, compact and familiar (Linear/Notion/GitHub)
- **D-06:** Completion count displayed above checklist: "3/5 done"
- **D-07:** Drag-to-reorder subtasks (reuses dnd-kit pattern from Phase 3 task reorder)
- **D-08:** Inline text input at bottom of checklist to add new subtasks (type + Enter, no modal)
- **D-09:** Each subtask shows: checkbox, title, optional assignee (small avatar or @name)

### Work Log Entry & Display
- **D-10:** Inline form below subtasks in the panel — always visible, like a comment box
- **D-11:** Form has: text area for description + time input side by side + "Log work" submit button
- **D-12:** Smart time parsing for input: accepts "30m", "1h30m", "1.5h", "90" (defaults to minutes) — normalized to minutes in storage
- **D-13:** Work log entries display: author, time spent (formatted as "1h 30m"), relative timestamp, description text
- **D-14:** Task detail panel header shows total time logged: "(2h 30m total)"

### Subtask Promotion
- **D-15:** Promote creates a new full task with the subtask's title
- **D-16:** Subtask stays in checklist but marked as "promoted" with a link icon (⇗) pointing to the new task
- **D-17:** Promoted task inherits parent's project (if any) and starts with status "todo"
- **D-18:** Promoted subtask is visually distinct (strikethrough or muted) and not toggleable

### Claude's Discretion
- Panel width and close behavior (D-04)
- Edit/delete UI for work log entries (inline editing vs menu)
- Subtask assignee picker implementation (dropdown vs @mention)
- Work log entry ordering (newest first vs oldest first)

### Generator-First Workflow
- **D-19:** Every new entity (subtasks, workLogs) MUST be scaffolded via `npx plop feature -- --yamlPath <yaml>` BEFORE writing custom code
- **D-20:** Create a `.gen.yaml` for each entity, run the generator, then customize the output for domain-specific logic (e.g., promotion, ownership rules, time parsing)
- **D-21:** This validates the Phase 03.2 generators with real production entities — bugs found here feed back to template fixes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Kiro Specs (Work Tracking)
- `_reference/kiro-specs/06-work-tracking/requirements.md` — Work log and activity timeline requirements with acceptance criteria
- `_reference/kiro-specs/06-work-tracking/design.md` — Technical design for work logging and task relationships
- `_reference/kiro-specs/06-work-tracking/tasks.md` — Task breakdown for work tracking implementation

### Kiro Specs (Task Details)
- `_reference/kiro-specs/05-task-details/requirements.md` — Task detail view requirements
- `_reference/kiro-specs/05-task-details/design.md` — Technical design for task detail surface

### Prior Phase Context
- `.planning/phases/04-projects/04-CONTEXT.md` — Project-task relationship decisions (D-17: reuse TaskItem/TaskList)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/tasks/components/TaskItem.tsx` — Existing task list item (will be clickable to open panel)
- `src/features/tasks/components/TaskList.tsx` — Task list with drag-reorder via dnd-kit
- `src/features/tasks/components/TaskStatusBadge.tsx` — Status badge with color + transitions
- `src/features/tasks/components/TaskForm.tsx` — Inline create form pattern
- `src/ui/use-double-check.ts` — Double-confirm delete hook (reuse for subtask/work log delete)

### Established Patterns
- Zod schemas in `src/shared/schemas/` → Convex validators via `zodToConvex()`
- `zCustomMutation` for user input validation, plain `mutation` for simple ops
- Auth guards via `auth.getUserId(ctx)` in every mutation
- dnd-kit for drag-reorder (already in tasks)
- i18n via `useTranslation` with namespace per feature

### Integration Points
- Task detail panel opens from TaskItem click (My Tasks, Team Pool, Project Detail views)
- Subtasks table in `convex/schema.ts` with `taskId` foreign key
- Work logs table in `convex/schema.ts` with `taskId` foreign key
- `convex/_generated/api.d.ts` needs codegen after schema changes

</code_context>

<specifics>
## Specific Ideas

- Subtask checklist inspired by Linear's subtask list and Notion's todo blocks
- Work log inline form similar to a comment/chat input area
- Smart time parsing similar to Toggl/Harvest (accepts various formats)
- Promoted subtask visual treatment: ⇗ icon + link to new task, distinct from done/undone states

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-subtasks-work-logs*
*Context gathered: 2026-03-27*
