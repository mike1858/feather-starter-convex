# Phase 999.11: Framework Acceptance Test -- Full User Journey E2E - Research

**Researched:** 2026-04-01
**Domain:** E2E testing (Playwright), integration testing (Vitest), scaffolding pipeline
**Confidence:** HIGH

## Summary

This phase adds three layers of acceptance testing to prove the Feather framework works end-to-end. The codebase already has a mature E2E infrastructure: 8 spec files covering auth, onboarding, settings, tasks, projects, and task-detail flows. All use `feather-testing-convex/playwright` which provides a `createConvexTest` fixture with auto-cleanup via `clearAll`, and `feather-testing-core/playwright` which provides a chainable `Session` API (visit, fillIn, clickButton, assertText, refuteText, etc.).

The three example apps (todos, tickets, contacts) are fully installed in the current project with working frontend components and Convex backend functions. Each follows an identical generated pattern: inline form (placeholder input + "Add" button), list view, item with double-check delete. The integration test (`scripts/create/integration.test.ts`) currently validates the strip/scaffold/add round-trip but only checks file existence -- no typecheck or build verification.

**Primary recommendation:** Follow the existing E2E patterns exactly. Extend `clearAll` to include example app tables. Create `createTodo`/`createTicket`/`createContact` helpers mirroring the existing `createTask`/`createProject` helpers. Each CRUD test follows the proven pattern from `tasks.spec.ts`. The navigation journey test chains all features in a single signed-in session.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Architecture:** Two-layer verification -- offline pipeline hardening (Plan 1) and live Playwright E2E (Plans 2+3).

**Playwright over agent-browser:** Repeatable, fast, runs in CI. Agent-browser is for one-off exploratory checks.

**Why NOT parallel sub-agents:** `create-feather` needs network/Convex credentials, only one dev server at a time.

### Claude's Discretion

(None specified -- CONTEXT.md has no explicit discretion section.)

### Deferred Ideas (OUT OF SCOPE)

(None specified.)

</user_constraints>

## 1. Existing E2E Patterns

### Test Infrastructure

| Component | File | Purpose |
|-----------|------|---------|
| Fixtures | `e2e/fixtures.ts` | `createConvexTest` with auto-cleanup via `clearAll` mutation |
| Helpers | `e2e/helpers.ts` | `signUp`, `createTask`, `createProject`, `uniqueEmail` |
| Config | `playwright.config.ts` | Chromium, `localhost:5173`, auto-starts dev server, 30s timeout |

### Session API (feather-testing-core/playwright)

The `Session` class is chainable (returns `this`) and implements `PromiseLike<void>` so it can be awaited. Available methods:

| Method | Purpose |
|--------|---------|
| `visit(path)` | Navigate to URL |
| `click(text)` | Click element by text |
| `clickButton(text)` | Click button by text |
| `clickLink(text)` | Click link by text |
| `fillIn(label, value)` | Fill input by label/placeholder |
| `selectOption(label, option)` | Select dropdown option |
| `check(label)` / `uncheck(label)` | Toggle checkbox |
| `assertText(text)` | Assert text visible |
| `refuteText(text)` | Assert text NOT visible |
| `assertPath(path)` | Assert current URL path |
| `refutePath(path)` | Assert NOT at path |
| `assertHas(selector)` / `refuteHas(selector)` | Assert selector exists/absent |
| `within(selector, fn)` | Scope operations to a container |

### Proven CRUD Test Pattern (from tasks.spec.ts)

```typescript
// 1. Sign up fresh user
const email = uniqueEmail();
await signUp(session, email, "password123", "username");

// 2. Navigate to feature page
await session.visit("/dashboard/feature-name");
await session.assertText("Feature Title");

// 3. Create item via inline form
await createHelper(session, "Item Title E2E");

// 4. Verify item appears
await session.assertText("Item Title E2E");

// 5. Delete with double-check
// Hover reveals trash icon -> click -> "Are you sure?" / "Delete?" -> click again
// Use page locators for hover-revealed elements

// 6. Verify removal
await session.refuteText("Item Title E2E");
```

### Pattern for Accessing Hover-Revealed Buttons

The delete button is hidden (opacity-0) until hover. Existing tests access it via Playwright `page` object directly:

