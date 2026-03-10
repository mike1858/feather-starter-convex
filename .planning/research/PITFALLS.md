# Domain Pitfalls

**Domain:** Config-driven composable feature system (task management on Convex)
**Researched:** 2026-03-10

---

## Critical Pitfalls

Mistakes that cause rewrites, broken inter-feature wiring, or config systems that become harder to change than the code they were meant to replace.

---

### Pitfall 1: The Config System Becomes Harder to Change Than Hardcoded Code

**What goes wrong:** Teams build a config-driven system to "make things configurable" but the config schema itself becomes rigid, deeply coupled, and impossible to evolve. Adding a new feature block (e.g., "Comments") requires modifying the config parser, the code generator, the runtime resolver, the validation layer, and the test infrastructure. The config system that was supposed to eliminate boilerplate becomes the boilerplate.

**Why it happens:** Config-driven systems have an inversion problem: flexibility in the output requires rigidity in the machinery. Every new "dimension" of configuration (feature presence, feature relationships, field shapes, status options) multiplies the complexity of the assembly layer. Teams underestimate this because each dimension seems simple in isolation.

**Consequences:** The config system ossifies faster than the features it configures. Adding a new feature block takes longer with the config system than it would have taken to write the code directly. The team starts working around the config system instead of through it.

**Prevention:**
1. Start with EXACTLY the features listed in the milestone (Tasks, Projects, Subtasks, Work Logs, Activity Logs) hardcoded as vertical slices. Do NOT build the config system first.
2. Build the second client deployment by copying and modifying the codebase manually. Let the pain of manual duplication reveal which parts ACTUALLY need configuration.
3. Only then extract config-driven patterns from the concrete implementations. Extract, don't predict.
4. Limit configuration dimensions ruthlessly: status options and priority levels are worth configuring. Feature presence and relationships are worth configuring. Field shapes and validation rules are probably NOT worth configuring (they change too rarely to justify the machinery).

**Detection:** If the config schema has more lines than a single feature's implementation, the abstraction is premature. If adding a new feature to the config takes more than a day, the config system has failed its purpose.

**Phase mapping:** This is a sequencing pitfall. The first phases must build concrete features as vertical slices. Config extraction happens AFTER multiple features exist and duplication patterns are visible. Reference: LESSONS.md Lesson 1 -- "Plans with embedded code don't work" applies here as "Config before features doesn't work."

---

### Pitfall 2: Feature Interdependency Creates a Dependency Graph That Prevents Independent Delivery

**What goes wrong:** The domain model (DOMAIN.md) shows deep relationships: Tasks belong to Projects, Subtasks belong to Tasks, Work Logs belong to Tasks, Activity Logs reference both Tasks and Projects, Task Links connect Tasks to Tasks, and Subtask promotion creates new Tasks with Task Links. Modeling these as "composable blocks" that can be independently toggled creates a combinatorial explosion of valid/invalid states.

**Why it happens:** The config says "Tasks + Projects = optional relationship" but the code has `task.projectId: v.optional(v.id("projects"))`, meaning every query, mutation, and UI component that touches tasks must handle the "project exists" and "project doesn't exist" branches. When you add Subtasks (which reference Tasks) and Activity Logs (which reference both Tasks and Projects), the branching compounds. Each feature's code must be aware of every other feature's presence/absence.

**Consequences:**
- Testing surface explodes: N features with optional relationships = 2^N valid configurations, each needing test coverage
- Runtime bugs in rare configurations: "Tasks without Projects" works, "Tasks with Projects but without Activity Logs" breaks because the task mutation assumes Activity Logs exist
- Cascading deletes become configuration-dependent: deleting a Project deletes Tasks (per DOMAIN.md), but only if Tasks are configured as project-scoped

