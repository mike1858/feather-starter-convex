# Project Research Summary

**Project:** CalmDo Core -- Configurable Task Management System
**Domain:** Composable feature-block task management on React + Convex SaaS starter kit
**Researched:** 2026-03-10
**Confidence:** MEDIUM-HIGH

## Executive Summary

CalmDo Core is a task management system built as composable feature blocks on an existing React 19 + Convex SaaS starter kit. The expert pattern for this type of system -- validated by Frappe, WordPress 6.5, Bullet Train, and Linear -- is to build concrete features as vertical slices first, then extract configurable patterns afterward. The existing stack (React 19, Convex, TanStack, Zod v4, Plop.js, shadcn/ui) covers every need with zero new runtime dependencies. The only new dev dependency is `tsx` for loading TypeScript config files in Plop custom actions.

The recommended approach is to build features in dependency order -- Tasks first (the atomic unit), then optional overlays (Projects, Subtasks, Work Logs), then cross-cutting concerns (Activity Logs), then polish layers (Filters, Search). Each feature follows a strict "lego block" convention: frontend feature folder, backend domain folder, shared Zod schema, with audit fields and org-scoping woven into shared infrastructure. The config system and code assembler are explicitly deferred to v3.0 -- building them before having 3+ concrete feature implementations is the single highest-risk mistake identified across all research.

The key risks are: (1) premature config abstraction becoming harder to change than the code it configures, (2) blurred build-time vs runtime config boundaries leading to neither working well, and (3) Convex's single-file schema requirement complicating composable schema generation. All three are mitigated by the same strategy: build hardcoded vertical slices first, extract patterns after multiple features prove the structure, and use the "table definitions in separate files imported into schema.ts" composition pattern from day one.

## Key Findings

### Recommended Stack

No new runtime dependencies. The existing stack handles everything. Plop.js gets extended with custom actions (`setActionType`) for config-aware code generation. Zod v4 validates both build-time config and runtime settings. Convex stores runtime config in a `settings` table with reactive queries. The one new dev dependency is `tsx` for TypeScript config loading.

**Core technologies (all existing):**
- **Plop.js + Handlebars** -- Extended with custom actions for CalmDo meta-generator; conditional templates via `{{#if}}` for feature flags
- **Zod v4** -- Config file validation via discriminated unions; runtime settings validation via `convex-helpers/server/zod4`
- **Convex `settings` table** -- Runtime config (status labels, priority modes, feature toggles) with reactive queries for instant UI updates
- **TanStack Form + shadcn/ui** -- Feature selection wizard as a 4-step structured form; no wizard library needed
- **TypeScript as config format** -- `calmdo.config.ts` with `satisfies` type checking; autocompletion; no YAML/JSON parser dependency

**What NOT to add:** ts-morph (defer until file-modification is needed), JSON Schema/AJV (Zod is the standard), Yeoman (Plop is sufficient), feature flag services (build-time assembly is not runtime flags), monorepo tools (one codebase per client).

### Expected Features

**Must have (table stakes):**
- Task CRUD -- the atomic unit of work, always present
- Status workflow (3-state: todo/in_progress/done) -- minimum viable progress tracking
- Priority (boolean: isHighPriority) -- simplest useful priority
- Private/shared visibility -- trust/safety requirement for personal tasks
- Task list with sorting and basic filtering -- status and priority filters
- Audit fields on every record -- createdAt, updatedAt, createdBy, updatedBy
- Search -- text search across task titles via Convex search indexes

**Should have (differentiators):**
- Projects with status lifecycle -- optional overlay proving composability
- Subtasks with promotion-to-task -- genuinely unusual in the market
- Work logs (journal, not timer) -- document what was learned, optional time field
- Activity logs (auto audit trail) -- zero-friction accountability
- Configurable field shapes -- status as checkbox vs enum, priority as boolean vs levels
- Quick tasks (standalone, projectless) -- GTD inbox, zero-friction entry

**Defer (not v2.0):**
- Config system / assembler -- premature abstraction, v3.0 concern
- Task links (spawned_from/blocked_by) -- dependency graph complexity
- Kanban board -- significant frontend investment for visual appeal over function
- Comments / mentions -- Phase 2 collaboration features
- Recurring tasks, GTD tags, push notifications, live time tracking

### Architecture Approach

CalmDo adds a composable feature block layer to the existing feature-folder + Convex architecture. Each block is self-contained (frontend folder + backend folder + shared schema) with dependencies flowing through shared CalmDo infrastructure (audit helpers, org-scoping, activity log writer). The schema uses extracted table definition files imported into a single `schema.ts`. Runtime config lives in a Convex `settings` table; build-time config controls which code exists.

