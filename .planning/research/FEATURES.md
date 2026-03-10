# Feature Landscape

**Domain:** Configurable task management system (CalmDo Core) built as composable feature blocks on a React + Convex SaaS starter kit
**Researched:** 2026-03-10
**Overall confidence:** MEDIUM-HIGH

---

## Table Stakes

Features users expect from any task management system. Missing any of these means the product feels incomplete or amateur.

| Feature | Why Expected | Complexity | Config Surface | Notes |
|---------|--------------|------------|----------------|-------|
| Task CRUD | Fundamental unit of work. Todoist has 30M+ users proving "just tasks" has massive value. | Low | Field shape: title, description, priority representation | Every task app starts here. Linear, Todoist, Asana all center on the task as atomic unit. |
| Status workflow | Users need to track progress. Even a checkbox (todo/done) is a status workflow. | Low | **Key config point:** 2-state (checkbox) vs 3-state (todo/in_progress/done) vs N-state (custom). Build-time choice of shape. | Linear uses Backlog/Todo/In Progress/Done/Cancelled. Todoist uses a checkbox. Both are valid -- the shape depends on workflow complexity. |
| Task list with sorting | Users need to see their tasks in meaningful order. Manual position-based sorting is expected in 2025+. | Low | Sort fields, default sort order | Drag-drop reordering is table stakes. Position field (integer) on tasks enables this. |
| Basic filtering | Filter by status at minimum. Users with 10+ tasks need this immediately. | Low | Which fields are filterable (build-time), filter values (runtime) | Status filter is table stakes. Priority filter is near-table-stakes. Project filter only if projects are enabled. |
| Search | Text search across task titles. Users with 50+ tasks cannot function without it. | Medium | Which fields are searchable | Convex has built-in search indexes. Use them. |
| Private vs shared visibility | Personal tasks must stay private. This is a trust/safety requirement. | Low | Whether visibility exists at all (build-time) | Quick tasks are private by default. Auto-flip to shared on reassignment is a smart UX pattern from DOMAIN.md. |
| Audit fields | createdAt, updatedAt, createdBy, updatedBy on every record. Not user-facing, but engineering table stakes for any serious system. | Low | None -- always present | Essential for ETL incremental loads and debugging. Already designed well in DOMAIN.md. |

---

## Differentiators

Features that set CalmDo apart from generic task apps. Not expected by default, but valuable when present.

| Feature | Value Proposition | Complexity | Config Surface | Notes |
|---------|-------------------|------------|----------------|-------|
| Projects with status lifecycle | Group tasks by initiative. Status (active/on_hold/completed/archived) gives projects lifecycle semantics beyond just "folders." | Medium | Whether projects exist at all (build-time). Project status options (build-time shape). | The composable lego question: tasks can exist without projects. Projects are an optional overlay. This optionality IS the differentiator. |
| Subtasks with promotion | Break work down AND escalate when a subtask outgrows its parent. Promotion-to-task is genuinely unusual in the market. | Medium-High | Whether subtasks exist (build-time). Whether promotion is enabled (build-time). | Linear has sub-issues. Todoist has sub-tasks. But "promote subtask to full task with spawned_from link" is rare. The promotion flow (new task + status change + link back) is the complex part. |
| Work logs (journal, not timer) | Document what was done and what was learned, with optional time. Not a time tracker -- a work journal per task. | Medium | Whether work logs exist (build-time). Whether time field is shown (runtime toggle). | Key distinction: the body (what was learned) matters more than the minutes. Any user can log on any task, not just the assignee. This is uncommon. |
| Activity logs (auto audit trail) | Know who changed what and when without anyone doing extra work. Zero-friction accountability. | Medium-High | Which actions generate logs (build-time). Activity log is always-on once enabled -- not user-created content. | Auto-generated from mutations. Cross-cutting concern woven into every mutation. The action list from DOMAIN.md (task.created, task.status_changed, etc.) is comprehensive. |
| Configurable field shapes | Status as 3-state enum vs boolean checkbox. Priority as boolean (isHighPriority) vs enum (low/medium/high/urgent). The SAME feature adapts to different team preferences. | High | **Core differentiator.** Build-time config selects field shape. Runtime config selects values within that shape. | This is the "Frappe for Convex" DNA. Most task apps hardcode their field shapes. CalmDo lets the deployer choose. |
| Quick tasks (standalone, projectless) | Tasks without a project for personal capture. GTD "inbox" pattern. Zero-friction entry point. | Low | Whether quick tasks exist independently of projects (build-time) | Todoist's entire product is essentially "quick tasks." This is the simplest possible starting configuration. |
| Composable feature blocks | Each feature is a self-contained unit that can be included or excluded. The system works with just tasks, or with tasks + projects + subtasks + work logs. | Very High | The config system itself -- which features exist. | This is not a feature users see directly. It is the architectural property that makes CalmDo a platform rather than a product. |

