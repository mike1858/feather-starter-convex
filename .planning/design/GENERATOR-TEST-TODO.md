# Generator Stress Test: Advanced Todo List

**Date:** 2026-03-28
**Tester:** Claude agent (agent-ab57257e worktree)
**Generator version:** plopfile.js as of commit ecb4e02 (main branch)

---

## What I Built

An advanced Todo List feature with:
- Tasks with title, description, priority (high/medium/low), due date, status (todo/in_progress/done)
- List view and card view (multi-view switching)
- Filtering by status and priority via FilterBar
- Task assignment to users (`behaviors.assignable: true`)
- Drag-and-drop reordering (`behaviors.orderable: true`)
- Status transitions with validation
- Subtask/parent relationship declared in YAML

**What was NOT achievable via generator alone:**
- Kanban view (tasks grouped by status columns)
- Due date rendered as a date picker (generated as raw number input)
- Subtask nesting UI (parent relationship declared but not scaffolded)
- `assigneeId` / `parentId` as actual DB columns (only as relationship metadata)

---

## Generator Usage

### YAML Definition

Written to `src/features/todos/todos.gen.yaml`:

```yaml
name: todos
label: Todo
labelPlural: Todos

fields:
  title:
    type: string
    required: true
    max: 200
  description:
    type: text
    max: 5000
  priority:
    type: enum
    values: [high, medium, low]
    default: medium
    filterable: true
  dueDate:
    type: number
    required: false
  status:
    type: enum
    values: [todo, in_progress, done]
    default: todo
    filterable: true
    transitions:
      todo: [in_progress]
      in_progress: [done]

timestamps: false

behaviors:
  assignable: true
  orderable: true
  softDelete: false
  auditTrail: false
  immutable: false

access:
  scope: owner
  permissions:
    create: authenticated
    read: owner
    update: owner
    delete: owner
  sharing: false

views:
  default:
    defaultView: list
    enabledViews: [list, card]
  list:
    density: comfortable
  card:
    size: default
    orientation: grid
    imageStyle: none
  filteredViews:
    - name: todos-by-status
      label: By Status
      filter: { status: todo }
      navEntry: false

relationships:
  assignee:
    type: belongs_to
    target: users
    required: false
    column: assigneeId
  parentTask:
    type: belongs_to
    target: todos
    required: false
    column: parentId

indexes:
  - name: by_userId
    fields: [userId]
  - name: by_status
    fields: [status]
  - name: by_priority
    fields: [priority]
  - name: by_assignee
    fields: [assigneeId]
  - name: by_parent
    fields: [parentId]
```

### What the Generator Produced

Run command: `echo "src/features/todos/todos.gen.yaml" | npx plop feature`
(run from main project root — the worktree lacks the `generators/` directory)

**Files created — 23 total:**

| File | Description |
|------|-------------|
| `src/shared/schemas/todos.ts` | Zod schema with enums, validators, create/update input types |
| `convex/todos/mutations.ts` | create, update, remove, updateStatus, assign, reorder mutations |
| `convex/todos/queries.ts` | list, get, todosByStatus queries |
| `convex/todos/mutations.test.ts` | 20+ mutation tests (all mutation functions covered) |
| `convex/todos/queries.test.ts` | Query tests |
| `src/features/todos/components/TodosPage.tsx` | Page with list/card view switching, filter support |
| `src/features/todos/components/TodosTitleBar.tsx` | Title bar with ViewSwitcher and Create button |
| `src/features/todos/components/TodosItem.tsx` | List item with drag handle, status badge, delete |
| `src/features/todos/components/TodosForm.tsx` | Inline + full form with all field types |
| `src/features/todos/components/TodosListView.tsx` | List with DnD (dnd-kit), infinite scroll sentinel |
| `src/features/todos/components/TodosCardView.tsx` | Card grid with infinite scroll |
| `src/features/todos/components/TodosDetailPage.tsx` | Full-page detail with read/edit modes |
| `src/features/todos/components/TodosStatusBadge.tsx` | Clickable status badge with transition logic |
| `src/features/todos/components/TodosViewSwitcher.tsx` | Toggle between list/card |
| `src/features/todos/components/TodosFilterBar.tsx` | Tab bar with all filterable enums + filteredViews |
| `src/features/todos/components/TodosEmptyState.tsx` | noData / noMatches / error states |
| `src/features/todos/components/TodosLoadingSkeleton.tsx` | Skeletons for list/card/table variants |
| `src/features/todos/index.ts` | Barrel export |
| `src/features/todos/todos.test.tsx` | Frontend integration tests (5 test cases) |
| `src/routes/_app/_auth/dashboard/_layout.todos.tsx` | TanStack Router route |
| `convex/schema.ts` (modified) | Todos table appended |
| `src/shared/nav.ts` (modified) | Nav entry appended |
| `src/shared/errors.ts` (modified) | Error group appended |
| `src/i18n.ts` (modified) | Namespace appended |
| `public/locales/en/todos.json` | English translations |
| `public/locales/es/todos.json` | Spanish translations |
| `src/features/todos/todos.resolved.yaml` | Resolved config for transparency |