```typescript
const row = page.locator("div", { hasText: "Item Title" }).first();
const deleteBtn = row.getByRole("button", { name: /trash|delete/i }).or(
  row.locator("button:has(svg.lucide-trash-2)")
);
await deleteBtn.first().click();
```

For generated features, the double-check pattern shows a "Delete?" text (from `t("delete.confirm")`) on second click.

## 2. Example App UI Structure

### Todos (Simple -- title + completed boolean)

| Component | Purpose | Key Interactions |
|-----------|---------|------------------|
| `TodosPage` | Container: query list, filter, render | No direct interaction |
| `TodosForm` | Inline: placeholder "Add todo...", "Add" button | `fillIn("Add todo...", text)` + `clickButton("Add")` |
| `TodosItem` | Display: title, hover-reveal delete (double-check) | Click trash -> "Delete?" -> click again |
| `TodosListView` | DnD-enabled list wrapper | Renders `TodosItem` per item |
| `TodosDetailPage` | Edit form (title, completed fields) | Not routed -- used inside list item click |
| `TodosFilterBar` | Only "All" filter | Minimal interaction needed |

**CRUD operations:**
- **Create:** Fill "Add todo..." placeholder, click "Add"
- **Read:** Item title appears in list
- **Update:** Not easily testable via E2E (no inline edit exposed like tasks have)
- **Delete:** Hover-reveal trash icon -> double-check "Delete?"

**Route:** `/dashboard/todos`
**Page heading:** "Todos" (from i18n `page.title`)

### Tickets (Intermediate -- title + description + status enum + priority enum)

| Component | Purpose | Key Interactions |
|-----------|---------|------------------|
| `TicketsPage` | Container with filter bar | No direct interaction |
| `TicketsForm` | Inline: placeholder "Add ticket...", "Add" button | `fillIn("Add ticket...", text)` + `clickButton("Add")` |
| `TicketsItem` | Display: title, description preview, status/priority badges, hover-reveal delete | Status and priority displayed as text in badges |
| `TicketsListView` | DnD-enabled list wrapper | Renders `TicketsItem` per item |
| `TicketsFilterBar` | Filter by status (open/in_progress/resolved/closed) and priority | Click filter buttons |

**CRUD operations:**
- **Create:** Fill "Add ticket..." placeholder, click "Add" (inline creates with defaults: status=open, priority=low)
- **Read:** Title + status badge ("open") + priority badge ("low") visible
- **Update:** No inline edit exposed in list view
- **Delete:** Hover-reveal trash icon -> double-check "Delete?"

**Route:** `/dashboard/tickets`
**Page heading:** "Tickets"

### Contacts (Intermediate -- name + email + company + status enum + phone)

| Component | Purpose | Key Interactions |
|-----------|---------|------------------|
| `ContactsPage` | Container with view switcher (list/table) and filter | View starts from localStorage preference or "list" |
| `ContactsForm` | Inline: placeholder "Add contact...", "Add" button | `fillIn("Add contact...", text)` + `clickButton("Add")` |
| `ContactsItem` | Display: name, status badge, hover-reveal delete | |
| `ContactsListView` | Card list | Renders `ContactsItem` |
| `ContactsTableView` | Table view (14KB component) | Columns with sorting |
| `ContactsViewSwitcher` | Toggle list/table view | |

**CRUD operations:**
- **Create:** Fill "Add contact..." placeholder (name field), click "Add"
- **Read:** Contact name + status ("lead") visible
- **Update:** No inline edit in list view
- **Delete:** Hover-reveal trash icon -> double-check "Delete?"

**Route:** `/dashboard/contacts`
**Page heading:** "Contacts"
**Note:** Uses `useSuspenseQuery` instead of `useQuery` (different from todos/tickets)

## 3. Integration Test Current State

### What `scripts/create/integration.test.ts` Tests (7 test groups)

| Group | What It Tests | Verification Level |
|-------|---------------|-------------------|
| V1: stripped base | No feature dirs after strip, infra dirs preserved, schema/nav cleaned | File existence only |
| V2: adding a feature | Todos files appear after `addAction("todos")` | File existence only |
| V3: adding all examples | All 3 example dirs exist after strip + add all | File existence only |
| V4: add+remove round-trip | State matches stripped after add+remove | File existence only |
| V5: auth templates | Correct template name returned for provider combos | Return value check |
| V6: strip idempotent | Same schema/nav after stripping twice | Content string comparison |
| V7: branding | Package name and site config replaced | Content string comparison |