---

## Anti-Features

Features to explicitly NOT build in v2.0. Each has a concrete reason for exclusion.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Multi-org / organization switching | Adds massive query complexity, permission checks, and UI chrome to every screen. v2.0 is scoped to a single user's data. | User-scoped data with no org layer. Schema CAN be multi-org-ready (orgId fields) without UI support. Already decided in PROJECT.md. |
| Task links (spawned_from/blocked_by) | Explicitly excluded from v2.0 scope. blocked_by creates dependency graph complexity (cycle detection, cascading status changes). spawned_from only matters during subtask promotion. | Subtask promotion can use a simple `promotedToTaskId` on the subtask record. No separate taskLinks table needed for v2.0. |
| Kanban board | Drag-and-drop between status columns is a significant frontend investment (DnD library, optimistic position updates, multi-column state sync). Delivers visual appeal but not functional capability over a list view. | List view with inline status change (click/dropdown). Kanban is explicitly Phase 2 in ROADMAP.md. |
| Real-time collaboration (co-editing) | Convex gives reactive queries for free, but simultaneous editing of the same task by multiple users requires conflict resolution, presence indicators, and operational transforms. | Convex subscriptions handle "see updates when someone else changes something." That is sufficient. Last-write-wins for field updates. |
| Comments / mentions / questions | Phase 2 collaboration features per ROADMAP.md. Each is a separate entity with its own complexity (threading, @-mention resolution, notification triggers). | Activity log provides a read-only audit trail of changes. Comments are the gateway to collaboration -- build them when collaboration is the goal. |
| Recurring tasks | Smart recurring tasks (from PRODUCT.md) require complex timeline logic, gap handling, and instance management. Even "simple" recurring tasks need cron-like scheduling in Convex. | Simple one-off tasks only. Recurring is listed under "Future Ideas" in ROADMAP.md. |
| GTD tags / context labels | Optional complexity that adds cognitive overhead. "Hidden if unused" requires conditional UI logic in every view. The tag taxonomy design is a product design problem, not an engineering one. | Defer to after core is stable. GTD tags are explicitly "Future Ideas" in ROADMAP.md. |
| Push notifications | PRODUCT.md explicitly says "no push notifications -- deep work friendly." | Activity feed on app open ("What's New" pattern) is a future Phase 3 feature. |
| Live time tracking (start/stop timers) | Timers add significant state management (running timer across page navigations, pause/resume, background tab behavior). | Work logs with manual `timeMinutes` field. Users enter time after the fact. |
| Config system / assembler (build-time code generation from config) | Premature abstraction is the number one risk. Building the config-to-code pipeline before having 3+ concrete feature implementations means designing abstractions without evidence. | Build features first with hardcoded shapes. Extract config patterns AFTER features prove the structure. The config system is v3.0 scope per VISION.md phases. |

---

## Feature Dependencies

The critical architectural insight: features form a dependency DAG where Tasks is the root and everything else is an optional overlay.