**Generator ran successfully on first attempt. Zero interactive prompts after providing the YAML path.**

### Errors/Issues During Generation

**None at runtime.** The generator completed without crashing or erroring. However, the generated code contains several bugs (detailed below).

---

## Manual Work Required

### What the Generator Couldn't Handle

#### 1. Kanban View — Not Supported at All

The YAML supports `enabledViews: [list, card, table]` but there is no `kanban` view type. A kanban board (tasks grouped into status columns with drag-drop between columns) requires:
- A `kanban-view.tsx.hbs` template (does not exist)
- Backend query that returns tasks grouped by status (not a simple `list` query)
- Inter-column DnD using dnd-kit's `DragOverlay` + multiple `SortableContext` instances
- Status mutation wired to `onDragEnd` between columns

**Everything for kanban would need to be written manually.** Estimated 200-300 lines.

#### 2. Due Date as Date Picker — Wrong Field Type

The YAML declares `dueDate: { type: number }` which is the correct Convex storage type (Unix timestamp). However, the generator renders this as a raw `<input type="number" />`. A usable due date requires:
- A date picker component or `<input type="date">` with proper conversion
- Display formatting (e.g., "Mar 28" not "1743120000000")
- Relative labels ("Today", "Overdue") — out of scope for generator

Manual fix: ~15 lines in `TodosForm.tsx` and `TodosItem.tsx`.

#### 3. Subtask/Parent Relationship — Declared but Not Scaffolded

The YAML has a `belongs_to` relationship to `todos.parentId`. The generator:
- Added `by_parent` and `by_parentId` indexes to `convex/schema.ts` — but `parentId` is not a field in the table definition. This produces a **broken Convex schema** (index on a nonexistent column).
- Did NOT add `parentId: v.optional(v.id("todos"))` to the schema table definition.
- Did NOT generate any UI for nested subtasks (subtask list, add-subtask form, etc.).

Manual fix required: add `parentId` field to schema, write a `listByParent` query, write a subtask section component.

#### 4. `assigneeId` Field Missing from Schema Table

The `behaviors.assignable: true` flag causes the generator to:
- Generate an `assign` mutation that writes `assigneeId`
- Generate `by_assignee` and `by_assigneeId` indexes on the table
- But NOT add `assigneeId: v.optional(v.id("users"))` to the table definition

The schema wires an index on a column that doesn't exist. This will cause a Convex deploy error.

Manual fix: add `assigneeId: v.optional(v.id("users"))` to the todos table in `convex/schema.ts`.

#### 5. Duplicate Indexes in Schema

The yaml-resolver auto-computes indexes for `belongs_to` relationship columns AND `filterable` enum fields. Since I also listed these in the `indexes:` section of the YAML, the generator produced **duplicate index names** in the schema:

```typescript
.index("by_assignee", ["assigneeId"])    // from YAML
.index("by_parent", ["parentId"])         // from YAML
.index("by_assigneeId", ["assigneeId"])  // auto-computed
.index("by_parentId", ["parentId"])      // auto-computed
```

Convex will reject duplicate index names. Manual fix: remove the duplicates.

#### 6. Duplicate Import Statement in mutations.ts

```typescript
import { zodToConvex } from "convex-helpers/server/zod4";
import { zodToConvex } from "convex-helpers/server/zod4";  // DUPLICATE
```

The template iterates over fields and emits one import per enum field without deduplication. With two enum fields (priority + status), the import appears twice. TypeScript will reject this.

Root cause: `mutations.ts.hbs` lines 7-11 emit `import { zodToConvex }` inside `{{#each fields}}{{#ifEq this.type "enum"}}` without a uniqueness guard.

#### 7. Barrel Export References Non-Existent Component

`src/features/todos/index.ts` exports:
```typescript
export { TodosTodosByStatusPage } from "./components/TodosTodosByStatusPage";
```

This component was never generated. The `filteredViews` in YAML creates this export in `index.ts.hbs` but there is no corresponding `filtered-page.tsx.hbs` template to create the component. **Build will fail immediately.**

#### 8. Card View Renders Wrong StatusBadge

`TodosCardView.tsx` renders `TodosStatusBadge` for both enum fields:
```tsx
<TodosStatusBadge
  status={item.priority as string}  // BUG: passing priority to status badge
  itemId={item._id as any}
/>
<TodosStatusBadge
  status={item.status as string}
  itemId={item._id as any}
/>
```

The `TodosStatusBadge` hardcodes status transitions (`todo → in_progress → done`). Passing `priority` to it will trigger a mutation with wrong values on click. The card-view template `{{#each fields}}{{#ifEq this.type "enum"}}{{#if @first}}{{else}}` logic skips the FIRST enum field but renders all subsequent ones with the same status badge component — it should use a different badge for non-transition enums like priority.

#### 9. FilterBar Over-Generates Filter Tabs

`TodosFilterBar.tsx` has 8 filter tabs including both `filteredViews` AND all individual enum values for BOTH enum fields:
```
All | By Status | priority:high | priority:medium | priority:low | status:todo | status:in_progress | status:done
```

This is 8 tabs for a feature that only needs 4-5. The filter logic in `TodosPage.tsx` handles enum filters correctly via `field:value` splitting — but it does NOT correctly apply `filteredViews` filters (the filter logic ignores the actual filter conditions and just returns `true`):

```typescript
if (activeFilter === "todos-by-status") {
  return true;  // BUG: ignores { status: "todo" } filter
}
```

#### 10. Locale File Has Duplicate JSON Key

`public/locales/en/todos.json` contains `"priority"` as a top-level key twice:
```json
"priority": {
  "high": "High Priority",
  "normal": "Normal"
},
"priority": {
  "high": "High",
  "medium": "Medium",
  "low": "Low"
}
```

The second overwrites the first in JSON parsers, but the first shouldn't exist at all. This is a template bug in `locale-en.json.hbs` — it has both a hardcoded `priority` block and a generated one.

#### 11. Form Schema Import Wrong

`TodosForm.tsx` imports:
```typescript
import { todosSchema } from "@/shared/schemas/todos";
```

But `src/shared/schemas/todos.ts` exports `createTodosInput` and `updateTodosInput`, not `todosSchema`. This is a nonexistent export.

#### 12. `EmptyState` Component Accepts `icon` Prop That Isn't in Interface

`TodosCardView.tsx` calls:
```tsx
<TodosEmptyState variant="noData" icon={LayoutGrid} />
```

But `TodosEmptyState`'s interface only accepts `variant` and `onAction`. The `icon` prop is silently ignored (TypeScript error).

#### 13. Worktree Does Not Have Generators

