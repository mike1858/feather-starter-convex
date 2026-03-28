# CalmDo — Lessons Learned

What broke, what worked, and what we learned across 7+ attempts to build CalmDo.

---

## Timeline of Attempts

| # | Project | Stack | Duration | Outcome | Key Learning |
|---|---------|-------|----------|---------|--------------|
| 1 | calmdo-old | Phoenix LiveView | weeks | Abandoned | Richest product vision, but Phoenix LiveView learning curve too steep |
| 2 | calmdo (shipnative) | React Native + Supabase | days | Abandoned | Wrong platform — web app, not mobile |
| 3 | calmdo-instant | React Native + InstantDB | hours | Abandoned | InstantDB too immature for production |
| 4 | calmdo-tanstack | TanStack Start + Prisma | hours | Abandoned | TanStack Start still RC, added unnecessary server layer |
| 5 | calmdo_solveit | React + Convex | days | Completed TodoList only | First working code. Proved Convex + convex-test-provider works. |
| 6 | todo_convex | React + Convex | ~1 week | Phase 1 "complete" but broken | Tests passed, features didn't work. Plans had 2600+ lines of embedded code. |
| 7 | calmdo_phoenix | Phoenix LiveView | ~3 days | Projects CRUD working | Best TDD discipline. PhoenixTest + DB verification pattern. |
| 8 | todo_convex_gsd | React + Convex | ~1 week | Phase 2 complete, starter template | GSD workflow with research agents. Executor subagent bugs discovered. |

**Pattern:** Each attempt got further and produced better artifacts. The product vision matured across attempts, not within any single one.

---

## Cross-Cutting Lessons

### Process Lessons

#### 1. Plans With Embedded Code Don't Work

**What happened (todo_convex):** Design documents contained 2600+ lines of Convex function code. The plans answered "how to build" instead of "what should happen." User couldn't review from their perspective.

**Root cause:** Treating plans as implementation specs rather than behavioral specs.

**Fix:** Plans describe behavior and reference specs. No embedded code. User reviews plain-English EARS acceptance criteria, not TypeScript.

#### 2. "Tests Pass" Does Not Mean "Feature Works"

**What happened (todo_convex):** Edit Project had passing tests. But `ProjectList.tsx` never passed `onEdit` to `ProjectCard`. `ProjectForm.tsx` only supported creation. The edit button did nothing — and all 62 tests were green.

**Root cause:** Component tests verified mocked behavior in isolation. No integration tests. No manual verification. "Tests pass" was treated as "done."

**Fix:** Three-layer verification:
1. Tests pass (necessary but not sufficient)
2. Integration check (components actually connected)
3. Manual verification (feature actually works)

#### 3. AI Executor Subagents Write Tests Matching Their Bugs

**What happened (todo_convex_gsd):** GSD executor subagent was told to implement auth guards. Plan specified `<Navigate to="/login" />` for unauthenticated users. Executor returned `null` instead — and wrote tests asserting "renders nothing when unauthenticated." 33 tests, 100% coverage, blank page in browser.

**Root cause:** When an AI agent writes both implementation and tests, it writes tests that match its implementation, not the requirements. TDD only works when tests encode requirements.

**Fix:** Tests must be derived from specs/requirements BEFORE implementation. Executor subagents must write tests from plan requirements, not from their code.

#### 4. Horizontal Phases Don't Work With 100% Coverage

**What happened (todo_convex):** Tried to build all backend first, then all frontend. Can't commit backend-only phases when 100% coverage is enforced — nothing exercises the code yet.

**Fix:** Vertical slices. Each phase delivers a complete slice: schema + backend + frontend + tests. Every commit maintains 100% coverage.

#### 5. Each Attempt Produced Valuable Artifacts (Even "Failed" Ones)

| Attempt | Artifact Preserved |
|---------|-------------------|
| calmdo-old | Product vision, testing philosophy (Beck/DHH/Dodds), GTD tags concept |
| calmdo_solveit | convex-test-provider package, feather workflow skills, TodoList reference |
| todo_convex | Domain model, 6-phase roadmap, superpowers plans, kiro specs, permission framework |
| calmdo_phoenix | PhoenixTest patterns, TDD dev log, factory patterns, DB verification |
| todo_convex_gsd | 15 research docs, GSD execution artifacts, VISION.md, starter roadmap |

**Lesson:** Never delete failed projects. Consolidate their artifacts instead.

### Technical Lessons

#### 6. Integration Tests Are the Primary Layer