**Prevention:**
1. Define a strict dependency DAG, not a free-form feature toggle system. Activity Logs REQUIRE Tasks. Work Logs REQUIRE Tasks. Subtasks REQUIRE Tasks. Task Links REQUIRE Tasks. Projects are truly optional (Tasks work standalone as Quick Tasks).
2. Only the Projects-Tasks relationship is genuinely optional. Everything else is a hard dependency. Making hard dependencies "configurable" creates complexity without value.
3. For the one optional relationship (Projects-Tasks), use a single boolean config (`hasProjects: true`) and implement it as a conditional import, not a runtime branch in every component.
4. Test the two valid configurations: "with Projects" and "without Projects." Do NOT test arbitrary feature combinations.

**Detection:** If you're writing `if (config.hasFeature('workLogs'))` inside a task mutation, the dependency model is wrong. Work Logs should be a module that hooks into Tasks, not a conditional inside Tasks.

**Phase mapping:** Must be resolved in the FIRST design phase. The dependency DAG determines the vertical slice order: Tasks first, then features that depend on Tasks (Subtasks, Work Logs, Activity Logs, Task Links), then the optional Projects layer.

---

### Pitfall 3: Convex schema.ts Monolith Blocks Composable Schema Generation

**What goes wrong:** Convex requires a single `convex/schema.ts` file with a single `defineSchema()` call. The v2.0 vision of "config file generates schema" means the code generator must produce a complete, valid `schema.ts` that includes BOTH the existing starter kit tables (users, plans, subscriptions, authTables) AND the new CalmDo tables (tasks, projects, subtasks, etc.). If the generator overwrites `schema.ts`, it destroys the existing tables. If it tries to merge, it must parse and understand the existing schema.

**Why it happens:** Convex's schema is monolithic by design. There is no `schema.d/` directory, no `extend()` API, no partial schema files. The existing `schema.ts` already has complex logic (zodToConvex conversions, exported validators, type aliases). A code generator cannot simply append tables -- it must integrate with the existing file structure.

**Consequences:**
- Generator overwrites existing schema: users, plans, subscriptions tables disappear, auth breaks
- Generator produces invalid schema: Convex deploy fails, no partial deploys possible
- Manual merge required after every generation: defeats the purpose of code generation
- Schema validation prevents deploying if data doesn't match: changing a field type requires a migration, not just a config change

**Prevention:**
1. Use the "compose in schema.ts" pattern already established in the codebase: the existing `schema.ts` spreads `...authTables`. New domain tables should be defined in separate files (e.g., `convex/tables/tasks.ts`) that export `defineTable()` calls, then imported and spread into the single `defineSchema()`.
2. The generator NEVER touches `schema.ts` directly. It generates table definition files (`convex/tables/tasks.ts`), and `schema.ts` imports them. Adding a new feature = adding a new import + spread, not rewriting the file.
3. For runtime config (status options, priority levels): store these in a Convex `featureConfig` table, NOT in the schema. Schema defines the structure; runtime config defines the values.
4. Use `v.union()` for status enums in the schema but load the actual valid values from the config table at runtime. This means the schema allows all possible statuses across all clients, but each client's config restricts which are valid.

**Detection:** If the code generator has a "parse existing schema.ts" step, the approach is wrong. The generator should only produce new files, never modify existing ones.

**Phase mapping:** Schema composition pattern must be established in the first vertical slice (Tasks). Every subsequent feature follows the same pattern. This is a prerequisite, not a separate phase.

---

### Pitfall 4: Build-Time and Runtime Config Blur Into an Unmaintainable Middle Ground

**What goes wrong:** The milestone describes both build-time assembly (config -> code generation) and runtime config (status options, priority levels stored in Convex DB). Teams inevitably blur the boundary: status options start as runtime config, then someone needs "custom fields" which requires schema changes (build-time), then someone wants to add a status option that triggers a new workflow (build-time logic from runtime data). The system becomes a hybrid that has the complexity of both approaches and the benefits of neither.