```
FOUNDATIONAL (always present):
  Tasks ──────────────────── the atomic unit, cannot be disabled

OPTIONAL OVERLAYS (each independently toggleable at build time):
  Tasks + Projects ────────── tasks gain nullable projectId
  Tasks + Subtasks ────────── tasks gain child subtask records
  Tasks + Work Logs ───────── tasks gain child work log records
  Tasks + Activity Logs ───── mutations emit audit events (cross-cutting concern)
  Tasks + Filters ─────────── UI layer, reads existing fields on tasks
  Tasks + Search ──────────── requires Convex search index on tasks table

INTER-OVERLAY DEPENDENCIES:
  Subtask Promotion → Tasks ── promoted subtask creates a new task (always safe, tasks always exist)
  Activity Logs + Projects ─── project events need projectId context in log entries
  Filters + Projects ──────── "filter by project" dropdown requires projects to exist
  Subtasks + Projects ─────── promoted subtask inherits parent's projectId (if projects enabled)

INDEPENDENCE GUARANTEES (no dependency between these pairs):
  Work Logs  ←/→  Subtasks ──── work logs attach to tasks, subtasks are children of tasks, no interaction
  Work Logs  ←/→  Projects ──── work logs reference taskId, not projectId
  Search     ←/→  any overlay ── searches task/project titles regardless of other features
  Filters    ←/→  Search ────── independent UI mechanisms, different interaction patterns
```

### Dependency Validation Rules

Inspired by WordPress 6.5's plugin dependency system (`Requires Plugins` header):

1. **Activation order:** A feature overlay cannot be enabled unless its dependencies are enabled
2. **Deactivation protection:** A foundation feature cannot be removed if overlays depend on it
3. **Circular dependency prevention:** The DAG above has no cycles by construction (Tasks is always root)
4. **Validation timing:** Build-time, not runtime -- config file is validated before code generation

For v2.0, since all features will be built (not selectively enabled), these rules are documentation of the architectural constraints. They become enforcement rules when the config system is built in v3.0.

---

## Build-Time vs Runtime Configuration

This is the most architecturally significant decision. Based on research into Frappe's DocType system, WordPress plugin dependencies, and Bullet Train's scaffolding, the right split is:

### Build-Time Config (generates different code / schema)

| Config | Options | Effect on Generated Code |
|--------|---------|--------------------------|
| `features.projects` | `true / false` | Whether `projects` table exists in schema, project CRUD functions, ProjectList/ProjectForm components, project-related routes |
| `features.subtasks` | `true / false` | Whether `subtasks` table exists, subtask components inside TaskDetail |
| `features.workLogs` | `true / false` | Whether `workLogs` table exists, work log section in TaskDetail |
| `features.activityLogs` | `true / false` | Whether activity log emission code is woven into all mutations |
| `fields.task.status` | `"checkbox" / "three-state" / "custom"` | Shape of status field: boolean vs 3-value enum vs configurable enum. Changes schema type, UI widget, and filter options. |
| `fields.task.priority` | `"boolean" / "enum" / "none"` | Shape of priority: isHighPriority boolean, 4-level enum, or no priority field at all |
| `fields.project.status` | `"simple" / "full"` | 2-state (active/archived) vs 4-state (active/on_hold/completed/archived) |

### Runtime Config (same code, different behavior via settings)

| Config | Options | Effect |
|--------|---------|--------|
| `status.values` | `["todo", "in_progress", "done"]` | Actual status labels within the chosen build-time shape |
| `priority.values` | `["low", "medium", "high", "urgent"]` | Priority labels if enum shape was chosen |
| `workLogs.showTime` | `true / false` | Whether timeMinutes field is visible in the work log form |
| `filters.defaults` | `{ status: "todo" }` | Default filter state when user opens task list |
| `taskList.pageSize` | `25 / 50 / 100` | Number of tasks per page |

### Why This Split Matters