The generators live in `generators/` which only exists in the main project branch. The worktree for this agent (`agent-ab57257e`) is on branch `worktree-agent-ab57257e` which tracks commit `87f197a` — predating the generator system. Running `npx plop` from the worktree fails because `plopfile.js` imports from `./generators/` which doesn't exist.

**This makes generators inaccessible from isolated worktrees** — which are the expected environment for agent-based feature work.

### Percentage Breakdown

| Category | Estimated % |
|----------|-------------|
| **Generated and correct** | ~55% |
| **Generated but has bugs** | ~20% |
| **Declarable (could be generated with better YAML/templates)** | ~10% |
| **Truly custom (kanban, date picker, subtask UI)** | ~15% |

**Net assessment:** The generator produced a working skeleton in ~60 seconds that would take 3-4 hours to write manually. But it's not production-ready — it requires ~45 minutes of bug-fixing before it compiles, and additional time for the missing features.

---

## Specific Gaps

### Missing Generator Capabilities

#### 1. No Kanban View Type

The `enabledViews` array supports `list`, `card`, `table` but not `kanban`. A kanban view is the most requested view for status-based entities. This is a common enough pattern (any entity with a status enum and `transitions`) that it should be declarable:

```yaml
views:
  default:
    enabledViews: [list, kanban]
  kanban:
    groupBy: status        # which field to group columns by
    columnOrder: [todo, in_progress, done]
    cardFields: [title, priority, dueDate]
```

#### 2. No `date` Field Type

There is no `date` field type — only `number`. A `dueDate` stored as a Unix timestamp is correct for Convex, but the generator renders number fields as raw number inputs. A `date` type would:
- Store as `number` in Convex (Unix ms)
- Render as `<input type="date">` in forms with proper ISO conversion
- Display as formatted date string in list/card/detail views

#### 3. Relationships Don't Add Fields to Schema

`belongs_to` relationships (with `column:`) declare a foreign key column but the wiring action does NOT add that column to the Convex table definition. The `appendToSchema` action in `wiring.js` only writes fields from `config.fields`, not from `config.relationships`. So `parentId` and `assigneeId` (from relationships) are missing from the table but referenced in indexes and mutations.

The fix is either: (a) have relationships auto-add their column to `fields`, or (b) have `appendToSchema` also process relationships.

#### 4. No Nested/Subtask UI Scaffolding

The `relationships` section can declare `children` and `embedded` types but no templates exist to scaffold a child-item list within the parent detail page. The `RelationshipConfig` type has `type: "children" | "has_many" | "belongs_to" | "embedded"` but only `belongs_to` is meaningfully handled.

#### 5. `filteredViews` Creates Exports for Pages That Don't Exist

The `index.ts.hbs` template exports a `${Name}${FilteredViewName}Page` for each filteredView, but there is no template to create those page components. This is a broken promise — either the template should generate the pages or not export them.

#### 6. Duplicate Import Generation in mutations.ts.hbs

Template loops over fields and emits imports per-field without deduplication. Multiple enum fields = multiple duplicate `import { zodToConvex }` lines.

#### 7. `assign` Mutation Hardcodes `visibility` Field

The `assign` mutation template references `patch.visibility = "shared"` — which assumes the entity has a `visibility` field. Our todos table does NOT have this field (we used `scope: owner` not a custom visibility model). This is a template assumption leaking from the `tasks` feature's design.

#### 8. Backend Test Seeds Use `creatorId` Not `userId`

In `mutations.test.ts.hbs`, the seed data uses `creatorId: userId` but the mutations.ts.hbs creates records with `userId` (not `creatorId`). The test template was designed for the tasks feature which has a `creatorId` column; the generic template should use whatever ownership field is present.

### Pain Points

1. **Generators not available in worktrees.** This is a significant workflow blocker. Agent-based work happens in isolated worktrees, but generators only exist in the main branch. Worktrees need either a shared symlink to generators/, or generators need to be committed to the worktree branch.

2. **No validation pass after generation.** The generator should optionally run `tsc --noEmit` after writing all files to surface compile errors immediately. Instead, you discover bugs only when you try to run the app.