**Major components:**
1. **CalmDo Shared Infrastructure** (`convex/calmdo/shared/`) -- Audit field helpers, org-scoped query wrappers, activity log writer used by all feature blocks
2. **Feature Blocks** (tasks, projects, subtasks, work-logs, activity-logs) -- Self-contained vertical slices with frontend, backend, and schema layers
3. **Runtime Config** (`convex/calmdo/settings/`) -- Key-value settings table per org; drives UI behavior without code changes
4. **Extracted Table Definitions** (`convex/calmdo/tables/`) -- One file per table, imported into `schema.ts`; enables composable schema without generator touching the root file
5. **Shared Zod Schemas** (`src/shared/schemas/calmdo/`) -- Single source of truth for entity validation, shared between frontend forms and backend mutations

### Critical Pitfalls

1. **Premature config abstraction** -- Building the config-to-code pipeline before having 3+ concrete features guarantees the abstraction will be wrong. Prevention: build features as hardcoded vertical slices first, extract config patterns AFTER duplication reveals what actually needs configuring.

2. **Build/runtime config boundary blur** -- Status options start as runtime config, then someone needs a status that triggers a workflow (build-time logic). Prevention: hard rule -- build-time controls what code exists, runtime controls values within that code. If a config change requires code changes, it is build-time config.

3. **Convex schema.ts monolith** -- The generator must not touch `schema.ts` directly. Prevention: extract table definitions to separate files, import into `schema.ts`. Generator produces new files, never modifies existing ones.

4. **Feature interdependency explosion** -- Making hard dependencies "configurable" creates 2^N configurations to test. Prevention: only Projects-Tasks is genuinely optional. Everything else (Subtasks, Work Logs, Activity Logs) has hard dependencies on Tasks. Test two configurations: with Projects, without Projects.

5. **LLM-generated wiring bugs** -- LLMs produce plausible but wrong inter-feature wiring and tests that verify the bugs. Prevention: LLM fills in templates (not generates from scratch), tests come from behavioral specs (not from LLM), build 2-3 features manually first to create the templates.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation Infrastructure
**Rationale:** Every CalmDo feature depends on audit fields, org-scoping, and the settings table. Must exist before any domain feature.
**Delivers:** Organizations table, settings table with defaults, audit field helpers, org-scoped query wrapper, `users.orgId` addition, default org in init.ts, extracted table definition pattern in schema.ts
**Addresses:** Audit fields (table stakes), org-scoping foundation
**Avoids:** Pitfall 3 (schema monolith) by establishing the "table files imported into schema.ts" pattern from the start; Pitfall 11 (referential integrity) by building reference validation into mutation helpers

### Phase 2: Tasks (Standalone Quick Tasks)
**Rationale:** Tasks are the atomic unit -- every other feature depends on them. Must work standalone as "quick tasks" to validate the simplest possible configuration.
**Delivers:** Task CRUD, 3-state status workflow, boolean priority, private/shared visibility, My Tasks list view with status/priority filters
**Addresses:** Task CRUD, status workflow, priority, visibility, basic filtering (all table stakes)
**Avoids:** Pitfall 1 (premature config) by building hardcoded Tasks first; Pitfall 6 (schema validation) by deciding `v.string()` vs `v.union()` for status fields here

### Phase 3: Projects
**Rationale:** Independent entity that proves the composability pattern -- projects work without any other overlay. Building them separately from Tasks validates that feature blocks are truly self-contained.
**Delivers:** Project CRUD, project status lifecycle (active/on_hold/completed/archived), Projects List view
**Addresses:** Projects with status lifecycle (differentiator)
**Avoids:** Pitfall 2 (dependency explosion) by building Projects independently before wiring to Tasks

### Phase 4: Project-Task Relationship
**Rationale:** Wiring after both entities exist is cleaner than building the relationship during creation. Validates the "optional overlay" architecture -- Tasks genuinely worked without Projects.
**Delivers:** Optional projectId on tasks, "move task to project" action, project filter on task list, project-scoped task views
**Addresses:** Project-task relationship, project filter (differentiator)
**Avoids:** Pitfall 7 (cascade deletes) by implementing centralized cascade from the start; Pitfall 11 (referential integrity) by validating projectId references in mutations

### Phase 5: Subtasks
**Rationale:** Second child-of-tasks overlay. Introduces the most complex single operation (subtask promotion to task).
**Delivers:** Subtask CRUD within task detail, position-based ordering, promotion-to-task flow
**Addresses:** Subtasks with promotion (differentiator)
**Avoids:** Pitfall 12 (position ordering) by using fractional indexing from the start

### Phase 6: Work Logs
**Rationale:** Third child-of-tasks overlay. Simpler than subtasks -- straightforward CRUD with optional time field. Independent of subtasks and projects.
**Delivers:** Work log CRUD within task detail, timeline display, optional timeMinutes field
**Addresses:** Work logs / journal (differentiator)

### Phase 7: Activity Logs
**Rationale:** Cross-cutting concern that hooks into mutations from all previous phases. Building last means all events to capture already exist. Can retroactively add `scheduler.runAfter` calls to existing mutations.
**Delivers:** Auto-generated audit trail, activity timeline UI, `logActivity` internal mutation
**Addresses:** Activity logs / audit trail (differentiator)
**Avoids:** Pitfall 8 (activity log explosion) by designing pagination and compound indexes upfront

