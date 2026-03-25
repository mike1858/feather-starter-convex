# Phase 4: Projects - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 04-projects
**Areas discussed:** Sidebar nav structure, Task-to-project assignment flow, Project list presentation, Project detail page features

---

## Sidebar Nav Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single 'Projects' link | One nav item linking to /dashboard/projects. Simple, consistent with My Tasks / Team Pool pattern. | |
| Projects section with list | A 'Projects' header in sidebar with each active project listed below it. Dynamic — requires querying projects in the nav component. | ✓ |
| Collapsible projects section | A 'Projects' header that expands/collapses to show individual projects. More complex to build. | |

**User's choice:** Projects section with list
**Notes:** User wants the sidebar to dynamically list projects, matching VIEW-06 description.

### Follow-up: Nav Filter

| Option | Description | Selected |
|--------|-------------|----------|
| Active only | Only active projects in sidebar. Others visible from Projects list page. | ✓ |
| Active + on_hold | Show active and on_hold projects. | |
| All projects | Show every project regardless of status. | |

**User's choice:** Active only

### Follow-up: Header Link

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, clickable header | Clicking 'Projects' goes to /dashboard/projects. Individual project names go to project detail. | ✓ |
| No, just a section label | Header is non-clickable. | |

**User's choice:** Yes, clickable header

---

## Task-to-Project Assignment Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Project dropdown in task form | Add optional 'Project' dropdown to existing task create/edit form. Reuses existing form pattern. | ✓ |
| Context menu action | Add 'Move to Project ▸' to each task's dropdown menu. Keeps task form simple. | |
| Both | Project dropdown in form AND context menu action. Most flexible but more to build. | |

**User's choice:** Project dropdown in task form

### Follow-up: Visibility Auto-flip

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, auto-flip to shared | Matches kiro spec and domain model. Project tasks are team-visible by definition. | ✓ |
| No, keep current visibility | Let users control visibility independently. | |

**User's choice:** Yes, auto-flip to shared

### Follow-up: Create in Context

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, inline task creation | An 'Add task' input at the top of the project detail task list. Pre-fills projectId. | ✓ |
| No, use existing task form | Users create tasks from My Tasks and assign to project via dropdown. | |

**User's choice:** Yes, inline task creation

---

## Project List Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Cards grid | Card per project in responsive grid (2-3 columns). Matches kiro spec AC 4.4. | ✓ |
| Simple list rows | One row per project. Compact, fits more projects on screen. | |
| Table | Structured table with sortable columns. More data-dense but less visual. | |

**User's choice:** Cards grid

### Follow-up: Status Filter

| Option | Description | Selected |
|--------|-------------|----------|
| Tabs | Horizontal tabs: All, Active, On Hold, Completed, Archived. Default: Active. Status in URL. | ✓ |
| Dropdown select | Single dropdown. Compact, saves vertical space. | |
| You decide | Claude picks the best approach. | |

**User's choice:** Tabs

### Follow-up: Card Detail

| Option | Description | Selected |
|--------|-------------|----------|
| Number only | Just '12 tasks' on the card. Summary bar is for detail page. | ✓ |
| Summary bar on cards | Each card shows a mini progress bar. More info but busier. | |

**User's choice:** Number only

---

## Project Detail Page Features

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone full page | Own page at /dashboard/projects/:projectId. Back button to list. Simple, consistent. | ✓ |
| Projects layout (list + detail) | Master-detail layout. More complex but keeps context. | |

**User's choice:** Standalone full page

### Follow-up: Status Edit

| Option | Description | Selected |
|--------|-------------|----------|
| Inline dropdown in header | Click status badge to change. Quick, no form needed. | ✓ |
| Edit form only | Status changes through project edit dialog. More deliberate. | |
| You decide | Claude picks the approach. | |

**User's choice:** Inline dropdown in header

### Follow-up: Delete UX

| Option | Description | Selected |
|--------|-------------|----------|
| Double-confirm with task count | Shows cascade impact: "This will also delete N tasks." Uses useDoubleCheck. | ✓ |
| Simple confirmation | Standard 'Are you sure?' dialog. | |
| You decide | Claude picks based on existing patterns. | |

**User's choice:** Double-confirm with task count

---

## Claude's Discretion

- Project card visual details (shadows, padding, hover states)
- Filter controls styling and positioning
- "Back to Projects" link styling
- Empty state messaging
- Project name edit UX (inline vs dialog)
- Whether task filters on project detail page persist in URL

## Deferred Ideas

None — discussion stayed within phase scope
