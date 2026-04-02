# Example Apps Guide

How to generate working features using the Feather generators. Three example apps included:

- **Todos** -- simple TodoMVC (title + completed boolean)
- **Tickets** -- issue tracker (status workflow with open/in_progress/resolved/closed, priority enum)
- **Contacts** -- contact manager (name, email, company, status, phone, list + table views)

All three examples are already installed in the repo. This guide walks through recreating them from scratch so you understand the full generator workflow.

---

## Prerequisites

- Node.js 18+, npm installed
- Project cloned and `npm install` done
- Convex dev server running: `npx convex dev`

---

## The Generator Workflow

Every feature follows the same 5-step process:

1. **Create `feather.yaml` spec** -- define your entity's fields, behaviors, and views
2. **Run `npm run gen:feature`** -- generates schema, backend, frontend, tests, routes, translations
3. **Run `npx convex dev --once`** -- regenerates Convex types so imports resolve
4. **Wire into the app** -- add nav entry, i18n namespace, error constants, schema table
5. **Verify** -- typecheck, test, run the live app

The generator reads `src/features/{name}/feather.yaml` and produces files across the entire stack. It also auto-wires shared files (schema.ts, nav.ts, errors.ts, i18n.ts, locale files).

### What the Generator Creates

| Category | Files |
|----------|-------|
| Zod schema | `src/shared/schemas/{name}.ts` |
| Backend queries | `convex/{name}/queries.ts` |
| Backend mutations | `convex/{name}/mutations.ts` |
| Backend tests | `convex/{name}/queries.test.ts`, `convex/{name}/mutations.test.ts` |
| Frontend page | `src/features/{name}/components/{Name}Page.tsx` |
| Frontend list view | `src/features/{name}/components/{Name}ListView.tsx` |
| Frontend form | `src/features/{name}/components/{Name}Form.tsx` |
| Frontend item | `src/features/{name}/components/{Name}Item.tsx` |
| Frontend detail page | `src/features/{name}/components/{Name}DetailPage.tsx` |
| Frontend title bar | `src/features/{name}/components/{Name}TitleBar.tsx` |
| Frontend filter bar | `src/features/{name}/components/{Name}FilterBar.tsx` |
| Frontend empty state | `src/features/{name}/components/{Name}EmptyState.tsx` |
| Frontend loading skeleton | `src/features/{name}/components/{Name}LoadingSkeleton.tsx` |
| Frontend barrel export | `src/features/{name}/index.ts` |
| Frontend test | `src/features/{name}/{name}.test.tsx` |
| Route | `src/routes/_app/_auth/dashboard/_layout.{name}.tsx` |
| Translations | `public/locales/en/{name}.json`, `public/locales/es/{name}.json` |
| Resolved spec | `src/features/{name}/{name}.resolved.yaml` |

### What You Must Do Manually

| Step | File | What to add |
|------|------|-------------|
| Schema table | `convex/schema.ts` | `defineTable(...)` with fields, indexes |
| Nav entry | `src/shared/nav.ts` | Append to `navItems` array |
| i18n namespace | `src/i18n.ts` | Append to `ns` array |
| Error constants | `src/shared/errors.ts` | Add group to `ERRORS` object |
| Route tree | `src/routeTree.gen.ts` | Re-run TanStack Router dev server (auto-generated) |

---

## Example 1: Todos (Simple)

A basic TodoMVC: each todo has a `title` (string) and `completed` (boolean). Owner-scoped, orderable, no timestamps.

### Step 1: Create the YAML Spec

Create `src/features/todos/todosfeather.yaml`:

```yaml
name: todos
label: Todo
labelPlural: Todos

fields:
  title:
    type: string       # Rendered as <Input>, max 200 by default
    required: true
    max: 200
  completed:
    type: boolean       # Rendered as <Switch>
    default: false
    filterable: true    # Generates a filter tab for this field

timestamps: false       # No createdAt/updatedAt fields

behaviors:
  softDelete: false     # Hard delete
  auditTrail: false     # No change tracking
  immutable: false      # Fields are editable
  assignable: false     # No assigneeId field
  orderable: true       # Adds position field + drag-and-drop

access:
  scope: owner          # Each user sees only their own todos
  permissions:
    create: authenticated
    read: owner
    update: owner
    delete: owner

views:
  default:
    defaultView: list
    enabledViews: [list]  # Only list view (no card or table)
  list:
    density: comfortable

operations:
  create: true
  read: true
  update: true
  delete: true
```