### What's Missing (Plan 1 scope)

1. **No typecheck:** After strip+add, the project should `tsc --noEmit` without errors
2. **No build verification:** After strip+add, `vite build` should succeed (catches CSS, module resolution, Tailwind issues)
3. These are offline tests -- no Convex backend needed, but TypeScript/Vite tooling must resolve

### Implementation Considerations for Plan 1

- The integration test creates a temp dir with a fake project snapshot (`createFullProjectSnapshot`). This snapshot has **stub files** (e.g., `export const todos = true;`), not real generated code.
- Running `tsc --noEmit` on stubs will trivially pass -- it won't catch real type errors in generated code.
- **Better approach:** After strip+add, copy the REAL template files (from `templates/features/`), not stubs. The scaffold already does this via `installExample()`. But the test snapshot also needs real infrastructure files (tsconfig, package.json with deps, node_modules).
- **Practical approach:** Run `tsc --noEmit` and `vite build` on the **current project** (which has all features installed) rather than on a temp scaffold. This validates that the real code compiles and builds. The scaffold file-existence tests already cover the strip/add pipeline.
- OR: Add a new test that does strip -> add all -> then runs `tsc` and `vite build` on the temp dir, but this requires `npm install` in the temp dir which is slow.

**Recommendation:** Plan 1 should add `tsc --noEmit` and `vite build` checks as a separate Vitest test (or npm script) that runs against the CURRENT project. This validates the real code compiles. The scaffold round-trip tests remain as-is for pipeline correctness.

## 4. Navigation Items

Full list from `src/shared/nav.ts` (14 items total):

| Label | Route | Feature Type | E2E Status |
|-------|-------|-------------|------------|
| Dashboard | `/dashboard` | Infrastructure | Covered (auth.spec) |
| My Tasks | `/dashboard/tasks` | CalmDo feature | Covered (tasks.spec) |
| Team Pool | `/dashboard/team-pool` | CalmDo feature | NOT covered |
| Projects | `/dashboard/projects` | CalmDo feature | Covered (projects.spec) |
| Todos | `/dashboard/todos` | Example app | NOT covered |
| Tickets | `/dashboard/tickets` | Example app | NOT covered |
| Contacts | `/dashboard/contacts` | Example app | NOT covered |
| Subtasks | `/dashboard/subtasks` | Sub-entity | NOT covered (may 404 -- no dedicated route) |
| Work Logs | `/dashboard/workLogs` | Sub-entity | NOT covered (may 404 -- no dedicated route) |
| Activity Logs | `/dashboard/activityLogs` | Sub-entity | NOT covered (may 404 -- no dedicated route) |
| Import | `/dashboard/import` | Import feature | NOT covered |
| Imports | `/dashboard/imports` | Import feature | NOT covered |
| Settings | `/dashboard/settings` | Infrastructure | Covered (settings.spec) |
| Dev Mailbox | `/dev/mailbox` | Dev-only | Covered (auth.spec password reset) |

### Navigation Journey Test Considerations

- **Subtasks, Work Logs, Activity Logs** have nav entries but may not have dedicated route files. These are sub-entities accessed through the task detail panel. The journey test should expect these might 404 or redirect.
- **Import/Imports** -- need to verify if route files exist.
- The journey test should visit the "safe" nav items and create one item per feature with CRUD support.

## 5. Helper Functions

### Existing Helpers (`e2e/helpers.ts`)

| Helper | What It Does |
|--------|-------------|
| `signUp(session, email, password, username)` | Full signup + onboarding flow, ends at `/dashboard` |
| `createTask(session, title)` | Fill "Add a task..." + click "Add" + assertText |
| `createProject(session, name)` | Visit projects, fill "New project name..." + click "Create" + assertText |
| `uniqueEmail()` | Generate unique email with timestamp + random suffix |

### New Helpers Needed

| Helper | Pattern | Placeholder Text |
|--------|---------|-----------------|
| `createTodo(session, title)` | Fill placeholder + click "Add" + assertText | "Add todo..." |
| `createTicket(session, title)` | Fill placeholder + click "Add" + assertText | "Add ticket..." |
| `createContact(session, name)` | Fill placeholder + click "Add" + assertText | "Add contact..." |