3. **Schema wiring creates broken indexes.** When `relationships` declare columns that aren't in `fields`, the auto-computed indexes reference nonexistent columns. The resolver should validate that every index field exists as either a field name, a relationship column, or a known system field (`userId`, `position`, etc.).

4. **Deduplication of auto-computed indexes vs. explicitly declared indexes.** The yaml-resolver auto-adds indexes for `filterable` fields AND for `belongs_to` relationship columns. If those same indexes are explicitly listed in `indexes:`, they are duplicated. The resolver should check before adding.

5. **FilterBar generates too many tabs for multi-enum features.** When a feature has two enum fields (priority + status), both filterable, the filter bar renders all values of both enums as individual tabs. For a real feature, you'd want grouped dropdowns or separate filter controls, not 8 tabs.

6. **The `filteredViews` filter logic is broken in generated page code.** The `TodosPage.tsx` filter function recognizes filteredView names but does not apply their filter conditions — it just returns `true`. The template should generate actual field comparisons from the YAML filter object.

7. **`number` type for date fields.** Declaring a Unix timestamp is idiomatic in Convex but the UI renders it as a number spinner. There's no way in the YAML to say "this number is a date" without a dedicated `date` type.

8. **Generator runs against main project only, not isolated.** Running the generator writes files to the main project and modifies `convex/schema.ts`, `src/shared/nav.ts`, etc. For testing/research purposes, there's no dry-run mode or output-directory override.

9. **Card view uses wrong badge for non-status enums.** The `card-view.tsx.hbs` template renders `StatusBadge` for every enum field after the first. But `StatusBadge` is wired to the status transition logic. Priority doesn't have transitions and shouldn't use `StatusBadge` — it needs a simple display badge.

### Positive Surprises

1. **Schema wiring works beautifully for simple cases.** The `appendToSchema` action correctly adds the table with proper Convex validators, adds the `zodToConvex` import if needed, and positions the table before the closing brace. For features without relationship columns in indexes, it would work perfectly.

2. **The `smartAdd` re-run behavior is elegant.** The `// @generated-start`/`// @generated-end` markers with `// @custom-start`/`// @custom-end` regions mean you can re-run the generator after updating the YAML and your custom code is preserved. This is the most valuable generator innovation — it changes generators from one-shot tools to iterative development partners.

3. **Generated tests are realistic.** The mutation tests cover: unauthenticated access (does nothing), not-found throws, happy path create/update/delete, and status transition validation. These are genuinely useful tests, not just stubs.

4. **FilterBar auto-detects filterable fields and filteredViews.** No extra YAML required — declaring `filterable: true` on an enum field automatically adds it to the filter bar. The concept is right, even if the execution (too many tabs) needs refinement.

5. **Status badge with clickable transitions is generated correctly.** `TodosStatusBadge.tsx` correctly derives the `STATUS_TRANSITIONS` map from the YAML `transitions` object, sets the next state, and wires it to `updateStatus`. This is non-trivial logic generated correctly.

6. **Locale files are complete.** The `locale-en.json.hbs` template generates translations for nav, form labels, empty states, errors, and enum values. Most features would need minimal translation additions after generation.

7. **The `resolved.yaml` transparency file is useful.** Writing `todos.resolved.yaml` shows exactly what config was used after defaults were merged. This makes debugging template output much easier.

8. **No boilerplate fatigue.** Going from YAML to 23 files in 60 seconds is genuinely impressive. The cognitive overhead of writing mutation→query→schema→route→nav→i18n from scratch is eliminated.

---

## Recommendations for DX Architecture

### Priority 1 — Fix Broken Generators (Blockers)

**1.1 Make generators available in worktrees.**
The simplest fix: symlink `generators/`, `templates/`, and `plopfile.js` from the main branch into worktrees at creation time. Or: extract generators into a separate npm package that's a dev dependency, making it always available.