**Why it happens:** The line between "what the system looks like" (build-time) and "how the system behaves" (runtime) is philosophically clear but practically blurry. A "status option" seems like runtime data until it needs a color, an icon, a transition rule, and a side effect.

**Consequences:**
- Runtime config changes require code deployments (e.g., adding a status that needs a new email notification)
- Build-time config changes require database migrations (e.g., the config references a table that doesn't exist yet)
- Configuration drift between what the code expects and what the database contains
- "Works on my machine" because developer's runtime config differs from production

**Prevention:**
1. Hard rule: Build-time = which features exist and how they connect. Runtime = values within those features (status labels, priority levels, display preferences).
2. Build-time config produces TypeScript files. Runtime config lives in a Convex table.
3. Runtime config NEVER changes code structure. If a config option would require a code change to support, it's build-time config.
4. Examples:
   - Build-time: "This client has Projects" (adds project schema, routes, components)
   - Runtime: "Active projects are displayed in green" (stored in DB, read at render)
   - Build-time: "Tasks have a 'blocked' status" (adds workflow logic for blocked state)
   - Runtime: "The statuses are called Todo, Doing, Done" (labels stored in DB)
5. Validate runtime config against build-time expectations: if the code was generated without the "blocked" status workflow, the runtime config should not allow adding "blocked" as a status. Use a Zod schema generated at build-time to validate runtime config.

**Detection:** If a runtime config change requires running the code generator, or if a build-time generation requires querying the database, the boundary has been violated.

**Phase mapping:** The boundary must be defined in the design phase and enforced from the first vertical slice. Every feature should have a clear split: "these are the build-time decisions" and "these are the runtime values."

---

### Pitfall 5: LLM-Powered Code Assembly Produces Plausible But Wrong Inter-Feature Wiring

**What goes wrong:** The milestone includes "LLM-powered generator for complex inter-feature wiring." LLMs are excellent at generating code that looks correct -- proper imports, reasonable function signatures, plausible business logic. But inter-feature wiring is precisely where correctness is hardest to verify: Does the task mutation correctly create an activity log? Does deleting a project cascade to its tasks? Does subtask promotion create the right task link? The LLM will generate code that passes syntax checks and even unit tests (because the LLM writes tests matching its implementation -- LESSONS.md Lesson 3) but silently breaks the domain invariants.

**Why it happens:** LLMs pattern-match from training data. Inter-feature wiring in a custom config-driven system has NO training data -- the patterns are specific to this project. The LLM will generate code that looks like generic CRUD wiring but misses the CalmDo-specific rules (e.g., "subtask promotion sets subtask.status to 'promoted' AND creates a task link AND creates an activity log" -- three operations that must happen atomically).

**Consequences:**
- Partial operations: LLM generates the task creation part of subtask promotion but forgets the task link creation
- Wrong references: LLM creates activity logs pointing to the wrong entity (projectId instead of taskId)
- Missing atomicity: LLM generates three separate mutations instead of one atomic mutation
- Tests that verify the bugs: LLM-generated tests assert the wrong behavior as correct (proven failure mode from LESSONS.md)

**Prevention:**
1. The LLM generates from TEMPLATES, not from scratch. Each feature block has a Plop.js template that the LLM fills in. The template enforces the structure (e.g., "every mutation MUST call createActivityLog()"). The LLM only fills in the feature-specific details.
2. LLM NEVER generates tests. Tests are derived from behavioral specs (EARS acceptance criteria from the proven workflow in LESSONS.md). A separate spec-to-test step produces tests BEFORE the LLM generates implementation.
3. Inter-feature wiring is codified in the templates, not generated by the LLM. The template for "feature that belongs to another feature" includes the cascade delete pattern, the activity log pattern, and the reference validation pattern. The LLM's job is to parameterize the template, not invent the wiring.
4. Every LLM-generated file gets three-layer verification (LESSONS.md Lesson 2): tests pass, integration check (components actually connected), manual verification (feature actually works).
5. Provide the LLM with DOMAIN.md as context, including the specific entity relationships and cascade rules. Constrain generation to one feature at a time, not cross-feature wiring.

**Detection:** If the LLM is generating Convex mutation code without a template, it's generating bugs. If the LLM generates both implementation and tests, the tests are unreliable (proven).

**Phase mapping:** LLM-powered generation is a LATE phase. First, build 2-3 features manually to create the templates. Then use the LLM to parameterize those templates for additional features. Never start with LLM generation.

---

## Moderate Pitfalls

---

### Pitfall 6: Convex Schema Validation Blocks Iterative Feature Development

**What goes wrong:** Convex enforces schema validation on deploy: all existing documents must match the new schema. When iterating on a feature (e.g., changing task status from 3 options to 5 options), the deploy will fail if existing tasks in the database have statuses not in the new enum. This blocks the rapid iteration cycle that config-driven development promises.

**Why it happens:** Convex validates ALL documents against the schema on every `npx convex dev` push. Unlike PostgreSQL where you can add an enum value, Convex requires the schema to be a superset of existing data. Removing a status option from the enum requires migrating all documents with that status first.

**Prevention:**
1. For status-like fields, use `v.string()` in the schema instead of `v.union(v.literal(...))`. Validate the string against allowed values in the mutation logic, not the schema. This lets the schema remain stable while runtime config controls valid values.
2. If strict schema validation is desired, always use `v.union()` that includes ALL possible values across all clients. Use runtime config to restrict which values are valid for each client.
3. For field additions: new fields must be `v.optional()` to avoid breaking existing documents. DOMAIN.md's audit fields are correct here -- `createdBy: v.optional(v.id("users"))` for bootstrap cases.
4. Use the [Convex migrations component](https://www.convex.dev/components/migrations) for data changes before schema changes.

**Detection:** `npx convex dev` fails with "document does not match schema" after a config change. This is the migration problem surfacing.

**Phase mapping:** Decide the schema validation strategy (strict enum vs. string with runtime validation) in the first vertical slice. This decision affects every subsequent feature.

---

### Pitfall 7: Cascade Deletes Across Feature Boundaries Create Hidden Data Loss

**What goes wrong:** DOMAIN.md specifies "Deleting a project deletes its tasks and work logs." In a composable system, cascade deletes cross feature boundaries: deleting a Project (feature A) must delete Tasks (feature B) which must delete Subtasks (feature C), Work Logs (feature D), Task Links (feature E), and Activity Logs (feature F). If any feature is misconfigured or its cascade logic is missing, orphaned records accumulate.

**Why it happens:** Each feature is developed as a "composable block" with its own mutations. The cascade delete logic must reach INTO other features' tables. When features are developed as independent vertical slices, the cascade paths are not connected until integration.

**Consequences:**
- Orphaned subtasks with deleted parent tasks
- Activity logs referencing deleted entities (null reference errors in UI)
- Work logs for deleted tasks consuming storage indefinitely
- Task links pointing to non-existent tasks (broken UI)

**Prevention:**
1. Implement cascade deletes as a CENTRALIZED concern, not distributed across features. A single `deleteProject` mutation handles the entire cascade chain, not separate `deleteTasks`, `deleteSubtasks`, etc.
2. Order of deletion matters: delete leaves first (Activity Logs, Work Logs, Task Links, Subtasks), then Tasks, then Project. Convex mutations are transactional within a single mutation call.
3. Write integration tests that verify the cascade: create a Project with Tasks, Subtasks, Work Logs, and Activity Logs, then delete the Project and verify ALL related records are gone.
4. For the composable config system: cascade rules are PART OF the feature relationship config, not the individual feature config. When "Tasks belong to Projects" is configured, the cascade "delete Project -> delete Tasks" is automatically included.

**Detection:** Query for orphaned records regularly: Subtasks where `taskId` references a non-existent task. Convex doesn't enforce referential integrity -- you must do it yourself.

**Phase mapping:** Cascade logic must be part of the FIRST feature that introduces a parent-child relationship (Projects-Tasks). Don't defer it to a "cleanup" phase.

---

### Pitfall 8: Activity Log Explosion From Config-Driven Features

**What goes wrong:** DOMAIN.md lists 13 tracked actions for Activity Logs. In a config-driven system where features can be added, each new feature adds its own activity log events. With 6+ features, the activity logs table grows faster than all other tables combined. Queries on activity logs (the task detail timeline view) become slow because they scan a massive table.

**Why it happens:** Activity logs are append-only and never deleted (audit trail). Each task mutation creates 1-3 activity log entries. A project with 50 tasks, each with 10 status changes, generates 500+ activity log entries for that project alone. Add work logs, subtask operations, and assignments, and the numbers multiply.

**Prevention:**
1. Index activity logs by `taskId` AND `projectId` (already in the schema design). But also add a compound index `by_task_createdAt` for efficient timeline queries with sorting.
2. Consider pagination for the task detail timeline from day one. Do not load all activity logs for a task -- use cursor-based pagination.
3. For the project-level activity view: use the `by_project` index with time-range filtering, not a full scan.
4. Do NOT store activity log details as `v.any()` -- define specific detail shapes per action type. This enables efficient querying and prevents schema-less data from accumulating.

**Detection:** Activity logs table row count exceeding 10x the tasks table. Timeline queries taking >500ms.

**Phase mapping:** Activity Logs should be built in the same slice as Tasks (they're tightly coupled). The pagination and indexing strategy must be designed upfront, not retrofitted.

---

### Pitfall 9: Wizard/Generator UX Promises More Flexibility Than the System Delivers

**What goes wrong:** The milestone includes a "structured wizard for feature selection." The wizard presents options like checkboxes: "Tasks [x] Projects [x] Subtasks [ ] Work Logs [x]." Users select a combination, the system generates code. But the system can only handle the combinations that were designed and tested. Users inevitably select a combination that was never tested (e.g., "Work Logs without Tasks") and get a broken generated codebase.

**Why it happens:** A wizard UI implies arbitrary combination. The underlying system supports specific, tested configurations. The gap between UI promise and system capability creates broken deployments.

**Prevention:**
1. Make the wizard enforce the dependency DAG: selecting Work Logs auto-selects Tasks. Deselecting Tasks grays out Work Logs, Subtasks, Activity Logs, and Task Links. The wizard visualizes the dependency tree, not a flat checklist.
2. Only present TESTED configurations. If "Tasks without Projects" has not been integration-tested, the wizard should not offer it.
3. Show a preview of what will be generated BEFORE generating. Let the user see the file list, the routes, the schema tables. "You will get: 4 tables, 8 mutations, 12 queries, 3 routes."
4. Version the wizard's offerings: v1 offers "Full Suite" or "Tasks Only." v2 adds "Tasks + Projects." Don't ship a fully flexible wizard before the underlying combinations are tested.

**Detection:** If the wizard offers more combinations than the test suite covers, untested combinations will be deployed.

**Phase mapping:** The wizard is a LATE phase, after all features are built and the valid combinations are known. Do not design the wizard before the features exist.

---

### Pitfall 10: Separate Codebase Per Client Creates Maintenance Nightmare Without Upgrade Path

**What goes wrong:** The milestone states "Separate codebase per client." Without an upgrade mechanism, each client codebase diverges immediately. Bug fixes must be applied to N codebases. Security patches must be deployed N times. After 6 months with 5 clients, you have 5 different codebases with 5 different bugs, and upgrading any of them risks breaking client-specific customizations.

**Why it happens:** Forking is easy. Merging upstream changes into a fork with customizations is one of the hardest problems in software. Git merge works for additive changes but breaks when the upstream restructures code that the fork modified.

**Prevention:**
1. Define a clear boundary between "generated code" (feature implementations, routes, components) and "customizable code" (config files, theme files, content). Upstream changes only touch generated code. Client customizations only touch customizable code. The two NEVER overlap.
2. Use the existing git-based plugin pattern: client customizations are plugin branches, not forks. When the upstream template changes, plugin branches rebase.
3. Version the generated code: each generated file includes a comment `// Generated by CalmDo v2.1 -- do not edit`. If a client edits a generated file, they've broken the upgrade path and they know it.
4. Keep client count LOW initially. The per-client codebase model works for 2-3 clients. Beyond that, you need a true multi-tenant architecture (which is out of scope for v2.0).

**Detection:** If a bug fix requires manually patching more than 2 codebases, the model is not scaling.

**Phase mapping:** The per-client deployment model is the LAST phase. Build the features first, extract the config system, then create the first client deployment. Do not design the multi-client workflow until you have a working single-client system.

---

## Minor Pitfalls

---

### Pitfall 11: Convex's Lack of Referential Integrity Creates Silent Data Corruption

**What goes wrong:** Convex does not enforce foreign key constraints. A task can reference a `projectId` that was deleted. A subtask can reference a `taskId` that doesn't exist. Unlike SQL databases, no error is thrown when the referenced record is missing -- the ID just points to nothing.

**Prevention:**
1. Every mutation that creates a reference must verify the target exists: `const project = await ctx.db.get(args.projectId); if (!project) throw new Error("Project not found");`
2. Every cascade delete must be exhaustive (Pitfall 7).
3. Consider a periodic "integrity check" query that scans for orphaned references and reports them.

**Detection:** UI showing "Unknown Project" or null values where a project name should appear.

**Phase mapping:** Build reference validation into the mutation helpers from the first vertical slice. This is a pattern, not a feature.

---

### Pitfall 12: Position/Sort Order Fields Break Under Concurrent Edits

**What goes wrong:** DOMAIN.md specifies `position: number` on Subtasks for drag-and-drop ordering. Two users reordering subtasks simultaneously can create duplicate positions or gaps. Convex's optimistic updates make this worse -- the UI shows one order, the server resolves to another.

**Prevention:**
1. Use fractional indexing (e.g., position 1.5 between 1 and 2) instead of integer positions to avoid rewriting all positions on every reorder.
2. Accept eventual consistency for ordering: show optimistic order, resolve conflicts server-side with a deterministic rule (e.g., last-write-wins with timestamp).
3. Keep position reordering as a single mutation that sets all positions atomically, not one mutation per item.

**Detection:** Subtasks appearing in different orders for different users, or duplicated positions in the database.

**Phase mapping:** Address when building Subtasks. This is a UX concern, not a blocking architectural issue.

---

### Pitfall 13: Zod Schema Duplication Between Client Validation and Convex Schema

**What goes wrong:** The existing codebase uses `zodToConvex()` from convex-helpers to bridge Zod schemas to Convex validators. With many more tables (8+ CalmDo tables vs. 3 existing tables), the risk of Zod schemas diverging from Convex validators increases. A field added to the Zod schema but not to the Convex validator (or vice versa) creates silent validation gaps.

**Prevention:**
1. Follow the established pattern: define the Zod schema in `src/shared/schemas/`, convert to Convex validators in `schema.ts` using `zodToConvex()`.
2. Use the Zod schema as the source of truth. Never define a Convex validator directly that has a corresponding Zod schema.
3. For CalmDo entities, create a `src/shared/schemas/tasks.ts`, `src/shared/schemas/projects.ts`, etc., following the existing `billing.ts` pattern.

**Detection:** Form validation passes but Convex mutation rejects the data (or vice versa).

**Phase mapping:** Establish the Zod-first pattern in the first vertical slice (Tasks). Every subsequent feature follows the same pattern.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| First vertical slice (Tasks) | Premature config system (Pitfall 1), schema validation strategy (Pitfall 6) | Build hardcoded Tasks first. Decide string vs. enum for statuses. |
| Projects + Task relationship | Cascade deletes (Pitfall 7), referential integrity (Pitfall 11) | Centralized cascade mutation. Reference validation in helpers. |
| Subtasks | Position ordering (Pitfall 12), dependency wiring (Pitfall 2) | Fractional indexing. Subtask is a hard dependency on Tasks, not optional. |
| Activity Logs | Table explosion (Pitfall 8), typed details (Pitfall 8) | Pagination from day one. Typed detail shapes per action. |
| Config extraction | Premature abstraction (Pitfall 1), boundary blur (Pitfall 4) | Extract from working code, don't predict. Hard build/runtime boundary. |
| Schema generation | Monolith schema.ts (Pitfall 3), Zod duplication (Pitfall 13) | Table files imported into schema.ts. Zod as source of truth. |
| LLM generator | Wrong wiring (Pitfall 5), test unreliability (Pitfall 5) | Templates constrain LLM. Tests from specs, not from LLM. |
| Feature wizard | Over-promising flexibility (Pitfall 9), untested combos (Pitfall 9) | Enforce dependency DAG in UI. Only tested configurations. |
| Per-client deployment | Maintenance nightmare (Pitfall 10), config drift (Pitfall 4) | Generated vs. customizable boundary. Plugin branches over forks. |

## Key Lesson From Previous Attempts

From LESSONS.md, the meta-pattern across 7+ attempts: **process failures are more dangerous than technical failures.** Every critical pitfall above has a process dimension:

- Pitfall 1 (premature config) = building the abstraction before the concrete (same mistake as "plans with embedded code")
- Pitfall 2 (dependency explosion) = not defining constraints before building (same mistake as "horizontal phases")
- Pitfall 5 (LLM wiring) = trusting AI-generated tests (proven failure mode)
- The proven workflow (explore -> spec -> plan -> derive tests -> execute -> verify) applies to each vertical slice

The technical pitfalls (Convex schema monolith, cascade deletes, referential integrity) are solvable with known patterns. The process pitfalls (premature abstraction, blurred boundaries, LLM over-trust) are the ones that caused rewrites in every previous attempt.

## Sources

- [Convex Schema Documentation](https://docs.convex.dev/database/schemas) -- Schema validation, v.any(), optional fields, single-file requirement
- [Convex Migrations](https://www.convex.dev/components/migrations) -- Migration framework for schema evolution
- [Convex Lightweight Migrations](https://stack.convex.dev/lightweight-zero-downtime-migrations) -- Zero-downtime data migration patterns
- [Runtime Config vs Build-Time Config](https://rgndunes.substack.com/p/runtime-config-vs-build-time-config) -- Boundary definition patterns
- [Configuration Drift](https://spacelift.io/blog/what-is-configuration-drift) -- How config diverges from intended state
- [LLM Code Generation Security](https://www.endorlabs.com/learn/the-most-common-security-vulnerabilities-in-ai-generated-code) -- Vulnerability patterns in generated code
- [LLM Failure Modes](https://medium.com/@adnanmasood/a-field-guide-to-llm-failure-modes-5ffaeeb08e80) -- Classification of LLM generation failures
- [Composable CX Failure](https://www.cmswire.com/customer-experience/composable-cx-is-failing-for-one-simple-reason/) -- Why composable systems fail in practice
- [Circular Dependencies in Modular Systems](https://bit.dev/reference/dependencies/avoid-cyclic-dependencies/) -- Dependency management patterns
- Project artifacts: `_calmdo/LESSONS.md`, `_calmdo/DOMAIN.md`, `_reference/superpowers/2026-01-28-phase1-design.md`, `convex/schema.ts`