**Frappe's lesson:** "Everything is a DocType" works because the Frappe runtime interprets schema definitions dynamically. CalmDo cannot do this -- Convex requires `schema.ts` at compile time, and Convex functions are pre-deployed. The build-time/runtime boundary must be explicit and is dictated by Convex's architecture.

**WordPress 6.5 lesson:** `Requires Plugins` header enforces: dependent can only install after dependency is installed, dependent can only activate after dependency is active, dependency cannot be deactivated while dependents are active. CalmDo's feature config should enforce the same DAG rules at build-time validation.

**Bullet Train lesson:** Super Scaffolding generates ~30 files per entity. The generated code IS the feature -- not a runtime interpretation of config. This is the right model for CalmDo: build-time config drives Plop.js generators that emit schema, functions, components, and tests for each enabled feature block.

### v2.0 Practical Implication

For v2.0, the config file does NOT exist yet. Instead, each feature is built as a self-contained feature folder with:
- Clear imports only from `@/shared/` or its own internals
- Nullable foreign keys for cross-feature relationships (e.g., `projectId` on tasks is `v.optional()`)
- No runtime feature-flag checks ("is projects enabled?") -- all features are present
- Code structured so that a feature folder could be deleted and only import errors would result (fixable by removing those imports)

The config system is a v3.0 extraction, not a v2.0 implementation.

---

## Patterns from Real Composable Systems

### Pattern 1: Frappe's "Everything Is a DocType"
**Confidence:** HIGH (verified via Frappe blog and official docs)

Frappe treats every entity as a DocType with uniform CRUD, permissions, workflows, and audit trail. Composability comes from a unified interface (`frappe.get_doc()`, `frappe.db.sql()`) that works identically for any DocType. Modules group related DocTypes but do not create hard runtime boundaries -- any DocType can reference any other.

Key insight: Frappe achieves composability through a **minimal API surface** (5-10 core functions) rather than through fine-grained dependency injection. The framework handles "all repetitive tasks inside the Document class."

**CalmDo application:** Each feature block should expose a uniform mutation pattern. Tasks, projects, subtasks, work logs all follow the same CRUD + audit + validation structure. The uniformity of the pattern IS the composability -- not a plugin API or dependency injection framework.

### Pattern 2: WordPress Plugin Dependencies (6.5+)
**Confidence:** HIGH (verified via Make WordPress Core announcement, March 2024)

WordPress added native plugin dependency management in 6.5. The mechanism is simple: a `Requires Plugins` header in the plugin file lists comma-separated slugs. The system enforces: cannot install without dependencies present, cannot activate without dependencies active, cannot deactivate if dependents rely on you. Circular dependency detection is built in.

**CalmDo application:** The feature config (when built in v3.0) should validate the dependency DAG at build time. For v2.0, the dependency relationships are documented (above) and enforced by import structure -- if you delete the projects feature folder, the subtask promotion code that references projectId will fail to compile.

### Pattern 3: Linear's Minimal Building Blocks
**Confidence:** HIGH (verified via Linear features page, multiple reviews)

Linear centers on three concepts: Issues, Projects, Cycles. Everything else (labels, milestones, views) layers on top. The UI stays fast because the data model is simple. Linear performs 3.7x faster than JIRA and 2.3x faster than Asana -- simplicity IS the feature.

Best practice from Linear: "keep labels and statuses minimal and meaningful, revisit workflow simplicity every quarter."

**CalmDo application:** Tasks as the only mandatory entity. Projects, subtasks, work logs are all optional layers. This mirrors Linear's "Issues are the atomic unit" but adds the configurability dimension Linear does not have.

### Pattern 4: Todoist's "Tasks Are Enough"
**Confidence:** HIGH (well-documented, 30M+ users)

Todoist proves a task app can succeed with just tasks, labels, and natural language input. No projects required in the free tier. No time tracking. No subtasks in the free tier. The simplest configuration is the most popular one. Todoist's NLP task capture ("Send invoices every Friday at 4pm") removes friction that keeps people from using task tools.