**1.2 Fix the `filteredViews` → missing component bug.**
Either generate `${Name}${FilteredViewName}Page` components (with a `filtered-page.tsx.hbs` template), or remove the export from `index.ts.hbs`. The current state breaks the build.

**1.3 Fix `belongs_to` relationships not adding fields to schema table.**
In `wiring.js` `appendToSchema`, after writing fields from `config.fields`, also iterate `config.relationships` and add `v.optional(v.id("target"))` for each `belongs_to` relationship's column. Without this, any feature using relationships produces an invalid schema.

**1.4 Fix duplicate index generation.**
In `yaml-resolver.js` `resolveDefaults()`, before adding auto-computed indexes, check against the explicitly-declared `indexes` list. Currently both `by_assigneeId` (auto) and `by_assignee` (declared) are added when the user explicitly declared `by_assignee`.

**1.5 Fix duplicate imports in mutations.ts.hbs.**
Use a set or a single conditional instead of iterating over fields for the `zodToConvex` import:

```handlebars
{{#if hasEnumFields}}
import { zodToConvex } from "convex-helpers/server/zod4";
{{/if}}
```

The `hasEnumFields` helper would check once if any field is an enum.

**1.6 Fix `assign` mutation's hardcoded `visibility` reference.**
The template should only emit the visibility logic when the feature has a `visibility` field. Or better: make `visibility` a first-class behavior flag like `behaviors.visibility: true`.

### Priority 2 — Missing Features That Would Add Real Value

**2.1 Add `date` field type.**
Map to `number` in Convex, but render as date picker in forms and formatted date in list/card/detail. This is extremely common.

**2.2 Add `kanban` view type.**
Conditions for generation: feature has an enum field with `transitions`. Generates `KanbanView` with status columns, inter-column DnD, column count auto-derived from enum values.

**2.3 Fix `filteredViews` filter application in page.**
The generated `page.tsx.hbs` filter function should apply the actual filter conditions from YAML:

```handlebars
{{#each views.filteredViews}}
if (activeFilter === "{{name}}") {
  return {{#each filter}}item.{{@key}} === {{json this}}{{#unless @last}} && {{/unless}}{{/each}};
}
{{/each}}
```

**2.4 Separate display badge from transition badge.**
Introduce `DisplayBadge` (read-only enum display) and `StatusBadge` (clickable with transitions). The card view template should use `DisplayBadge` for enums without transitions and `StatusBadge` for enums with transitions.

### Priority 3 — Quality of Life Improvements

**3.1 Post-generation typecheck.**
After all files are written, run `tsc --noEmit` and print a summary of type errors found. This surfaces bugs like the duplicate imports and missing exports immediately.

**3.2 Dry-run mode.**
Add a `--dry-run` flag that prints what would be generated without writing files. Essential for testing generator changes.

**3.3 Fix locale template duplicate keys.**
The `locale-en.json.hbs` has a hardcoded `"priority"` block that conflicts with the generated one. Audit all templates for hardcoded assumptions from the `tasks` feature design.

**3.4 Generator runnable from any directory.**
Instead of requiring `cwd` to be the project root, accept an optional `--cwd` flag or detect the project root by walking up to find `plopfile.js`.

**3.5 Relationship scaffolding for `children` type.**
When a relationship has `type: children`, generate a `ChildName`List component in the parent's detail page sidebar. This would make subtask support declarable.

---

## Overall Assessment

The generator system is architecturally sound and genuinely useful. The YAML-driven approach with `smartAdd` region preservation is the right design. For a clean entity (no relationships, single enum, no special views), the generator produces ~90% ready-to-use code.

The stress test revealed it degrades for complex entities:
- Two enum fields → duplicate imports
- Any relationship → missing schema fields + duplicate indexes
- filteredViews → broken barrel export
- Non-standard views (kanban) → complete gap

The fix list is well-defined and none of the bugs are architectural — they are template and resolver logic fixes, each localizable to 5-20 lines. With the Priority 1 fixes applied, the generator would produce compilable code for the majority of real-world features.
