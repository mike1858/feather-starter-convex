# Fix Generator Bugs Found in Stress Tests

Created: 2026-03-28
Status: COMPLETE
Approved: Yes
Iterations: 0
Worktree: No
Type: Bugfix

## Summary

**Symptom:** Generator produces code with 6-9 compile-blocking bugs per feature when using enums, relationships, filteredViews, or branching transitions.
**Trigger:** Running `npx plop feature` with YAML definitions from 3 stress tests (todos, contacts, deals).
**Root Cause:** 10 distinct bugs across 6 files — all template/resolver logic issues, none architectural.

## Investigation

All bugs traced to specific file:line. Each was independently confirmed by 2-3 stress test agents.

### Bug → Root Cause Map

| # | Bug | Root Cause | File:Line |
|---|-----|-----------|-----------|
| 1 | belongs_to FK columns missing from schema | `appendToSchema` only iterates `fields`, ignores `relationships` | `wiring.js:121-128` |
| 2 | Duplicate zodToConvex import | `{{#each fields}}` emits import per enum field | `mutations.ts.hbs:7-11` |
| 3 | Schema import collisions (two features with `status`) | Enum imports use bare names, no aliasing | `wiring.js:84-86` |
| 4 | Duplicate auto-computed indexes | Auto-index doesn't check if same COLUMN already indexed under different name | `yaml-resolver.js:95-117` |
| 5 | Branching transitions broken | `newIndex !== currentIndex + 1` only allows linear advance | `mutations.ts.hbs:183` |
| 6 | filteredViews exports non-existent pages | `index.ts.hbs` exports pages no template generates | `index.ts.hbs:4-6` |
| 7 | filteredViews filter returns true | Template uses `{{#each filters}}` but YAML key is `filter` | `page.tsx.hbs:49` |
| 8 | assign mutation hardcodes visibility | Assumes `visibility` field exists | `mutations.ts.hbs:219-222` |
| 9 | Card view uses StatusBadge for all enums | `{{#if @first}}{{else}}` instead of `{{#if this.transitions}}` | `card-view.tsx.hbs:161-168` |
| 10 | Form imports wrong schema name | Imports `{{camelCase name}}Schema` which doesn't exist | `form.tsx.hbs:23` |

## Fix Approach

**Chosen:** Fix at source — each bug is a localized template or resolver fix (5-20 lines each).
**Why:** All bugs are independent, no shared root cause, no architectural change needed.

**Files to modify:**
- `generators/utils/wiring.js` — bugs 1, 3
- `generators/utils/yaml-resolver.js` — bug 4
- `templates/feature/mutations.ts.hbs` — bugs 2, 5, 8
- `templates/feature/index.ts.hbs` — bug 6
- `templates/feature/page.tsx.hbs` — bug 7
- `templates/feature/card-view.tsx.hbs` — bug 9
- `templates/feature/form.tsx.hbs` — bug 10
- `templates/feature/status-badge.tsx.hbs` — bug 5 (transition display)

**Verification:** Generate todos, contacts, and deals features → typecheck → tests pass.

## Progress

- [x] Task 1: Fix wiring.js (belongs_to FK columns + schema import aliasing)
- [x] Task 2: Fix yaml-resolver.js (duplicate index dedup by column)
- [x] Task 3: Fix template bugs (mutations, index, page, card-view, form, status-badge)
- [x] Task 4: Verify — generate 3 features, typecheck, test
      **Tasks:** 4 | **Done:** 4

## Tasks

### Task 1: Fix wiring.js — belongs_to FK columns + schema import aliasing

**Objective:** Make `appendToSchema` add FK columns from relationships AND alias enum imports to avoid collisions.
**Files:** `generators/utils/wiring.js`

**Bug 1 fix:** After the `fields` loop at line 128, add a second loop over `answers.relationships`. For each `belongs_to` relationship with a `column`, add `v.optional(v.id("target"))` (or `v.id("target")` if required) to `fieldLines`.