**CalmDo application:** The minimal CalmDo config (just tasks, checkbox status, boolean priority) should produce something as simple as Todoist. Complexity is additive, never mandatory. If someone deploys CalmDo with only tasks enabled, it should feel complete, not broken.

### Pattern 5: Scaffold-Based Feature Assembly
**Confidence:** MEDIUM (observed across Bullet Train, Phoenix generators, Plop.js ecosystem, but no single authoritative reference architecture)

The pattern: a config file describes desired features, a scaffolding tool generates code for each feature, generated code follows strict conventions and is fully editable. The generated code IS the feature -- not a runtime interpretation of config. Bullet Train generates ~30 files per entity. Phoenix `mix phx.gen` generates context, schema, controller, templates, and tests.

**CalmDo application:** The existing Plop.js generators (route, feature, convex-function, form) are the right foundation. For v3.0, extend them to read from `calmdo.config.ts` and generate full feature folders. For v2.0, manually write the features following generator-friendly conventions (predictable file names, consistent patterns) so extraction to templates is straightforward later.

---

## MVP Recommendation

### Tier 1: Build First (vertical slices 1-2)
1. **Tasks with CRUD** -- the atomic unit, always present
2. **Status workflow (3-state)** -- todo/in_progress/done as the default shape
3. **Priority (boolean)** -- isHighPriority, simplest useful priority representation
4. **Private/shared visibility** -- trust requirement for personal quick tasks
5. **Task list with basic filtering** -- status filter, priority filter

### Tier 2: Build Second (vertical slices 3-4)
6. **Projects with status** -- first optional overlay, proves the composability pattern works
7. **Project-task relationship** -- nullable projectId on tasks, "move to project" action
8. **Project filter** -- extends existing filter UI with project dimension

### Tier 3: Build Third (vertical slices 5-6)
9. **Subtasks** -- second optional overlay, includes promotion-to-task flow
10. **Work logs** -- third optional overlay, with optional timeMinutes field

### Tier 4: Build Fourth (vertical slices 7-8)
11. **Activity logs** -- cross-cutting concern woven retroactively into existing mutations
12. **Search** -- Convex search index on task titles and project names

### Defer: Not v2.0
- Task links (spawned_from/blocked_by) -- excluded per milestone scope
- Config system / assembler -- premature abstraction, v3.0 concern
- Comments / mentions / questions -- Phase 2 collaboration per ROADMAP.md
- Kanban board -- Phase 2 UI per ROADMAP.md
- Recurring tasks, GTD tags, task recycling -- Future Ideas per ROADMAP.md

### On the Config System Timing

**Build features first. Extract config second.**

The CalmDo roadmap has the right instinct: Phase 1 (CalmDo ROADMAP.md) builds concrete features. The platform vision (VISION.md Phases 3-5) extracts the model definition language and runtime renderer later. For v2.0, "configurable" means:

1. **Code is STRUCTURED for future extraction** -- feature folders with clear boundaries, uniform patterns
2. **Cross-feature references use nullable FKs** -- projectId is `v.optional(v.id("projects"))`, not required
3. **Field shapes are isolated** -- status rendering is in one component, not scattered across 15 files
4. **No runtime feature detection** -- all features are present in v2.0, no `if (config.projects.enabled)` checks

The actual `calmdo.config.ts` file + Plop.js assembler pipeline is a v3.0 deliverable.

---

## Complexity Assessment Per Feature Block

