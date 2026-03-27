# Phase 03 Plan Check

**Verdict:** PASS (with one warning requiring acknowledgment)
**Date:** 2026-03-25
**Plans checked:** 03-01-PLAN.md, 03-02-PLAN.md

---

## Requirement Coverage

| Req ID | Description | Covered By | Task | Verdict |
|--------|-------------|-----------|------|---------|
| TASK-01 | Create task with title, description, priority | 03-01 | Task 2 (create mutation + tests) | ✅ |
| TASK-02 | My Tasks list query | 03-01 | Task 3 (myTasks query + tests) | ✅ |
| TASK-03 | Edit task title, description, priority | 03-01 | Task 2 (update mutation + tests) | ✅ |
| TASK-04 | Delete with confirmation | 03-01 + 03-02 | Backend: Task 2 (remove). UI confirmation: Plan 02 Task 1 (useDoubleCheck in TaskItem) | ✅ |
| TASK-05 | Status workflow todo→in_progress→done | 03-01 | Task 2 (updateStatus with transition validation + tests) | ✅ |
| TASK-06 | Quick task private by default | 03-01 | Task 1 (schema default) + Task 2 (create defaults to private) | ✅ |
| TASK-07 | Auto-flip to shared on assign to other user | 03-01 | Task 2 (assign mutation logic + tests) | ✅ |
| TASK-08 | Assign to any team member | 03-01 + 03-02 | Backend: Task 3 (listUsers). Frontend: Plan 02 Task 1 (assignee dropdown in TaskItem) | ✅ |
| TASK-09 | Unassigned tasks in Team Pool | 03-01 | Task 3 (teamPool query + tests) | ✅ |
| TASK-10 | Drag-reorder with position field | 03-01 + 03-02 | Backend: Task 2 (reorder mutation). Frontend: Plan 02 Task 1 (dnd-kit TaskList) | ✅ |
| VIEW-01 | My Tasks view | 03-02 | Task 1 (TasksPage), Task 2 (route), Task 3 (tests) | ✅ |
| VIEW-02 | Team Pool view | 03-02 | Task 1 (TeamPoolPage), Task 2 (route), Task 3 (tests) | ✅ |
| VIEW-06 | Sidebar with My Tasks, Team Pool, Projects section | 03-02 | Task 2 (nav items) — **Projects section deferred** | ⚠️ |

---

## Success Criteria Coverage

| # | Criterion | Covered By | Verdict |
|---|-----------|-----------|---------|
| 1 | Create quick task (private default), edit title/description/priority, delete with confirmation | Plan 01 Tasks 1-2 (backend), Plan 02 Task 1 (TaskItem double-check delete, inline edit, priority toggle) | ✅ |
| 2 | Advance task through todo → in_progress → done | Plan 01 Task 2 (updateStatus with sequential validation), Plan 02 Task 1 (TaskStatusBadge click-to-advance) | ✅ |
| 3 | Assign to team member; auto-flip visibility to shared | Plan 01 Task 2 (assign mutation), Plan 01 Task 3 (listUsers), Plan 02 Task 1 (assignee dropdown) | ✅ |
| 4 | My Tasks shows assigned tasks, Team Pool shows unassigned shared tasks | Plan 01 Task 3 (queries), Plan 02 Tasks 1-2 (pages + routes) | ✅ |
| 5 | Sidebar includes My Tasks, Team Pool, **and Projects sections** | Plan 02 Task 2 adds My Tasks + Team Pool only. Projects section not planned. | ⚠️ |

---

## Issues Found

### WARNING: VIEW-06 and Success Criterion 5 — Projects nav section not implemented

**Severity:** WARNING (not a blocker — see rationale)

The ROADMAP defines VIEW-06 as "Sidebar navigation with My Tasks, Team Pool, **Projects section with project list**" and Phase 3 Success Criterion 5 explicitly includes Projects. Plan 02 only adds My Tasks and Team Pool nav items. The Projects section belongs to Phase 4 work, and no projects exist yet to list.

**Why this is a warning and not a blocker:**

