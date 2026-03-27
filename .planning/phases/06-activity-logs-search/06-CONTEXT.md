# Phase 6: Activity Logs & Search - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

System auto-generates audit trail entries for task, project, and subtask events. Task detail panel shows a combined timeline of activity entries + work logs. Users can filter tasks/projects by status, priority, project, and assignee. Users can text-search across task titles, descriptions, and project names.

</domain>

<decisions>
## Implementation Decisions

### Activity Timeline Display
- **D-01:** Compact single-line entries in the task detail side panel (from Phase 5)
- **D-02:** Each entry: icon + actor name + action description + relative timestamp
- **D-03:** Work log entries get a second line for the description text
- **D-04:** Entries grouped by date: "Today", "Yesterday", "Mar 25" etc.
- **D-05:** Timeline shows both auto-generated activity logs AND work logs in chronological order (newest first)

### Auto-Logging Strategy
- **D-06:** Activity logging is inline in mutations — each mutation that changes state also inserts an `activityLogs` entry
- **D-07:** Activity log schema: `entityType` (task/project/subtask), `entityId`, `action` (created/status_changed/assigned/edited/deleted/completed/promoted), `actor` (userId), `metadata` (JSON — e.g., `{ from: "todo", to: "done" }`), timestamp via `_creationTime`
- **D-08:** Events to log: task (created, status_changed, assigned, unassigned, edited, deleted), project (created, status_changed, edited), subtask (created, completed, promoted)

### Search
- **D-09:** Search box in the page TitleBar component, next to view switcher — searches within current view
- **D-10:** Full-text search across task titles + descriptions, project names
- **D-11:** Uses Convex search indexes with `searchField` and `filterFields`
- **D-12:** Search is per-view: Tasks page searches tasks, Projects page searches projects

### Filter Controls
- **D-13:** Horizontal filter bar below title bar on task views (My Tasks, Team Pool)
- **D-14:** Filter components: Status tabs (All|Todo|In Progress|Done) + High Priority toggle + Project dropdown + Assignee dropdown
- **D-15:** Reuses Phase 4's horizontal tab pattern (D-11) for status filtering
- **D-16:** Filter state persisted in URL search params for back-navigation (per Phase 4, D-12)

### Claude's Discretion
- Activity entry icon selection (different icons per action type)
- Empty timeline state ("No activity yet")
- Search debounce timing
- Filter dropdown styling (reuse existing Select components or custom)
- Whether to show activity count badge on the timeline section header

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Kiro Specs
- `_reference/kiro-specs/06-work-tracking/requirements.md` — Activity timeline requirements (Req 2: AC 2.1-2.5)
- `_reference/kiro-specs/06-work-tracking/design.md` — Technical design for activity logs and timeline

### Prior Phase Context
- `.planning/phases/04-projects/04-CONTEXT.md` — Filter tab pattern (D-11, D-12, D-16), project detail filters (D-16)
- `.planning/phases/05-subtasks-work-logs/05-CONTEXT.md` — Side panel (D-01), work log display (D-13, D-14)

### Convex Documentation
- Convex search indexes documentation for full-text search setup

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/tasks/components/TaskStatusBadge.tsx` — Status badge with color mapping (reuse for activity action icons)
- `src/features/tasks/components/TasksPage.tsx` — TitleBar + view switcher pattern (add search here)
- Phase 5 side panel component — timeline section lives here
- Phase 4 filter tab pattern — reuse for task status tabs

### Established Patterns
- Zod schemas in `src/shared/schemas/` → `zodToConvex()` for Convex validators
- `zCustomMutation` for validated input, plain `mutation` for simple ops
- Auth guards via `auth.getUserId(ctx)` in every mutation
- i18n via `useTranslation` with namespace per feature
- URL search params for filter persistence

### Integration Points
- Every existing task/project/subtask mutation needs an `activityLogs` insert added
- Task detail panel (Phase 5) gets a new "Activity" section below work logs
- TitleBar component gets a search input prop
- TasksPage and ProjectsPage get filter bar components
- `convex/schema.ts` gets `activityLogs` table + search indexes on tasks/projects

</code_context>

<specifics>
## Specific Ideas

- Timeline inspired by Linear's activity feed — compact, scannable
- Activity logging pattern similar to Rails' paper_trail or Django's auditlog — explicit per-mutation
- Search uses Convex's built-in search indexes (not external search service)
- Filter bar inspired by Linear's filter controls — horizontal, always visible

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-activity-logs-search*
*Context gathered: 2026-03-27*