**Key decisions:**
- `timestamps: false` overrides the default (`both`), so no `createdAt`/`updatedAt` columns
- `orderable: true` adds a `position: v.number()` field and a `reorder` mutation
- `filterable: true` on `completed` generates filter tabs in the FilterBar
- Only `list` view enabled (defaults include `card` and `table`)

### Step 2: Generate

```bash
npm run gen:feature -- --name todos
```

This reads `src/features/todos/todosfeather.yaml` and generates all files listed in the table above.

### Step 3: What Gets Created

**Zod schema** (`src/shared/schemas/todos.ts`):

```typescript
export const createTodosInput = z.object({
  title: z.string().max(TITLE_MAX_LENGTH).min(1).trim(),
  completed: z.boolean().default(false),
});

export const updateTodosInput = z.object({
  title: z.string().max(TITLE_MAX_LENGTH).optional(),
  completed: z.boolean().optional(),
});
```

**Backend mutations** (`convex/todos/mutations.ts`):
- `create` -- uses `zCustomMutation` with the Zod schema for input validation
- `update` -- uses plain `mutation` with `v.optional()` for each field
- `remove` -- hard delete by ID
- `reorder` -- updates the `position` field (because `orderable: true`)

**Backend queries** (`convex/todos/queries.ts`):
- `list` -- returns all todos for the authenticated user, sorted by `position`
- `get` -- returns a single todo by ID

**Frontend** -- Page component uses `useQuery` with `convexQuery` to fetch data, renders TitleBar, inline Form, FilterBar, and ListView.

### Step 4: Manual Wiring

**4a. Add schema table** in `convex/schema.ts`:

```typescript
todos: defineTable({
  title: v.string(),
  completed: v.optional(v.boolean()),
  userId: v.id("users"),
  position: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_completed", ["completed"]),
```

Note: `userId` is always present for `scope: owner`. `position` is always present when `orderable: true`. The `by_completed` index is generated because `completed` has `filterable: true`.

**4b. Add nav entry** in `src/shared/nav.ts`:

```typescript
{
  label: "Todos",
  i18nKey: "todos.nav.todos",
  to: "/dashboard/todos",
},
```

**4c. Add i18n namespace** in `src/i18n.ts`:

Append `"todos"` to the `ns` array.

**4d. Add error constants** in `src/shared/errors.ts`:

```typescript
todos: {
  NOT_FOUND: "Todo not found.",
  INVALID_STATUS_TRANSITION: "Invalid status transition.",
},
```

**4e. Regenerate Convex types**:

```bash
npx convex dev --once
```

This regenerates `convex/_generated/api.ts` and `convex/_generated/dataModel.ts` so that `api.todos.queries.list` and related imports resolve.

**4f. Regenerate route tree**:

The TanStack Router dev server auto-generates `src/routeTree.gen.ts` when it detects new route files. If you're running `npm run dev`, it happens automatically. Otherwise, run the dev server briefly to trigger it.

### Step 5: Verify

```bash
npm run typecheck    # All 3 tsconfigs must pass
npm test             # 100% coverage required
npm run dev          # Check the live app at /dashboard/todos
```

---

## Example 2: Tickets (With Enums + Assignment)

An issue tracker: each ticket has a `title` (string), `description` (text), `status` (enum), `priority` (enum), and can be assigned to a user. This example shows how enum fields and the `assignable` behavior change what gets generated.

### Step 1: Create the YAML Spec

Create `src/features/tickets/ticketsfeather.yaml`:

```yaml
name: tickets
label: Ticket
labelPlural: Tickets

fields:
  title:
    type: string
    required: true
    max: 200
  description:
    type: text           # Rendered as <textarea>, max 5000 by default
  status:
    type: enum           # Rendered as <select> in forms, dot badge in list items
    values: [open, in_progress, resolved, closed]
    default: open
    filterable: true     # Generates filter tabs for each status value
  priority:
    type: enum
    values: [low, medium, high, critical]
    default: medium
    filterable: true

timestamps: false

behaviors:
  softDelete: false
  auditTrail: false
  immutable: false
  assignable: true       # Adds assigneeId field + assign mutation
  orderable: true

access:
  scope: owner
  permissions:
    create: authenticated
    read: owner
    update: owner
    delete: owner

views:
  default:
    defaultView: list
    enabledViews: [list]
  list:
    density: comfortable

operations:
  create: true
  read: true
  update: true
  delete: true
```

### Step 2: Generate

```bash
npm run gen:feature -- --name tickets
```

### Step 3: What's Different from Todos

**Enum fields produce additional artifacts:**

| Artifact | What changes |
|----------|-------------|
| Zod schema | Exports `STATUS_VALUES`, `status` (Zod enum), `Status` (TypeScript type). Same for `priority`. |
| Schema table | Uses `zodToConvex(tickets_status)` instead of raw `v.string()` |
| FilterBar | Gets filter tabs for every enum value: `status:open`, `status:in_progress`, `priority:low`, etc. |
| Item component | Shows enum values as dot badges next to the title |
| StatusBadge | An empty `TicketsStatusBadge.tsx` is generated (scaffold only, needs implementation) |
| Translations | Includes `"status": { "open": "Open", ... }` and `"priority": { "low": "Low", ... }` sections |

**The `assignable: true` behavior produces:**

| Artifact | What changes |
|----------|-------------|
| Mutations | Adds an `assign` mutation that patches `assigneeId` |
| Mutation tests | Adds `describe("assign", ...)` with auth, not-found, assign, and unassign tests |
| Create mutation | Sets `assigneeId: userId` (assigns to creator by default) |
| Schema | Needs `assigneeId: v.optional(v.id("users"))` in the table definition |

**Zod schema** (`src/shared/schemas/tickets.ts`):

```typescript
export const STATUS_VALUES = ["open", "in_progress", "resolved", "closed"] as const;
export const status = z.enum(STATUS_VALUES);
export type Status = z.infer<typeof status>;

export const PRIORITY_VALUES = ["low", "medium", "high", "critical"] as const;
export const priority = z.enum(PRIORITY_VALUES);
export type Priority = z.infer<typeof priority>;

export const createTicketsInput = z.object({
  title: z.string().max(TITLE_MAX_LENGTH).min(1).trim(),
  description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
  status: status.optional(),
  priority: priority.optional(),
});
```

**Schema table** in `convex/schema.ts` -- note the `zodToConvex` imports:

```typescript
import {
  status as tickets_status,
  priority as tickets_priority,
} from "../src/shared/schemas/tickets";

// In the schema definition:
tickets: defineTable({
  title: v.string(),
  description: v.optional(v.string()),
  status: zodToConvex(tickets_status),
  priority: zodToConvex(tickets_priority),
  userId: v.id("users"),
  assigneeId: v.optional(v.id("users")),   // from assignable: true
  position: v.number(),                      // from orderable: true
})
  .index("by_userId", ["userId"])
  .index("by_status", ["status"])           // from filterable: true
  .index("by_priority", ["priority"]),      // from filterable: true
```

**FilterBar** -- tickets gets 9 filter tabs (all + 4 status + 4 priority) vs todos' single "All" tab.

**Tests** -- the backend mutation tests for tickets include seeding with all required enum fields:

```typescript
// Seeding a ticket in tests requires all enum fields:
await ctx.db.insert("tickets", {
  title: "Seed",
  description: "Seed content",
  status: "open",
  priority: "low",
  userId: userId,
  assigneeId: userId,
  position: 1,
});
```

### Step 4: Manual Wiring

Same as todos, plus the `zodToConvex` imports in `convex/schema.ts`:

```typescript
import {
  status as tickets_status,
  priority as tickets_priority,
} from "../src/shared/schemas/tickets";
```

Use aliased imports (e.g., `tickets_status`) because multiple features may export `status`.

### Step 5: Verify

Same commands as todos: `npm run typecheck`, `npm test`, `npm run dev`.

---

## Quick Reference

### YAML Field Types

| Type | Renders as (form) | Renders as (list item) | Schema validator | Notes |
|------|--------------------|------------------------|------------------|-------|
| `string` | `<Input>` | Text | `v.string()` | Default max: 200 |
| `text` | `<textarea>` | Truncated text | `v.string()` | Default max: 5000, not sortable |
| `boolean` | `<Switch>` | Yes/No indicator | `v.optional(v.boolean())` | |
| `number` | `<input type="number">` | Numeric value | `v.number()` | Default: 0 |
| `enum` | `<select>` | Dot badge | `zodToConvex(enumSchema)` | Requires `values` array |

### YAML Behaviors

| Behavior | What it adds |
|----------|-------------|
| `orderable: true` | `position` field, `reorder` mutation, drag-and-drop in ListView |
| `assignable: true` | `assigneeId` field, `assign` mutation with auth + not-found checks |
| `softDelete: true` | `deletedAt` field, `remove` mutation sets timestamp instead of deleting |
| `timestamps: both` | `createdAt` and `updatedAt` fields (this is the default) |

### Generator Commands

| Command | What it does |
|---------|-------------|
| `npm run gen:feature -- --name {name}` | Full feature: schema + backend + frontend + tests + route + translations |
| `npm run gen:schema -- --name {name}` | Zod schema only |
| `npm run gen:backend -- --name {name}` | Backend queries + mutations only |
| `npm run gen:frontend -- --name {name}` | Frontend components only |
| `npm run gen:route -- --name {name} --authRequired` | Route file only |
| `npm run gen:convex-function -- --domain {name} --type mutation --name {fnName}` | Single Convex function |

### Post-Generation Checklist

- [ ] Run `npx convex dev --once` to regenerate Convex types
- [ ] Add schema table to `convex/schema.ts` with correct fields, validators, and indexes
- [ ] Add nav entry to `src/shared/nav.ts`
- [ ] Add namespace to `ns` array in `src/i18n.ts`
- [ ] Add error constants to `src/shared/errors.ts`
- [ ] For enum fields: import Zod enum schemas with aliased names in `convex/schema.ts`
- [ ] Verify `src/routeTree.gen.ts` includes the new route (auto-generated by TanStack Router dev server)
- [ ] Run `npm run typecheck`
- [ ] Run `npm test`
- [ ] Run `npm run dev` and verify the feature works in the browser

### Generated Code Patterns

**Custom sections** -- generated files contain `@custom-start` / `@custom-end` comment blocks. Code inside these blocks is preserved when you re-run the generator. Code outside (between `@generated-start` / `@generated-end`) gets overwritten.

```typescript
// @generated-start imports
import { mutation } from "@cvx/_generated/server";
// @generated-end imports

// @custom-start imports
import { myCustomHelper } from "./helpers";  // This survives re-generation
// @custom-end imports
```

**Resolved spec** -- after generation, a `{name}.resolved.yaml` file is written next to the `feather.yaml`. This shows the final merged config (your spec + defaults from `templates/defaults.yaml`). Useful for debugging why certain features were or weren't generated.

### Defaults Reference

The file `templates/defaults.yaml` defines fallback values for every field and behavior. Your `feather.yaml` only needs to specify what differs from the defaults. Key defaults:

| Setting | Default |
|---------|---------|
| `field.type` | `string` |
| `field.required` | `false` |
| `field.max` | 200 (string), 5000 (text) |
| `field.filterable` | `false` |
| `field.sortable` | `true` (except `text`) |
| `timestamps` | `both` |
| `behaviors.orderable` | `false` |
| `behaviors.assignable` | `false` |
| `views.default.enabledViews` | `[list, card, table]` |
| `i18n.languages` | `[en, es]` |