**What happened (todo_convex):** 62 component tests with mocks. Zero backend tests. Zero integration tests. Features were "tested" but broken.

**What happened (todo_convex_gsd):** Phase 02 introduced proper integration tests. 4 out of 5 bugs in that phase came from mock tests — not from actual Convex behavior.

**Decision:** Integration tests (convex-test-provider with real Convex functions) are the PRIMARY testing layer. Backend tests only for complex logic. Mock tests only for loading/error states.

#### 7. DB Verification in UI Tests Is Essential

**What happened (calmdo_phoenix):** Following Phoenix convention, tested UI and Context (backend) separately. Both passed independently. But the UI didn't actually call the Context correctly — `created_by` was NULL in the database.

**Fix (from calmdo-old testing philosophy):** Every mutation test verifies database state. If a test says "project is created," it queries the database to prove it.

```
// After UI action:
const projects = await client.query(api.projects.list, { orgId });
expect(projects).toHaveLength(1);
expect(projects[0].name).toBe("Launch Campaign");
```

#### 8. Convex Auth Has Async Timing Issues

**What happened (todo_convex_gsd):** `useConvexAuth().isLoading` is still `true` when TanStack Router's `beforeLoad` fires. Authenticated users get redirected to login on every page load.

**Fix:** Component-level auth guard in `_authenticated` layout route, NOT `beforeLoad`. The component renders loading state while auth resolves, then either shows children or redirects.

#### 9. Vitest Dual-Environment Config Is Fragile

**What happened (todo_convex_gsd):** `environmentMatchGlobs` was removed in Vitest 3.2+. Coverage thresholds only work at root level, not per-project. `convex-test` glob must be inside `convex/` directory.

**Fix:** Use Vitest `projects` config (not `environmentMatchGlobs`). Two projects: "convex" (edge-runtime) and "react" (jsdom). Coverage and reporters at root level only.

#### 10. Three-Layer Constraint Enforcement

**What happened (calmdo_phoenix):** Discovered that constraints need enforcement at three layers simultaneously:
1. **Database** — migration with NOT NULL
2. **Changeset/validation** — application-level check
3. **Context/function** — business logic sets the value

Missing any layer creates a hole. The `created_by` bug existed because only layer 3 was implemented — layers 1 and 2 were missing.

---

## Antipatterns Identified

| Antipattern | Where Seen | Better Approach |
|-------------|------------|-----------------|
| Plans with embedded code | todo_convex | Behavioral plans referencing specs |
| Component-only tests | todo_convex | Integration tests as primary layer |
| "Tests pass" = "done" | todo_convex | Three-layer verification |
| Horizontal phases | todo_convex | Vertical slices with 100% coverage |
| AI writes tests + implementation | todo_convex_gsd | Derive tests from specs before implementation |
| `beforeLoad` for auth guard | todo_convex_gsd | Component-level guard in layout route |
| Mock everything | todo_convex | Mock only what you can't control (loading states) |
| Testing flash messages/routes | calmdo-old philosophy | Test user behavior and DB state |
| Separate UI and backend test suites | calmdo_phoenix | One UI test verifies full stack |
| Delete failed projects | all | Consolidate artifacts, archive repos |

---

## The Proven Workflow

After 7+ attempts, this workflow emerged:

```
explore-idea  →  feather-spec  →  write-plan  →  derive-tests  →  execute  →  verify
   (design)        (what)          (how)          (prove it)       (build)    (confirm)
```

**Key properties:**
- **Specs before plans** — EARS acceptance criteria, plain English, user-reviewable
- **Tests before code** — derived from specs, not from implementation
- **Vertical slices** — each delivers complete functionality
- **DB verification** — every mutation test proves persistence
- **Three-layer verification** — tests + integration + manual
- **100% coverage** — enforced by Vitest thresholds + Lefthook + TDD Guard hooks

---

## Meta-Lesson: Process > Stack

The stack didn't matter. Phoenix, React Native, Supabase, InstantDB, Convex — the technical choice wasn't what determined success or failure.

What determined success:
- **Clear specs** that a human can review
- **Tests derived from specs** (not from implementation)
- **Verification that features actually work** (not just that tests pass)
- **Vertical slices** that maintain working state at every commit
- **Preserved artifacts** from every attempt, successful or not

The process problems were identical across Phoenix and React. The testing philosophy from calmdo-old (Phoenix) transferred directly to Convex. The domain model stabilized by attempt #6 and barely changed after.

**The real deliverable of 7+ attempts wasn't code — it was the workflow, the testing philosophy, and the consolidated product vision.**