### Phase 8: Search and Polish
**Rationale:** Polish layer that requires all queryable data in place. Convex search indexes are well-documented -- low risk.
**Delivers:** Text search across task/project titles, search UI in header, refined filter controls
**Addresses:** Search (table stakes)

### Phase Ordering Rationale

- **Infrastructure before features** because audit fields and org-scoping are used by every mutation. Building them as an afterthought means retrofitting every existing function.
- **Tasks before everything** because Tasks are the only mandatory entity. The dependency DAG has Tasks as the root node.
- **Projects independent, then wired** because this proves composability -- Tasks genuinely work alone. If Projects were built simultaneously with Tasks, you cannot verify the "Tasks without Projects" configuration.
- **Subtasks and Work Logs are independent** -- they only depend on Tasks, not each other. Could be built in either order or in parallel.
- **Activity Logs late** because they hook into all other mutations. Building them last is a mechanical addition (one `scheduler.runAfter` call per mutation), not a design challenge.
- **Search last** because it is a UI polish layer reading existing indexed data.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Foundation):** The `users.orgId` addition is the highest-risk integration point with the existing auth-managed table. Needs careful planning around onboarding flow and migration.
- **Phase 2 (Tasks):** The `v.string()` vs `v.union()` decision for status fields affects every subsequent phase. Needs a concrete spike to evaluate DX trade-offs.
- **Phase 5 (Subtasks):** Subtask promotion is the most complex single operation (create task + update subtask + optional link). Needs behavioral spec before implementation.
- **Phase 7 (Activity Logs):** Cross-cutting wiring into all existing mutations. Verify `ctx.scheduler.runAfter(0, internalMutation)` pattern works as expected in Convex.

Phases with standard patterns (skip research-phase):
- **Phase 3 (Projects):** Standard CRUD entity, same pattern as Tasks. Well-documented.
- **Phase 6 (Work Logs):** Simple parent-child CRUD. No novel patterns.
- **Phase 8 (Search):** Convex search indexes are well-documented with clear API.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. All tools already validated in existing codebase. tsx is the only addition (13M+ weekly downloads). |
| Features | MEDIUM-HIGH | Feature list well-grounded in domain research (Frappe, Linear, Todoist patterns). Config system timing (defer to v3.0) is opinionated but well-reasoned. |
| Architecture | MEDIUM-HIGH | Patterns verified against existing codebase and Convex constraints. Open questions remain around `v.string()` vs `v.union()` and `scheduler.runAfter` for activity logs. |
| Pitfalls | HIGH | Grounded in 7+ prior implementation attempts (LESSONS.md). Process pitfalls (premature abstraction, LLM over-trust) are proven failure modes, not speculative. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **`v.string()` vs `v.union()` for configurable enums:** Architecturally `v.string()` is right for runtime configurability, but the DX impact (loss of type narrowing in queries) needs validation during Phase 2. Spike this early.
- **`ctx.scheduler.runAfter(0, internalMutation)` pattern:** Recommended for activity log writes but needs verification that Convex supports calling internalMutations via scheduler from within a mutation. Test during Phase 1 infrastructure.
- **`users.orgId` migration path:** Adding orgId to the auth-managed users table requires careful handling of existing users without orgId. The onboarding flow must set this. Plan the migration during Phase 1.
- **Settings table query performance at scale:** Every mutation that validates status or checks feature toggles queries the settings table. At small scale this is fine. Consider caching strategy if performance becomes an issue.
- **Subtask promotion atomicity:** The promotion flow (create task + update subtask status + optional link + activity log) must be atomic. Verify whether a single Convex mutation can handle this without hitting transaction limits.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis -- `convex/schema.ts`, `src/features/`, `plopfile.js`, established patterns
- CalmDo domain artifacts -- `_calmdo/DOMAIN.md`, `_calmdo/LESSONS.md`, `_calmdo/PRODUCT.md`
- v1.0 architecture research -- `.planning/research/ARCHITECTURE.md` (2026-03-09), patterns verified in implementation
- Convex documentation -- schema validation, `defineSchema`, search indexes, `scheduler.runAfter`
- Plop.js documentation -- `setActionType` API, custom actions, conditional templates

### Secondary (MEDIUM confidence)
- Frappe composable architecture -- blog and docs on DocType system, minimal API surface pattern
- WordPress 6.5 plugin dependencies -- dependency DAG enforcement, activation/deactivation rules
- Linear and Todoist feature analysis -- minimal building blocks, simplicity as competitive advantage
- Bullet Train super scaffolding -- ~30 files per entity, generated code IS the feature

### Tertiary (LOW confidence)
- `v.string()` vs `v.union()` DX impact -- architecturally sound recommendation but needs hands-on validation
- Activity log write pattern via `scheduler.runAfter` -- standard Convex pattern but internalMutation interaction unverified
- Settings table caching strategy -- premature optimization concern, address if measured

---
*Research completed: 2026-03-10*
*Ready for roadmap: yes*