| Feature Block | Schema | Backend | Frontend | Tests | Total | Risk Factor |
|---------------|--------|---------|----------|-------|-------|-------------|
| Tasks (CRUD + status + priority + visibility) | Low | Low | Medium | Medium | **Medium** | Low -- well-understood pattern, 7+ prior attempts have stabilized the domain model |
| Quick task visibility rules (auto-flip) | Low | Medium | Low | Medium | **Medium** | Medium -- the auto-flip from private to shared on reassignment needs careful state machine testing |
| Projects (CRUD + status lifecycle) | Low | Low | Medium | Medium | **Medium** | Low -- same CRUD pattern as tasks, independent entity |
| Task-project relationship (nullable FK) | Low | Medium | Medium | Medium | **Medium** | Medium -- "move task to project" action, nullable FK queries, filter interaction |
| Subtasks (CRUD as children of tasks) | Low | Medium | Medium | Medium | **Medium** | Low -- straightforward parent-child, position ordering |
| Subtask promotion to task | Medium | High | Medium | High | **High** | High -- atomic operation: create new task + update subtask status + set promotedToTaskId. Must be transactional. |
| Work logs | Low | Low | Medium | Medium | **Medium** | Low -- simple child entity CRUD with optional time field |
| Activity logs (auto-generated) | Medium | High | Low | High | **High** | Medium -- cross-cutting: must be woven into every existing mutation without breaking them. Logging failures must not block the primary operation. |
| Filters (status, priority, project) | None | Low | Medium | Medium | **Medium** | Low -- UI-only concern reading existing indexed fields |
| Search (Convex text search) | Low | Medium | Medium | Medium | **Medium** | Low -- Convex search indexes are well-documented, limited query flexibility is the only concern |

---

## Sources

### Composable Architecture
- [Composable Architecture 2025 - Alokai](https://alokai.com/blog/composable-architecture) -- market trends, 80% enterprise adoption
- [Composable Architecture Guide - Trantor](https://www.trantorinc.com/blog/composable-architecture) -- implementation patterns, MACH framework

### Frappe Framework
- [Writing Composable Software - Frappe Blog](https://frappe.io/blog/engineering/writing-composable-software) -- unified interface philosophy, minimal API surface
- [DocType System - DeepWiki](https://deepwiki.com/frappe/frappe/2.3-doctype-system-and-metadata-management) -- metadata management, custom fields, Meta processing
- [Frappe Module System](https://docs.frappe.io/framework/v15/user/en/basics/doctypes/modules) -- module organization patterns

### WordPress Plugin Dependencies
- [Introducing Plugin Dependencies in WordPress 6.5 - Make WordPress Core](https://make.wordpress.org/core/2024/03/05/introducing-plugin-dependencies-in-wordpress-6-5/) -- dependency declaration, activation/deactivation rules, circular detection

### Task Management Products
- [Linear Features](https://linear.app/features) -- minimal building blocks (Issues/Projects/Cycles)
- [Linear App Case Study - Eleken](https://www.eleken.co/blog-posts/linear-app-case-study) -- 3.7x faster than JIRA, simplicity as feature
- [Asana vs Todoist - Zapier](https://zapier.com/blog/asana-vs-todoist/) -- feature comparison, different success patterns
- [Linear App Review - Siit](https://www.siit.io/tools/trending/linear-app-review) -- 150K+ teams, keyboard-first design

### Build-Time Configuration
- [Feature Flags vs Configuration - PostHog](https://posthog.com/product-engineers/feature-flags-vs-configuration) -- when to use build-time vs runtime config
- [Feature Flags vs Configuration - CMU](https://www.cs.cmu.edu/~ckaestne/featureflags/) -- academic analysis, compile-time vs runtime binding

### Scaffolding and Code Generation
- [Bullet Train Super Scaffolding](https://bullettrain.co/docs/super-scaffolding) -- ~30 files per entity, living templates
- [Scaffold by hay-kot](https://hay-kot.github.io/scaffold/) -- in-project template scaffolding with feature guards

### Schema Design
- [Configuration Table Pattern - Medium](https://medium.com/@herihermawan/the-ultimate-multifunctional-database-table-design-configuration-table-pattern-4e7f1ee5ed79) -- flexible schema patterns for configurable systems
- [Task Management Schema Design - Back4App](https://www.back4app.com/tutorials/how-to-design-a-database-schema-for-a-task-and-to-do-list-management-app) -- entity relationships for task apps

---
*Feature research for: CalmDo Core configurable task management system (v2.0)*
*Researched: 2026-03-10*