The Projects section of the nav is logically inseparable from Phase 4 (project data, routes, and views don't exist yet). Implementing a Projects nav entry in Phase 3 would either be a dead link or require forward-referencing Phase 4 artifacts that don't exist. This is a ROADMAP authoring issue — VIEW-06 was partially scoped into Phase 3 when the "Projects section" portion really belongs in Phase 4.

**Recommendation:** The planner should either:
- (a) Acknowledge this gap explicitly in the plan's `must_haves.truths` (currently it says "My Tasks and Team Pool links" which is honest but undersells the gap), OR
- (b) Add a stub Projects nav entry in Phase 3 pointing to a placeholder/coming-soon route, so the nav structure is set up early and Phase 4 fills it in

Option (a) is acceptable — the phase still delivers meaningful user value and all TASK-* requirements are fully covered. The executor should leave a `// TODO: add Projects nav item in Phase 4` comment in `src/shared/nav.ts`.

---

### INFO: Nyquist compliance — Wave 0 test stubs not pre-created

**Severity:** INFO

VALIDATION.md correctly marks `nyquist_compliant: false` and `wave_0_complete: false`. The plans use inline TDD (production code + tests in the same task), rather than pre-creating Wave 0 stubs. This is a deliberate tradeoff: Plan 01's three tasks are sequential and each task writes its own tests. There are no 3 consecutive tasks without automated verify (Plan 01 Task 1 has a conditional tsc verify, Tasks 2 and 3 have full vitest commands).

The one weak spot: Plan 01 Task 1's verify command is `npx vitest run convex/tasks/ -x || npx tsc --noEmit` — tests don't exist yet at that point and the fallback is a compile check. This is inherent to the TDD bootstrap problem and the plan documents it explicitly.

This is not blocking but the executor should be aware tests will be created alongside production code, not before.

---

### INFO: Plan 02 Tasks 1 and 2 verify with tsc, not behavioral tests

**Severity:** INFO

Plan 02 Tasks 1 and 2 use `npx tsc --noEmit` as their verify command. The actual behavioral tests come in Task 3. This means component wiring issues (wrong API path, missing imports) won't be caught until Task 3. This is acceptable because TypeScript compile errors will catch structural mismatches, and the task sequence is designed so Task 3 immediately follows. No change required.

---

## Dependency Graph

| Plan | Wave | Depends On | Valid? |
|------|------|-----------|--------|
| 03-01 | 1 | [] | ✅ |
| 03-02 | 2 | ["03-01"] | ✅ |

Dependency is correct. Plan 02 explicitly reads `03-01-SUMMARY.md` in its context, meaning it expects Plan 01 to complete first. No cycles.

---

## Scope Assessment

| Plan | Tasks | Files | Wave | Assessment |
|------|-------|-------|------|------------|
| 03-01 | 3 | 6 | 1 | ✅ Within budget (2-3 tasks, <10 files) |
| 03-02 | 3 | 14 | 2 | ⚠️ 14 files is above the 10-file warning threshold |

Plan 02 has 14 files, which crosses the warning threshold. However the tasks are well-separated:
- Task 1: 7 component files (all new creates, not edits)
- Task 2: 6 wiring files (routes, nav, i18n — mostly new creates)
- Task 3: 1 test file

Creating new files is less risky than editing existing ones. The scope is large but the work is straightforward (scaffolding, not complex logic). The 3-task split is appropriate and each task has a clear scope boundary. Acceptable.

---

## Pattern Compliance (CLAUDE.md)

| Convention | Checked | Result |
|-----------|---------|--------|
| Feature-folder architecture | ✅ | `src/features/tasks/` with correct structure |
| Backend in `convex/tasks/` | ✅ | mutations.ts, queries.ts, test files co-located |
| Routes as thin wrappers (<20 lines) | ✅ | Route files import from feature, add beforeLoad only |
| Zod schema as single source of truth | ✅ | `src/shared/schemas/tasks.ts` → `zodToConvex()` |
| `zCustomMutation` for user-typed input | ✅ | create and update use zMutation, simple mutations use plain mutation |
| `@cvx/*` alias for Convex imports | ✅ | Interfaces section shows correct import pattern |
| Tests co-located with source | ✅ | `convex/tasks/*.test.ts` and `src/features/tasks/tasks.test.tsx` |
| 100% test coverage required | ✅ | Both plans mandate `npm test` passes with 100% coverage |
| Nav items append to `src/shared/nav.ts` | ✅ | Plan 02 Task 2 appends to navItems array |
| i18n namespace in `src/i18n.ts` | ✅ | Plan 02 Task 2 adds "tasks" to ns array |
| Error constants in `src/shared/errors.ts` | ✅ | Plan 01 Task 1 adds `tasks` group to ERRORS |
| Barrel export via `index.ts` | ✅ | `src/features/tasks/index.ts` created in Plan 02 Task 1 |

---

## Key Links Verification

| Link | Planned In | Method | Verdict |
|------|-----------|--------|---------|
| mutations.ts → schemas/tasks.ts | Plan 01, must_haves.key_links | `zCustomMutation` + import | ✅ |
| schema.ts → schemas/tasks.ts | Plan 01, must_haves.key_links | `zodToConvex(taskStatus/taskVisibility)` | ✅ |
| queries.ts → schema.ts | Plan 01, must_haves.key_links | `.withIndex("by_assignee")` | ✅ |
| TasksPage → myTasks query | Plan 02, must_haves.key_links | `convexQuery(api.tasks.queries.myTasks)` | ✅ |
| TeamPoolPage → teamPool query | Plan 02, must_haves.key_links | `convexQuery(api.tasks.queries.teamPool)` | ✅ |
| TaskItem → mutations | Plan 02, must_haves.key_links | `useConvexMutation(api.tasks.mutations.*)` | ✅ |
| nav.ts → tasks route | Plan 02, must_haves.key_links | `to: "/dashboard/tasks"` | ✅ |

All critical artifact connections are explicitly planned and named.

---

## Recommendations

1. **VIEW-06 gap (Projects section):** Executor should add a `// TODO: add Projects nav item in Phase 4` comment in `src/shared/nav.ts` when appending the new nav entries, so the gap is documented in code, not just in planning files.

2. **assign mutation — one-way visibility flip:** Plan 01 Task 2 correctly specifies that unassigning does NOT revert visibility to private. This matches the research decision (one-way flip per Pitfall 3). The test explicitly covers this case. No action needed.

3. **Position normalization:** Plan 02 Task 1 includes the gap-detection normalization (if gap < 1, reassign positions 1000, 2000...). This correctly addresses the float precision pitfall from research. Good.

4. **`listUsers` query scoping:** Plan 01 Task 3 action says to add `// TODO: scope to org in v3.0` comment. This matches the research recommendation for Pitfall 6. Executor should not skip this comment.

---

## Overall Assessment

Both plans are well-structured, follow project conventions faithfully, and cover all TASK-* requirements completely. The backend plan (03-01) has clear TDD behavior specifications with specific mutation logic (sequential status transitions, one-way visibility flip, position calculation). The frontend plan (03-02) correctly wires all queries and mutations with explicit API paths.

The only substantive gap is VIEW-06's Projects section, which is correctly identified as a Phase 4 concern. All Phase 3 success criteria except criterion 5 (Projects nav) are fully achievable from these plans. Criterion 5 is partially achievable (My Tasks and Team Pool are covered) with the Projects portion deferred.

**The plans are safe to execute.**
