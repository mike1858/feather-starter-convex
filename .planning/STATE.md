---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: CalmDo Core
status: Ready to plan
last_updated: "2026-04-01T09:24:12.573Z"
progress:
  total_phases: 21
  completed_phases: 17
  total_plans: 57
  completed_plans: 51
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-10)

**Core value:** Developer velocity -- new features are faster to build because every file has a clear, predictable home
**Current focus:** Phase 999.4 — 999-1-integration-gaps-backlog

## Current Position

Phase: 999.5
Plan: Not started
All 4 plans executed: strip script, auth templates, create wizard, feather add/remove

### Roadmap Evolution

- Phase 03.2.1.1 inserted after Phase 03.2.1: Create feather.yaml specs for projects, subtasks, work-logs, activity-logs (URGENT)

## Performance Metrics

**v1.0 Velocity:**

- Total plans completed: 9
- Average duration: 4.6min/plan
- Total execution time: 41min
- Commits: 65 | Files changed: 181 | Lines: +17,820 / -5,335

**v2.0 Velocity:**

- Total plans completed: 6
- Average duration: 9.8min/plan
- Total execution time: 59min

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 02.1 | 01 | 10min | 2 | 48 |
| 02.1 | 02 | 5min | 3 | 0 |
| 03 | 01 | 10min | 3 | 8 |
| 03 | 02 | 21min | 3 | 18 |
| Phase 03.1 P01 | 7min | 2 tasks | 10 files |
| Phase 03.2 P01 | 9min | 3 tasks | 11 files |
| Phase 03.2 P02 | 5min | 2 tasks | 5 files |
| Phase Phase 03.2 P06 P06 | 23min | 2 tasks | 45 files |
| Phase 04 P01 | 4min | 2 tasks | 10 files |
| Phase 04 P02 | 13min | 2 tasks | 17 files |
| Phase 05 P01 | 11min | 9 tasks | 28 files |
| Phase 05 P02 | 25min | 8 tasks | 23 files |
| Phase 06 P01 | 13min | 9 tasks | 20 files |
| Phase 999.9 P01 | 4min | 3 tasks | 1 files |
| Phase 999.9 P02 | 19min | 7 tasks | 36 files |
| Phase 999.9 P03 | 3min | 5 tasks | 10 files |
| Phase 999.10 P02 | 5min | 4 tasks | 8 files |
| Phase 999.3 P01-04 | 16 min | 14 tasks | 12 files |
| Phase 999.4 P01 | 25min | 5 tasks | 6 files |
| Phase 999.4 P02 | 11min | 5 tasks | 10 files |
| Phase 999.4 | P03 | ~30min | 6 tasks | 20 files |
| Phase 999.4 | P04 | 270s | 5 tasks | 6 files |
| Phase 999.6 P01 | 6min | 2 tasks | 69 files |

## Accumulated Context

### Decisions

See: .planning/PROJECT.md Key Decisions table (updated after v2.0 start)

Recent:

- Vertical slices only (schema+backend+frontend+tests per phase)
- Skip org layer for v2.0 (user-scoped tasks)
- Coarse granularity: 5 phases for 49 requirements
- Re-enabled convex/tsconfig.json in pre-commit typecheck (TS2554 fixed by billing removal)
- Removed --dangerouslyIgnoreUnhandledErrors (Stripe rejections no longer occur)
- Password provider uses named import { Password } (not default export)
- Reset provider id "password-reset" to avoid collision with "resend-otp"
- convex/tsconfig.json lib upgraded ES2021 -> ES2023 for Error cause support
- Login page restructured: password primary, OTP and GitHub as alternatives
- Used public mutations for devEmails (ConvexHttpClient cannot call internal functions)
- DEV_MAILBOX env var defaults to enabled; only "false" disables interception
- Email interception stores plain HTML with token/expiry (not rendered React components)
- E2E_CONVEX_URL env var with VITE_CONVEX_URL fallback for dev convenience
- Chromium-only for faster local E2E runs
- E2E verification checkpoint deferred (Task 3 of 02-04) -- tests written but not yet run against live deployment
- Kept predev script with no-op init.ts (enables plugin override, runs in <1s)
- Added password/password-reset to auth provider cleanup in deleteCurrentUserAccount
- [Phase 02.1]: Used Option B plugin creation strategy: branch from billing-free main with additive commits (purely additive diff)
- [Phase 03]: Used plain mutation for update (mixing v.id with Zod .shape causes TS errors)
- [Phase 03]: Manually updated convex/_generated/api.d.ts (codegen requires running backend)
- [Phase 03]: Combined task commits due to pre-commit 100% coverage hook
- [Phase 03]: Used v8 ignore pragmas for dnd-kit drag handlers and Radix Select (untestable in jsdom)
- [Phase 03]: Excluded root errors.ts re-export barrel from coverage (pre-existing 0% issue)
- [Phase 03.1]: availableProviders query is public (no auth guard) -- login page needs provider info pre-authentication
- [Phase 03.1]: Resend skip uses early return when provider.apiKey is falsy (after dev mailbox store)
- [Phase 03.1]: Dev mailbox moved from _auth to _app layout to bypass auth guard while keeping sidebar nav
- [Phase 03.2]: Generator utils as plain ESM .js with JSDoc types from types.ts (Plop imports directly, no compilation)
- [Phase 03.2]: deepmerge array strategy: feature YAML arrays replace defaults entirely (no merge)
- [Phase 03.2]: Schema template builds Zod types inline (not via zodType helper) for precise control over exports and max-length constants
- [Phase 03.2]: Enum fields with transitions excluded from createInput; dedicated updateStatus mutation generated instead
- [Phase 03.2]: Use @root.property for deeply nested Handlebars contexts (Plop scope resolution unreliable past 2 levels)
- [Phase 03.2]: Add apiPath/errorsPath helpers for bracket notation with kebab-case feature names
- [Phase 06]: Activity logs use camelCase activityLogs table, entityId as v.string() for multi-table references, inline logActivity helper pattern — Consistent with existing workLogs/devEmails conventions; v.string() needed because entityId references tasks, projects, and subtasks tables
- [Phase 999.4]: Use standalone Handlebars instance with registerStandaloneHelpers() to avoid Plop coupling
- [Phase 999.4]: hasTransitions is alias for hasEnumTransitions (status-badge.tsx.hbs uses both)
- [Phase 999.4]: Conditional imports in panel templates (useMutation, Plus) via {{#unless readonly}} — avoids unused imports in generated readonly panels
- [Phase 999.4]: renderCrossEntityPanels() as separate exported function in render.ts — clean separation from renderFeatureTemplates, ScaffoldOptions.relatedYamls optional for backward compat
- [Phase 999.4]: FEATHER_USE_PIPELINE env var for Plop-to-pipeline toggle (default: pipeline)
- [Phase 999.6]: Renamed templates/examples/ to templates/features/ via git mv for history preservation
- [Phase 999.6]: Bundle-first resolution: resolve() checks bundles/ before features/ with typed discriminated union
- [Phase 999.6]: DFS topological sort with visiting set for cycle detection; feather.yaml belongs_to extraction for dependency graphs

### Pending Todos

- [ ] **Post-Phase 2: Review feedback triage** -- After Phase 2 completes, review `docs/REVIEW-FEEDBACK.md` and act on items:
  - P1: Design `feather install <module>` CLI (unified installer replacing all generators)
  - P3: Fix 6 confirmed bugs (missing awaits, silent auth errors, username uniqueness, race condition, hardcoded providers, unused args)
  - P4: Code quality improvements (15 items -- auth guards, error constants, shim cleanup, etc.)
  - P5: Capture architecture proposals for post-v2.0 (event system, permissions, platform/modules split)

### Roadmap Evolution

- Phase 02.1 inserted after Phase 2: Stripe Plugin Extraction (URGENT) -- Stripe blocks team in India from running the starter; extract as optional plugin
- Plan 02.1-01 completed: core is billing-free, all tests pass at 100%
- Plan 02.1-02 completed: plugin/billing branch created, 3 existing plugins rebased onto billing-free main
- Phase 03.2 inserted after Phase 3: CRUD Generator Upgrade (URGENT) -- Generators produce TODO stubs, not working CRUD; upgrade to Phoenix gen.live / Rails scaffold level before building more features
- Phase 03.2.1 inserted after Phase 03.2: Generator Test Philosophy Upgrade (URGENT) -- Generator test templates produce shallow "renders heading" tests, not the feather-testing-convex philosophy (integration-first, MECE, property-based). Fix templates so generated tests are indistinguishable from senior developer tests.

### Blockers/Concerns

None.

### Tech Debt (carried forward)

- NavItem.i18nKey defined but unused (designed deferral -- resolves when i18n-aware nav rendering is built)
- convex/_generated/api.d.ts still references billing modules (will auto-update on next `convex dev` run)