**Bug 3 fix:** Change import generation at line 84-86. Instead of bare `import { status } from "..."`, use aliased imports: `import { status as ${name}Status } from "..."`. Update the table definition to reference the aliased name: `zodToConvex(${name}Status)` instead of `zodToConvex(status)`.

**Verify:** Read generated `convex/schema.ts` after running generator — FK columns present, imports aliased.

### Task 2: Fix yaml-resolver.js — duplicate index dedup by column

**Objective:** Auto-computed indexes should check if the same column is already indexed, not just the same name.
**Files:** `generators/utils/yaml-resolver.js`

**Bug 4 fix:** At line 86, build a `Set` of existing indexed columns (not just names): `const existingColumns = new Set(indexes.flatMap(idx => idx.fields))`. Before adding an auto-index, check `existingColumns` in addition to `existingNames`. If the column is already covered by any existing index, skip.

**Verify:** YAML with `indexes: [{ name: by_assignee, fields: [assigneeId] }]` + `behaviors.assignable: true` should NOT produce both `by_assignee` and `by_assigneeId`.

### Task 3: Fix template bugs (6 templates)

**Objective:** Fix all Handlebars template issues.
**Files:** 6 template files

**Bug 2 — mutations.ts.hbs:** Replace the `{{#each fields}}{{#ifEq this.type "enum"}}import { zodToConvex }{{/ifEq}}{{/each}}` loop with a single conditional. Use a custom helper `{{#hasEnumFields fields}}` or just move the import to the static imports section (it's already imported via `zCustomMutation` from the same package — check if it's re-exported). Actually, simplest fix: the import already exists on line 6 (`import { zCustomMutation } from "convex-helpers/server/zod4"`). Just add `zodToConvex` to that import and remove the loop entirely.

**Bug 5 — mutations.ts.hbs:** Replace `if (newIndex !== currentIndex + 1)` with a transition map lookup. Generate a `TRANSITIONS` const from the YAML transitions object, then check: `if (!TRANSITIONS[currentStatus]?.includes(newStatus))`. This handles both linear and branching transitions.

**Bug 5 — status-badge.tsx.hbs:** The `firstValue` helper already handles the display side — the badge shows the first valid transition. For branching, the badge click should show a dropdown if there are multiple next states. For now, keeping `firstValue` (advance to first option) is acceptable — the mutation will validate.

**Bug 6 — index.ts.hbs:** Remove the `{{#each views.filteredViews}}` export block. FilteredViews are filter states within the main page, not separate page components.

**Bug 7 — page.tsx.hbs:** Change `{{#each filters}}` to `{{#each filter}}` on line 49 to match the YAML key name.

**Bug 8 — mutations.ts.hbs:** Wrap the `patch.visibility = "shared"` lines in a conditional: only emit when the feature YAML declares a `visibility` field in `fields`. Check with `{{#if fields.visibility}}`.

**Bug 9 — card-view.tsx.hbs:** Replace `{{#if @first}}{{else}}` with `{{#if this.transitions}}` at line 162. This shows StatusBadge only for enums with transitions, and shows a plain text badge for other enums.

**Bug 10 — form.tsx.hbs:** Change line 23 from `import { {{camelCase name}}Schema }` to `import { create{{pascalCase name}}Input }`. Or better: remove the import entirely since the form doesn't use it for validation (TanStack Form handles that).

**Verify:** Typecheck after generating features.

### Task 4: Verify — generate 3 features, typecheck, tests

**Objective:** Generate todos, contacts, and deals features using fixed generators. Verify everything compiles and tests pass.
**Steps:**
1. Create YAML definitions for todos, contacts, deals (from stress test reports)
2. Run `npx plop feature` for each
3. `npm run typecheck` — zero errors
4. `npm test` — all pass, 100% coverage
5. Clean up generated features (revert schema.ts, nav.ts, errors.ts, i18n.ts, delete feature dirs)

**Verify:** `npm run typecheck && npm test`