All three follow the exact same pattern as `createTask`:

```typescript
export function createTodo(session: Session, title: string): Session {
  return session
    .fillIn("Add todo...", title)
    .clickButton("Add")
    .assertText(title);
}
```

### Helper for Delete (Optional but Recommended)

The delete pattern is identical across all generated features (hover-reveal trash -> double-check). A generic `deleteItem` helper could reduce duplication, but requires `page` object access (not available through `Session` alone). Existing tests use `page` directly for delete -- keep this pattern.

## 6. Critical Issue: clearAll Missing Example App Tables

**BLOCKER for Plans 2 and 3.**

The `convex/testing/clearAll.ts` mutation clears these tables:
- `activityLogs`, `workLogs`, `subtasks`, `tasks`, `projects`, `users`, `devEmails`
- Auth tables: `authAccounts`, `authSessions`, `authVerificationCodes`, `authVerifiers`, `authRateLimits`, `authRefreshTokens`

**Missing tables:** `todos`, `tickets`, `contacts`

Without clearing these tables between tests, E2E tests for example apps will have leftover data from previous runs. The `createConvexTest` fixture calls `clearAll` before each test, so this must be fixed FIRST.

**Fix:** Add `"todos"`, `"tickets"`, `"contacts"` to the `tables` array in `clearAll.ts`.

## 7. Risks and Considerations

### Risk 1: Hover-Revealed Delete Buttons
**What:** Delete buttons have `opacity-0` by default, visible on `group-hover`. Playwright can still click hidden elements, but the test should force-hover first for realism.
**Mitigation:** Use `page.locator().hover()` before clicking delete, or accept that Playwright can click non-visible elements.

### Risk 2: i18n-Dependent Placeholder Text
**What:** The placeholder text ("Add todo...", "Add ticket...", "Add contact...") comes from i18n translations. If the test hardcodes these strings and translations change, tests break.
**Mitigation:** The translations are in `public/locales/en/*.json` and are stable. Use the exact i18n strings. This is the same pattern used by existing tests (e.g., `createTask` uses "Add a task...").

### Risk 3: ContactsPage Uses useSuspenseQuery
**What:** `ContactsPage` uses `useSuspenseQuery` instead of `useQuery`. This means the component throws a promise during loading (React Suspense boundary). If no Suspense boundary wraps it, the page will show a fallback instead of the component.
**Mitigation:** The route wraps the component -- this should work fine. But if E2E tests see a loading state that never resolves, suspect Suspense boundary issues.

### Risk 4: Subtasks/Work Logs/Activity Logs Nav Items Without Routes
**What:** Nav items exist for Subtasks, Work Logs, Activity Logs, Import, Imports -- but these may not have dedicated route files. Visiting them could result in 404.
**Mitigation:** The journey test (Plan 3) should check which routes actually exist before including them. Focus on: Dashboard, My Tasks, Projects, Todos, Tickets, Contacts, Settings. Skip sub-entities and import.

### Risk 5: Plan 1 Build Test Requires Full Toolchain in Temp Dir
**What:** Running `tsc` and `vite build` in a scaffolded temp dir requires `node_modules`, `tsconfig.json`, `vite.config.ts`, etc. The current integration test snapshot is minimal stubs.
**Mitigation:** Run build checks against the current project (not a temp scaffold), or accept that build verification tests are slow (npm install in temp dir).

## 8. Recommendations Per Plan

### Plan 1: Offline Pipeline Hardening

**Recommended approach:** Add two test cases to the integration test suite (or a separate file):

1. **Typecheck test:** Run `tsc --noEmit` (all 3 tsconfigs) against the **current project** after confirming all features are installed. This validates that the real generated code compiles.
2. **Build test:** Run `vite build` against the current project. Validates CSS/Tailwind, module resolution, imports.

These can be implemented as:
- A new Vitest test file (`scripts/create/build-verification.test.ts`) that shells out to `tsc` and `vite build`
- OR simpler: add npm scripts that the CI pipeline calls after the existing test suite

**Why not scaffold test:** The strip->add->build round-trip on a temp dir requires `npm install` (~30-60s), making it impractical for the unit test suite. The current project already has all features installed and represents the final state. Validating IT is sufficient.

