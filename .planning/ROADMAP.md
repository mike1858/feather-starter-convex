# Roadmap: Feather Starter Convex

## Milestones

- ✅ **v1.0 Architecture Modernization** — Phase 1 (shipped 2026-03-09)
- 📋 **v2.0 CalmDo Core** — Phases 2-7 (planned)

## Phases

<details>
<summary>v1.0 Architecture Modernization (Phase 1) — SHIPPED 2026-03-09</summary>

- [x] Phase 1: Architecture Modernization (9/9 plans) — completed 2026-03-09

See: `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

### v2.0 CalmDo Core

**Milestone Goal:** Build a task management system as vertical slices showcasing the starter template architecture — tasks, projects, subtasks, time logging, and audit trail.

**Phase Numbering:**
- Integer phases (2, 3, 4...): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 2: Auth & DX Infrastructure** - Password auth, dev mailbox, pre-commit hooks, and E2E test setup (completed 2026-03-10)
- [x] **Phase 02.1: Stripe Plugin Extraction** (INSERTED) - Extract billing/Stripe to optional plugin branch (completed 2026-03-10)
- [x] **Phase 3: Tasks** - Complete task management with visibility, assignment, status workflow, and core views (completed 2026-03-25)
- [x] **Phase 03.1: Verification Bug Fixes** (INSERTED) - Fix all issues found during Phase 2+3 UAT: auth flow bugs, task unassign visibility, dev mailbox fixes, and UX polish (completed 2026-03-25)
- [x] **Phase 03.2: CRUD Generator Upgrade** (INSERTED) - Upgrade Plop.js generators to produce fully working CRUD features; generator output is a runnable feature that agents then customize (completed 2026-03-27)
- [x] **Phase 03.2.1: Generator Test Philosophy Upgrade** (INSERTED) - Upgrade generator test templates to follow testing philosophy; integration-first, MECE, property-based (completed 2026-03-28)
- [x] **Phase 03.2.1.1: Create feather.yaml specs** (INSERTED) - Create feather.yaml specs for projects, subtasks, work-logs, activity-logs (completed 2026-03-29)
- [x] **Phase 4: Projects** - Project CRUD with status lifecycle and project-task relationship (completed 2026-03-28)
- [x] **Phase 5: Subtasks & Work Logs** - Child-of-task overlays with subtask promotion and time logging (completed 2026-03-28)
- [x] **Phase 6: Activity Logs & Search** - Auto-generated audit trail, text search, and filter controls across all entities (completed 2026-03-28)
- [x] **Phase 7: MECE Test Rewrite** - Rewrite all feature test suites: integration-first, backend-only for edge cases only, MECE state decomposition (completed 2026-03-28)

## Phase Details

### Phase 2: Auth & DX Infrastructure
**Goal**: Users can sign in with email/password and developers have automated quality gates and E2E testing
**Depends on**: Phase 1 (existing codebase)
**Requirements**: AUTH-01, AUTH-02, DX-01, DX-02, DX-03
**Success Criteria** (what must be TRUE):
  1. User can sign up and sign in with email and password (in addition to existing OTP and GitHub OAuth)
  2. User can reset a forgotten password via an email link
  3. Developer can view all emails sent during development at a dev-only route (no external email service needed)
  4. Every git commit automatically enforces 100% test coverage via pre-commit hook
  5. At least one Playwright E2E test covers a full user-facing flow (auth round-trip)
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md — Password auth backend + UI (sign up/sign in with email+password)
- [ ] 02-02-PLAN.md — Lefthook pre-commit hooks (typecheck + test coverage)
- [ ] 02-03-PLAN.md — Password reset flow + dev mailbox (reset form, email interception, dev route)
- [ ] 02-04-PLAN.md — Playwright E2E tests (auth, onboarding, settings flows)

### Phase 02.1: Stripe Plugin Extraction (INSERTED)

**Goal:** Extract all Stripe/billing code from core into an optional plugin/billing git branch so the starter runs without Stripe env vars
**Requirements**: STRIPE-EXTRACT-01, STRIPE-EXTRACT-02
**Depends on:** Phase 2
**Success Criteria** (what must be TRUE):
  1. Core runs without any Stripe env vars, SDK, or billing tables
  2. All tests pass with 100% coverage on billing-free main
  3. plugin/billing branch exists and merging it restores full billing functionality
  4. All 3 existing plugin branches (infra-ci, command-palette, admin-panel) work with billing-free main
**Plans:** 2/2 plans complete

Plans:
- [ ] 02.1-01-PLAN.md — Core extraction: delete billing files, edit shared files, fix tests and coverage
- [ ] 02.1-02-PLAN.md — Plugin branches: create plugin/billing, rebase 3 existing plugins

### Phase 3: Tasks
**Goal**: Users can create, manage, and organize tasks with visibility rules, assignment, and status workflow
**Depends on**: Phase 2
**Requirements**: TASK-01, TASK-02, TASK-03, TASK-04, TASK-05, TASK-06, TASK-07, TASK-08, TASK-09, TASK-10, VIEW-01, VIEW-02, VIEW-06
**Success Criteria** (what must be TRUE):
  1. User can create a quick task (no project, private by default), edit its title/description/priority, and delete it with confirmation
  2. User can advance a task through todo, in_progress, done status workflow
  3. User can assign a task to a team member; assigning to someone else auto-flips visibility to shared
  4. User sees their assigned tasks in "My Tasks" view and unassigned shared tasks in "Team Pool" view
  5. Sidebar navigation includes My Tasks, Team Pool, and Projects sections
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Task backend: Zod schemas, Convex table, all mutations and queries with tests
- [x] 03-02-PLAN.md — Task frontend: components, routes, nav wiring, i18n, and frontend tests

### Phase 03.2: CRUD Generator Upgrade (INSERTED)

**Goal:** Upgrade Plop.js generators to produce fully working CRUD features (like Phoenix gen.live / Rails scaffolds) — the generator output should be a runnable feature that an agent then customizes for domain-specific logic
**Requirements**: GEN-01, GEN-02, GEN-03, GEN-04, GEN-05
**Depends on:** Phase 3
**Success Criteria** (what must be TRUE):
  1. Running the generator with a feature name produces a fully working CRUD (list page, detail page, form, backend mutations+queries, tests) that passes all tests at 100% coverage
  2. Generated code follows all existing conventions (feature folders, Zod schemas, zodToConvex, auth guards, i18n, nav wiring, error constants)
  3. Phase 4 (Projects) can be started by running the generator and then customizing the output
  4. The tasks feature (Phase 3) structure is consistent with what the generator would produce
**Plans:** 6/6 plans complete

Plans:
- [x] 03.2-01-PLAN.md — Generator infrastructure: YAML resolver, marked regions parser, Handlebars helpers, design system CSS tokens (Inter font, shadows, transitions)
- [x] 03.2-02-PLAN.md — Backend templates: Zod schema, CRUD mutations, queries, and backend test templates
- [x] 03.2-03-PLAN.md — Core frontend templates: Page, TitleBar, Item, Form, StatusBadge, ViewSwitcher, EmptyState, FilterBar, barrel export, frontend test, i18n locales
- [x] 03.2-04-PLAN.md — View + detail templates: ListView, CardView (4 image styles), TableView (sorting, grouping, pagination), DetailPage (3 display modes), LoadingSkeleton
- [x] 03.2-05-PLAN.md — Plopfile rewrite + auto-wiring: modular plopfile, custom Plop actions, all generator definitions (gen:feature, gen:schema, gen:backend, gen:frontend)
- [x] 03.2-06-PLAN.md — Validation + tasks alignment: generate test entity, verify pipeline, retroactive tasks.gen.yaml, human verification

### Phase 03.2.1: Generator Test Philosophy Upgrade (INSERTED)

**Goal:** Upgrade generator test templates to produce tests following the feather-testing-convex testing philosophy (integration-first, MECE, property-based happy path, edge case unit tests). Re-run generators on example apps (todos, tickets, contacts) and verify output. Compare with Phase 7 hand-written tests and close gaps. Target: generated tests are indistinguishable from senior developer tests.
**Requirements**: TBD
**Depends on:** Phase 03.2
**Status:** Complete (inline, 2026-03-28)

**Changes:**
- Upgraded `mutations.test.ts.hbs` — test matrix, integration-first setup, MECE naming, multiple assertions per test
- Upgraded `queries.test.ts.hbs` — eliminated `toBeDefined()` anti-pattern, integration-first, userId verification
- Upgraded `test.tsx.hbs` — `findByText` over `waitFor(getByText)`, describe blocks, empty state verifies form, removed redundant heading test
- Verified output for simple (todos) and complex (tasks w/ transitions+assignable) entities
- Full test suite: 432 tests passing

### Phase 03.2.1.1: Create feather.yaml specs for projects, subtasks, work-logs, activity-logs (INSERTED)

**Goal:** Upgrade all feature YAML specs to complete, aspirational feather.yaml contracts for all 8 entities (5 CalmDo + 3 examples), merge old gen.yaml files, delete old files
**Requirements**: TBD
**Depends on:** Phase 03.2.1
**Plans:** 2/2 plans complete

Plans:
- [x] 03.2.1.1-01-PLAN.md — CalmDo feather.yaml specs: tasks reconciliation, projects, subtasks, work-logs, activity-logs
- [x] 03.2.1.1-02-PLAN.md — Example app feather.yaml specs (todos, tickets, contacts) + gen.yaml cleanup

### Phase 03.1: Verification Bug Fixes (INSERTED)

**Goal:** Fix all issues found during Phase 2+3 UAT: auth flow bugs, task unassign visibility, dev mailbox fixes, and UX polish
**Depends on:** Phase 3
**Source:** Phase 2+3 UAT (03-UAT.md + manual verification 2026-03-25)
**Success Criteria** (what must be TRUE):
  1. OTP and password reset flows work on local dev without Resend API key (dev mailbox captures emails, Resend skipped)
  2. Dev mailbox is accessible without auth and renders inside dashboard layout
  3. Unassigning a task makes it appear in Team Pool (auto-flip to shared)
  4. Auth errors (duplicate account, deleted account) show user-friendly messages
  5. Unconfigured auth providers (GitHub, OTP) are hidden from login page
  6. Login form is centered on the page
  7. Username lowercase hint shown on onboarding and settings; settings form re-syncs with server
**Plans**: 2 plans

Plans:
- [x] 03.1-01-PLAN.md — Backend + infrastructure fixes: task unassign visibility, JWT provisioning, Resend skip, dev mailbox route, provider availability query
- [x] 03.1-02-PLAN.md — Frontend/UI fixes: auth error messages, hide unconfigured providers, email persistence, centered login, username hints, settings re-sync

**Issues:**
- P1: Unassign task → limbo (visibility stays private) — `convex/tasks/mutations.ts`
- P1: JWT keys not auto-provisioned for local backend — `package.json`
- P1: Resend throws without API key, blocks OTP + password reset — `convex/otp/ResendOTP.ts`, `convex/password/ResendOTPPasswordReset.ts`
- P2: Dev mailbox requires auth (can't read OTP to sign in) — route structure
- P2: Dev mailbox captures no emails on local — `storeDevEmail` may fail silently
- P2: Auth errors not surfaced in UI — `src/features/auth/components/PasswordForm.tsx`
- P2: Unconfigured auth providers visible — login page
- P3: Dev mailbox has no header/nav — outside dashboard layout
- P3: Username lowercase, no hint — onboarding + settings
- P3: Settings username form doesn't re-sync — `SettingsPage.tsx`
- P3: Email not persisted across auth forms — login page state
- P3: Login form not centered — login page layout

### Phase 4: Projects
**Goal**: Users can organize tasks into projects with status lifecycle and filtered project views
**Depends on**: Phase 3
**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, PROJ-06, PROJ-07, VIEW-03, VIEW-04
**Success Criteria** (what must be TRUE):
  1. User can create, edit, and delete a project (delete cascades to its tasks and work logs)
  2. User can view a projects list filtered by status (active/on_hold/completed/archived) with task counts per project
  3. User can assign a task to a project (optional — tasks work fine without a project)
  4. User can view all tasks within a project filtered by status/assignee/priority, with a status summary bar
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Project backend: Zod schemas, Convex table, CRUD mutations (cascade delete), queries (list with status filter + task counts, detail with status summary), task mutation extensions (createInProject, assignToProject with visibility auto-flip)
- [x] 04-02-PLAN.md — Project frontend: ProjectsPage (card grid, status filter tabs), ProjectDetailPage (task list, filters, summary bar, inline creation), routes, navigation wiring (static + dynamic projects section), i18n, tests

### Phase 5: Subtasks & Work Logs
**Goal**: Users can break tasks into subtasks (with promotion) and log work with optional time tracking
**Depends on**: Phase 3
**Requirements**: SUB-01, SUB-02, SUB-03, SUB-04, SUB-05, SUB-06, SUB-07, WLOG-01, WLOG-02, WLOG-03, WLOG-04
**Success Criteria** (what must be TRUE):
  1. User can add, edit, reorder, and delete subtasks within a task, and parent task shows completion count (e.g., "3/5 done")
  2. User can promote a subtask to a full task (subtask marked as "promoted" with link to new task)
  3. User can add a work log entry to any task (body text + optional time in minutes), and edit/delete their own entries
  4. Task detail shows total time logged across all work log entries
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — Subtask & work log backend: Zod schemas, Convex tables, CRUD mutations (subtask create/update/remove/reorder/promote, work log create/update/remove with ownership), queries (listByTask with completion count, listByTask with total time), cascade delete updates
- [x] 05-02-PLAN.md — Subtask & work log frontend: Sheet UI primitive, TaskDetailPanel (side panel), SubtaskList (checklist with drag-reorder, promote), WorkLogForm/List (smart time parsing), route wiring (search params for deep linking), i18n

### Phase 6: Activity Logs & Search
**Goal**: System provides an auto-generated audit trail and users can search/filter across all entities
**Depends on**: Phase 3, Phase 4, Phase 5
**Requirements**: ACTV-01, ACTV-02, ACTV-03, ACTV-04, SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, SRCH-06, VIEW-05
**Success Criteria** (what must be TRUE):
  1. System auto-logs events for tasks (created, status_changed, assigned, edited, deleted), projects (created, status_changed, edited), and subtasks (created, completed, promoted)
  2. Task detail view shows the full task with subtasks, work logs, and a combined activity timeline grouped by date
  3. User can filter tasks by status, priority, project, and assignee from filter controls
  4. User can filter projects by status
  5. User can text-search across task titles and project names from a search box in the header
**Plans**: TBD

Plans:
- [x] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: MECE Test Rewrite
**Goal**: Rewrite all feature test suites to follow the [feather-testing-convex testing philosophy](https://github.com/siraj-samsudeen/feather-testing-convex/blob/main/TESTING-PHILOSOPHY.md)
**Depends on**: Phase 5, Phase 6
**Planning input**: Agent must read the testing philosophy doc, audit all existing test files against it, and produce a concrete plan for what to rewrite, what to delete, and what to keep — before any implementation begins.
**Success Criteria**: Derived during planning from the philosophy doc applied to this codebase's current test suite.
**Plans**: 3 plans

Plans:
- [x] 07-01-PLAN.md — Backend test rewrite: MECE compliance for all 16 convex test files (naming, test matrix, seed patterns)
- [x] 07-02-PLAN.md — Utils/shared/UI test cleanup: light-touch pass, delete stubs, centralize nav tests, fix coverage config
- [x] 07-03-PLAN.md — Frontend feature test rewrite: MECE state decomposition, integration-first, findBy* patterns, remove route/nav duplicates

## Progress

**Execution Order:**
Phases execute in numeric order: 2 -> 02.1 -> 3 -> 03.1 -> 03.2 -> 4 -> 5 -> 6 -> 7
(Phase 03.2 upgrades generators before Phase 4 uses them; Phases 4 and 5 both depend on 3 but not each other; Phase 6 depends on 3, 4, and 5; Phase 7 depends on 5 and 6)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Architecture Modernization | v1.0 | 9/9 | Complete | 2026-03-09 |
| 2. Auth & DX Infrastructure | v2.0 | 4/4 | Complete | 2026-03-10 |
| 02.1 Stripe Plugin Extraction | v2.0 | 2/2 | Complete | 2026-03-10 |
| 3. Tasks | v2.0 | 2/2 | Complete | 2026-03-25 |
| 03.1 Verification Bug Fixes | v2.0 | 2/2 | Complete | 2026-03-25 |
| 03.2 CRUD Generator Upgrade | v2.0 | 6/6 | Complete | 2026-03-27 |
| 03.2.1 Generator Test Philosophy | v2.0 | — | Complete (inline) | 2026-03-28 |
| 03.2.1.1 Create feather.yaml specs | v2.0 | 2/2 | Complete    | 2026-03-29 |
| 4. Projects | v2.0 | 2/2 | Complete | 2026-03-28 |
| 5. Subtasks & Work Logs | v2.0 | 2/2 | Complete | 2026-03-28 |
| 6. Activity Logs & Search | v2.0 | 1/1 | Complete | 2026-03-28 |
| 7. MECE Test Rewrite | v2.0 | 3/3 | Complete | 2026-03-28 |
| 999.1 Feather DX Architecture | Backlog | 6/6 | Complete | 2026-03-28 |
| 999.9 Test Quality Audit | Backlog | 3/3 | Complete    | 2026-03-29 |
| 999.2 feather start project | Backlog | 4/4 | Complete | 2026-03-30 |
| 999.3 LLM Architect Conversation | Backlog | 4/4 | Complete   | 2026-03-30 |
| 999.4 Integration Gaps | Backlog | 4/4 | Complete    | 2026-03-31 |
| 999.5 Excel-to-System Pipeline | Backlog | 4/5 | Complete    | 2026-04-01 |
| 999.6 Bundle Distribution | Backlog | 0/3 | Not started | - |
| 999.7 Telemetry | Backlog | 0/? | Not started | - |
| 999.8 Search | Backlog | 2/2 | Complete    | 2026-03-30 |
| 999.10 E2E, Bugs & Docs Debt | Backlog | 1/2 | In Progress|  |

## Backlog

### Phase 999.1: Feather DX Architecture (BACKLOG)
**Goal:** Design and implement the framework evolution: feather.yaml declarative config, generated/custom code split, LLM architect conversation (WHO/WHAT/WHERE/WHEN/HOW entity discovery + 8-dimension behavior overlay), feature/bundle/custom composability, safe upstream updates, telemetry
**Design doc:** `.planning/design/FEATHER-DX-ARCHITECTURE.md`
**Research status:** Complete — Frappe, Glide, WordPress, Laravel patterns studied; 8-dimension framework defined; user's prior thinking (Gemini notes) integrated
**Requirements:** TBD
**Plans:** 6/6 plans complete

Plans:
- [x] 999.1-01-PLAN.md — Feature YAML schema: Zod-validated feather.yaml format (Wave 1)
- [x] 999.1-02-PLAN.md — ts-morph AST wiring layer: reliable file modification (Wave 1)
- [x] 999.1-03-PLAN.md — Generated/custom directory split: retarget templates and pipeline (Wave 2)
- [x] 999.1-04-PLAN.md — Cross-entity UI generation: master-detail views and related records (Wave 2)
- [x] 999.1-05-PLAN.md — Feather CLI: command-line interface and feather update (Wave 3)
- [x] 999.1-06-PLAN.md — Generator bug fixes and migration validation (Wave 3)

### Phase 999.9: Test Quality Audit (BACKLOG)
**Goal:** Remove all illegitimate coverage exclusions and ensure every test follows the testing philosophy. Establishes quality baseline before any new feature work.
**Depends on:** None (runs first)
**Scope:**
- Part 1: Purge coverage exclusions — audit vitest.config.ts `coverage.exclude` and all inline `/* v8 ignore */`
- Part 2: Review all existing tests against testing philosophy (behavior-not-implementation, correct mock scope, independent tests)
**Deliverable:** 100% coverage with real tests, not exclusions
**Plans:** 3/3 plans complete

Plans:
- [x] 999.9-01-PLAN.md — Catalogue pass: audit exclusions, v8 ignores, and test quality (findings report)
- [x] 999.9-02-PLAN.md — v8 ignore purge + coverage exclusion trim + write tests for exposed code
- [x] 999.9-03-PLAN.md — Test philosophy re-audit: fix violations across all test files

### Phase 999.2: `feather start project` — First-Run DX (BACKLOG)
**Goal:** A developer runs one command and gets a working Feather project with branding, configured auth, and ready-to-use generator
**Depends on:** Phase 999.9
**Scope:**
- `feather start project` CLI command (builds on PR #8's `create.sh` + `setup.ts`)
- Interactive prompts: project name, branding, auth providers, initial features
- Generates root `feather.yaml`, clones template, applies branding, provisions auth keys
- Runs `npm install` + `npx convex dev --once` to confirm
- Addresses todo `dx-local-auth-keys-provisioning`
**Plans:** 4

Plans:
- [x] 999.2-01-PLAN.md — Base branch strip script and CI workflow
- [x] 999.2-02-PLAN.md — Auth provider templates and conditional configuration
- [x] 999.2-03-PLAN.md — Create-feather wizard — project scaffolding with interactive prompts
- [x] 999.2-04-PLAN.md — feather add command and end-to-end integration tests

### Phase 999.3: LLM Architect Conversation (BACKLOG)
**Goal:** Developer describes business domain in plain English, LLM produces validated `feather.yaml` with entities, relationships, and behavioral specs
**Depends on:** Phase 999.2
**Scope:**
- 4-phase conversation: Entity Discovery → Schema + CRUD → Behavior Overlay (8 dimensions) → Validation
- Claude Code skill (`/feather:architect`) — no API SDK needed, skill IS the conversation engine
- Conversation state persisted as JSON in `.feather/conversations/` (resumable)
- Web preview dashboard (ER diagram, YAML display, sample data, validation status)
- Quad meta-model (Data + Layout + Actions + Reports) structures the conversation
- Output: validated feather.yaml files ready for `feather generate`
**Plans:** 4/4 plans complete

Plans:
- [x] 999.3-01-PLAN.md — Conversation state checkpoint system (JSON schema, persistence, resume)
- [x] 999.3-02-PLAN.md — Claude Code skill + YAML generator + sample data helpers
- [x] 999.3-03-PLAN.md — Web preview dashboard (ER diagram, YAML display, auto-refresh)
- [x] 999.3-04-PLAN.md — Integration testing with CalmDo domain end-to-end

### Phase 999.4: 999.1 Integration Gaps (BACKLOG)
**Goal:** Wire architecturally validated foundations into real code generation pipeline
**Depends on:** Phase 999.2, Phase 999.3
**Scope:**
- Combined wireFeature() orchestrator
- Plop integration: outputMode, gen:feature-from-yaml, generatedHeader helper
- Generated/custom directory split: retarget to src/generated/ and convex/generated/
- 5 cross-entity panel templates (related-record, table, checklist, timeline, cards)
- Detail page template update, template-level bug fixes
- CLI completion: package.json bin entry, init.test.ts, init command logic
- **`feather update` CLI thorough testing:** verify generateFeature pipeline works end-to-end, uncommitted change detection, --dry-run, --force, error handling. The command exists but was never tested against real projects.
**Plans:** 4/4 plans complete

Plans:
- [x] 999.4-01-PLAN.md — Pipeline template integration: replace stubs with Handlebars rendering + CLI bin entry (Wave 1)
- [x] 999.4-02-PLAN.md — Cross-entity panel templates (checklist, timeline, table, cards) + detail page update (Wave 2)
- [x] 999.4-03-PLAN.md — CalmDo migration to generated/custom directory split (Wave 3)
- [x] 999.4-04-PLAN.md — feather update CLI thorough testing + Plop unification (Wave 3)

### Phase 999.5: Excel-to-System Pipeline (BACKLOG)
**Goal:** User uploads Excel file, system infers schema, user confirms, system produces feather.yaml + seed data
**Depends on:** Phase 999.3, Phase 999.4
**Scope:**
- Excel reading via `xlsx` (SheetJS)
- LLM-powered structure analysis: field type inference, entity classification, relationship detection
- Fuzzy column rename detection (Jaro-Winkler + position + data fingerprinting)
- Interactive confirmation UI, schema reconciliation for re-imports
- Atomic migration with audit trail
**Plans:** 5/5 plans complete

### Phase 999.6: Bundle Distribution (BACKLOG)
**Goal:** Curated feature bundles installable in one command with local-first resolution and GitHub registry fallback
**Depends on:** Phase 999.4
**Scope:**
- Bundle manifest format (bundle.json with feature list + metadata)
- Rename templates/examples/ to templates/features/, create templates/bundles/
- `feather add <name>` auto-detects bundle vs feature, installs with topological dependency ordering
- `feather remove <name>` handles bundle-level removal
- `feather list` shows installed, available features, and available bundles
- GitHub registry fallback: local-first, remote fetch when not found locally
- `feather update` syncs from registry before regenerating when configured
**Plans:** 3 plans

Plans:
- [ ] 999.6-01-PLAN.md — Rename templates/examples/ to templates/features/, resolution module, topo-sort, bundle manifest
- [ ] 999.6-02-PLAN.md — Bundle-aware add/remove commands, feather list command
- [ ] 999.6-03-PLAN.md — GitHub registry client, remote fallback in add, registry sync in update

### Phase 999.7: Telemetry (BACKLOG)
**Goal:** Understand what users build and surface errors proactively
**Depends on:** Phase 999.2
**Scope:**
- Build-tool telemetry: generator usage counts, feature types, error rates (opt-out)
- One-click error reporting: zero-config error boundary with context capture
- Maintainer dashboard (simple analytics)
**Plans:** 0 (estimated 2)

### Phase 999.8: Search (BACKLOG)
**Goal:** Users can text-search across task titles and project names with filter controls
**Depends on:** Phase 6 (Activity Logs)
**Requirements:** SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, SRCH-06
**Scope:**
- Search indexes on tasks (title, description) and projects (name, description)
- Search box in header/nav with real-time results
- Filter controls: status, priority, project, assignee across task lists
- Project list filtering by status
- Combined search results view
**Note:** Phase 6 was "Activity Logs & Search" but search was never built. These 6 requirements (SRCH-01 to SRCH-06) are carried forward here.
**Plans:** 2/2 plans complete

Plans:
- [x] 999.8-01-PLAN.md — Search indexes, filtered queries, and search queries (Wave 1)
- [x] 999.8-02-PLAN.md — Filter bar, global search, URL params, and frontend tests (Wave 2)

### Phase 999.10: E2E Verification, Bug Fixes & Docs Debt (BACKLOG)
**Goal:** Run E2E tests against live deployment, fix outstanding bugs, and clean up stale documentation artifacts
**Depends on:** None (independent — can run anytime)
**Scope:**
- **E2E test runtime:** Configure and run Playwright tests against a live Convex deployment (deferred since Phase 02)
- **TS2589 bug:** Fix type depth error in `convex/password/ResendOTPPasswordReset.ts:21` (found in Phase 03.1 human UAT, never tracked)
- **Docs cleanup:** Update REQUIREMENTS.md traceability table and checkboxes, archive stale CONCERNS.md, clean up old `.gen.yaml` files alongside `feather.yaml`
- **Barrel export gaps:** Fix placeholder barrel exports in subtasks/, work-logs/, activity-logs/
- **Phase 03.2.1.1 status:** Reconcile roadmap status with actual `feather.yaml` files that already exist
**Note:** All original 999.10 items (6 DX/UX bugs) were fixed in Phase 03.1 — phase repurposed for remaining gaps.
**Plans:** 1/2 plans executed

Plans:
- [ ] 999.10-01-PLAN.md — E2E test verification and CalmDo feature E2E tests
- [x] 999.10-02-PLAN.md — Bug fixes, barrel export cleanup, and documentation updates

---
*Roadmap created: 2026-03-10*
*Last updated: 2026-04-01*