### Plan 2: Example App CRUD E2E Tests

**File structure:** Create one spec file per example app:
- `e2e/todos.spec.ts`
- `e2e/tickets.spec.ts`
- `e2e/contacts.spec.ts`

**Prerequisite:** Update `clearAll.ts` to include `todos`, `tickets`, `contacts` tables.

**Test cases per app (follow tasks.spec.ts pattern):**
1. Create an item via inline form
2. Verify item appears in list
3. Delete item with double-check confirmation
4. Verify item is gone

**Additional per app:**
- Tickets: Verify status ("open") and priority ("low") badges appear after create
- Contacts: Verify status ("lead") badge appears after create

**New helpers in `e2e/helpers.ts`:**
```typescript
export function createTodo(session: Session, title: string): Session { ... }
export function createTicket(session: Session, title: string): Session { ... }
export function createContact(session: Session, name: string): Session { ... }
```

### Plan 3: Full Navigation Journey Test

**File:** `e2e/journey.spec.ts`

**Single test that:**
1. Signs up a fresh user (signUp helper)
2. Lands on Dashboard
3. Visits each safe route and creates one item:
   - `/dashboard/tasks` -> create a task
   - `/dashboard/projects` -> create a project
   - `/dashboard/todos` -> create a todo
   - `/dashboard/tickets` -> create a ticket
   - `/dashboard/contacts` -> create a contact
4. Visits remaining safe routes without creating items:
   - `/dashboard/settings` -> assert "Your Username"
5. Returns to dashboard and verifies it loads

**Skip these nav items (no dedicated routes or sub-entities):**
- Subtasks, Work Logs, Activity Logs (accessed via task detail panel)
- Import, Imports (may not have routes yet)
- Team Pool (may be empty state, no create action needed)

**This test validates:**
- Full signup -> onboarding flow
- Navigation between all major features
- Each feature's inline form works
- Convex reactivity (items appear after creation)
- No routing errors across the app

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright 1.x (E2E), Vitest (integration) |
| Config file | `playwright.config.ts` (E2E), `vitest.config.ts` (unit/integration) |
| Quick run command | `npx playwright test e2e/todos.spec.ts` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| ACCEPT-01 | Scaffolded project typechecks | integration | `npm run typecheck` |
| ACCEPT-02 | Scaffolded project builds | integration | `npm run build` |
| ACCEPT-03 | Todos CRUD works in browser | E2E | `npx playwright test e2e/todos.spec.ts` |
| ACCEPT-04 | Tickets CRUD works in browser | E2E | `npx playwright test e2e/tickets.spec.ts` |
| ACCEPT-05 | Contacts CRUD works in browser | E2E | `npx playwright test e2e/contacts.spec.ts` |
| ACCEPT-06 | Full navigation journey completes | E2E | `npx playwright test e2e/journey.spec.ts` |

### Wave 0 Gaps

- [ ] `e2e/todos.spec.ts` -- covers ACCEPT-03
- [ ] `e2e/tickets.spec.ts` -- covers ACCEPT-04
- [ ] `e2e/contacts.spec.ts` -- covers ACCEPT-05
- [ ] `e2e/journey.spec.ts` -- covers ACCEPT-06
- [ ] `convex/testing/clearAll.ts` -- must add `todos`, `tickets`, `contacts` tables
- [ ] `e2e/helpers.ts` -- must add `createTodo`, `createTicket`, `createContact`

## Sources

### Primary (HIGH confidence)
- Direct file reads of all E2E test files, component source, backend mutations, i18n translations
- `feather-testing-core/playwright` Session API from `node_modules` type definitions
- `feather-testing-convex/playwright` createConvexTest from `node_modules` type definitions

## Metadata

**Confidence breakdown:**
- Existing patterns: HIGH -- read all 8 existing spec files and helpers
- Example app structure: HIGH -- read all component files, forms, items, pages
- Integration test state: HIGH -- read the full 570-line test file
- clearAll gap: HIGH -- confirmed by reading the mutation source
- Navigation items: HIGH -- read nav.ts directly

**Research date:** 2026-04-01
**Valid until:** 2026-04-30 (stable -- project E2E infrastructure is mature)
