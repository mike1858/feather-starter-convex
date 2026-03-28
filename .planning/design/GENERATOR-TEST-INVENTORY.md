# Generator Stress Test: Product Inventory

**Date:** 2026-03-28
**Tested by:** Claude agent (stress-test session)
**Worktree:** agent-a9fd3dd6 (isolated, no commits)

---

## What I Built

A Product Inventory System with three entities:
- **Products** — name, SKU, description, price, category, stock_quantity, reorder_level, status (active/discontinued)
- **Categories** — name, description, parent_category (self-referential nesting)
- **Stock Movements** — product_id, quantity_change, type (received/sold/adjusted/returned), notes, timestamp

Plus three beyond-CRUD features:
- Product list with filtering by category and status
- Low stock alert view (products where stock_quantity <= reorder_level)
- Stock movement history per product
- Total stock value (price × stock_quantity, aggregated)

---

## Generator Usage

### Note on YAML Definitions

The task specification assumed a `generators/utils/yaml-resolver.js` and YAML-based entity definitions. **These do not exist in the current codebase.** The generators are pure Plop.js with Handlebars templates — no YAML input layer at all. You provide a name, get a scaffold. There is no way to declare fields, relationships, indexes, or constraints via any config format.

This absence is itself a key finding.

### How the Generators Actually Work

The feature generator accepts one input: a `name` (kebab-case). From that single string, it derives:
- `pascalCase name` → component/class names
- The name as-is → file paths and i18n keys

There is no field definition, no relationship declaration, no schema configuration. Every generated file is a TODO-filled placeholder.

### Commands Run

```bash
# Feature scaffolds (all succeeded)
echo "products" | npx plop feature
echo "categories" | npx plop feature
echo "stock-movements" | npx plop feature

# Routes (auth-guarded)
npx plop route -- --name=products --authRequired=true
npx plop route -- --name=categories --authRequired=true
npx plop route -- --name=stock-movements --authRequired=true

# Forms (two-argument — stdin piping fails due to ERR_USE_AFTER_CLOSE bug)
npx plop form -- --name=create-product --feature=products
npx plop form -- --name=record-stock-movement --feature=stock-movements
npx plop form -- --name=create-category --feature=categories

# Convex function (action — creates new file type, skipped when file exists)
npx plop convex-function -- --domain=products --type=action --name=processReorder
```

### What the Generator Produced

**For each of the three entities (products, categories, stock-movements), the feature generator created:**

```
src/features/{name}/
  components/{PascalName}Page.tsx    # Placeholder page with i18n title/description
  hooks/use{PascalName}.ts           # Hook with commented-out useQuery example
  index.ts                           # Barrel export
  {name}.test.tsx                    # Single smoke test: "renders page"
  README.md                          # Template describing file locations

convex/{name}/
  queries.ts                         # list() query returning []
  mutations.ts                       # create() mutation with TODO args
```

**The route generator added:**

```
src/routes/_app/_auth/
  products.tsx
  categories.tsx
  stock-movements.tsx
```

**The form generator added:**

```
src/shared/schemas/
  create-product.ts                  # Empty z.object({}) with TODOs
  record-stock-movement.ts           # Empty z.object({}) with TODOs
  create-category.ts                 # Empty z.object({}) with TODOs

src/features/products/components/CreateProductForm.tsx
src/features/stock-movements/components/RecordStockMovementForm.tsx
src/features/categories/components/CreateCategoryForm.tsx
```

**The convex-function generator added (when type = action, new file):**

```
convex/products/actions.ts           # Single action function with TODO body
```

**Total files generated: 25**

---

## Errors and Issues During Generation

### Issue 1: ERR_USE_AFTER_CLOSE on multi-prompt generators

When piping stdin to generators with more than one prompt (route generator asks name + authRequired; form generator asks name + feature), the second prompt causes Node.js readline to crash:

```
Error [ERR_USE_AFTER_CLOSE]: readline was closed
    at Interface.pause (node:internal/readline/interface:564:13)
```

**Workaround discovered:** Pass extra arguments as `-- --key=value` flags after the generator name. This bypasses the interactive prompts entirely:

```bash
npx plop route -- --name=products --authRequired=true   # works
npx plop form -- --name=create-product --feature=products  # works
```

This is not documented anywhere. The crash only happens in non-TTY environments (CI, scripted runs, this agent context). Interactive terminal use is unaffected.

### Issue 2: convex-function generator silently skips existing files

The `convex-function` generator uses `skipIfExists: true`. When you run it for a domain that already has `queries.ts` or `mutations.ts` (which the feature generator already created), it silently prints `[SKIPPED]` and adds nothing:

```
✔  ++ [SKIPPED] /convex/products/queries.ts (exists)
```

This means the `convex-function` generator is **only useful for creating an `actions.ts` file** after initial feature scaffolding, or for domains that were created without the feature generator. It cannot be used to add new named functions to existing files.

### Issue 3: Generated route template uses wrong pattern

The generated route files use a `beforeLoad` pattern with `context.user`:

```typescript
export const Route = createFileRoute("/_app/_auth/products")({
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: ProductsPage,
});
```

But the router context only has `queryClient` — not `user`. The actual pattern used in the codebase is: auth is handled by the `/_app/_auth.tsx` layout route via `useConvexAuth`, not in `beforeLoad`. The generated template produces **TypeScript type errors**:

```
error TS2339: Property 'user' does not exist on type '{ queryClient: QueryClient; }'
```

Additionally, all three generated routes use route paths like `"/_app/_auth/products"` — top-level auth routes that don't exist in the router tree (no corresponding `_app/_auth/products.tsx` under the `dashboard/_layout/`). Real feature routes are nested under `/_app/_auth/dashboard/_layout/`. The generator doesn't know this project's routing convention.

### Issue 4: Generated mutations template imports unused `v`

Every generated `mutations.ts` and `actions.ts` has `import { v } from "convex/values"` even though no args are defined. The TypeScript `noUnusedLocals` setting flags these as errors:

```
error TS6133: 'v' is declared but its value is never read.
```

Same applies to hooks (`useQuery`, `convexQuery`, `api`) and form components (`Input`).

**The generated code does not compile cleanly out of the box.** It has 27 TypeScript errors across the three entities.

### Issue 5: Convex table name with hyphen

In the generated mutations template, the commented-out example uses:

```typescript
// return await ctx.db.insert("stock-movements", { ...args, userId });
```

Convex table names cannot contain hyphens — they must be valid identifiers. If a developer follows the comment literally, they'd get a Convex schema error. The table would need to be named `stockMovements` or `stock_movements`.

---

## Beyond-CRUD Challenges

### Self-Referential Relationships (Category Nesting)

**Could the generator handle `parent_category -> categories`?**

No. The generator has no concept of relationships at all. To implement nested categories, you need to manually:

1. Define the Zod schema with an optional `parentId`:
   ```typescript
   export const createCategoryInput = z.object({
     name: z.string().min(1).max(100),
     description: z.optional(z.string()),
     parentId: z.optional(z.string()), // v.id("categories") in Convex
   });
   ```

2. Add the table to `convex/schema.ts` with a self-referential index:
   ```typescript
   categories: defineTable({
     name: v.string(),
     description: v.optional(v.string()),
     parentId: v.optional(v.id("categories")),
   }).index("by_parent", ["parentId"]),
   ```

3. Write recursive or tree-building query logic manually:
   ```typescript
   // Build a tree — no generator support for this
   export const listTree = query({...});
   ```

4. Handle the UI tree rendering (expandable nodes, indentation).

The generator produces a flat stub. Everything hierarchical is manual.

**Percentage of this that was generated:** The file structure (~5%). All business logic: 0%.

### Side Effects (Stock Movement → Update Product Quantity)

**How should the quantity adjustment trigger be implemented?**

This is the most architecturally complex requirement. When a stock movement is recorded, the product's `stock_quantity` must be updated atomically. There are two valid patterns in Convex:

**Pattern A — Single mutation that does both writes:**
```typescript
// In convex/stock-movements/mutations.ts
export const record = zMutation({
  args: recordStockMovementInput,
  handler: async (ctx, args) => {
    // 1. Insert the movement record
    await ctx.db.insert("stockMovements", { ... });

    // 2. Update product stock quantity in the same transaction
    const product = await ctx.db.get(args.productId);
    await ctx.db.patch(args.productId, {
      stockQuantity: product.stockQuantity + args.quantityChange,
    });
  },
});
```

**Pattern B — Internal mutation called from a mutation (Convex doesn't support this):** Convex mutations cannot call other mutations. There's no equivalent of database triggers. If you want a "reaction" pattern, you must either do it in a single mutation or use an action that calls two internal mutations.

**What the generator gave me:** `create()` with empty args. Zero of this pattern was scaffolded.

**The generator has no concept of:**
- Cross-entity writes in a single transaction
- Side effects or derived state updates
- Convex's transaction model (no triggers, no `afterInsert`)

Everything requiring cross-entity coordination is fully manual.

### Computed Views (Low Stock Alert)

**Filtered view based on `stock_quantity <= reorder_level`**

This requires a Convex query with a filter. The generator gave me `list()` returning `[]`. The actual implementation:

```typescript
export const getLowStock = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const products = await ctx.db.query("products").collect();
    return products.filter(p => p.stockQuantity <= p.reorderLevel);
  },
});
```

This could theoretically be declared if the generator supported a `filter` field in a YAML spec:
```yaml
queries:
  - name: getLowStock
    filter: "stockQuantity <= reorderLevel"
```

But no such capability exists. **100% manual.**

Note: A proper implementation would add an index on `stockQuantity` for performance, or use a precomputed boolean field `isLowStock` that gets updated on every stock movement. Neither is something a generator could infer from "I want low-stock products."

### Aggregations (Total Stock Value)

**Cross-entity computation: `price × stock_quantity`, summed across all products**

Two valid implementation approaches:

**Option 1 — Computed in query (no denormalization):**
```typescript
export const getTotalStockValue = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    return products.reduce((sum, p) => sum + (p.price * p.stockQuantity), 0);
  },
});
```

**Option 2 — Precomputed field updated on each stock movement:**
Add a `totalValue` to an inventory summary table, updated whenever stock changes.

The generator has no awareness that `price` and `stock_quantity` would need to be multiplied together, or that aggregation is even a concept. **100% manual.**

---

## Manual Work Required

### What the Generator Couldn't Handle

**1. The Zod schema (`src/shared/schemas/{entity}.ts`):**
CLAUDE.md explicitly states: "Generators scaffold steps 4-6 but NOT the Zod schema, schema table, or wiring." The form generator creates a schema file, but with an empty `z.object({})` — all field definitions are manual.

**2. The `convex/schema.ts` table definition:**
You must open `schema.ts` and manually add each `defineTable()` with correct Convex validators. The generator never touches this file.

**3. i18n translation files:**
The page component uses `useTranslation("products")` but no `public/locales/en/products.json` or `public/locales/es/products.json` is created. The generator doesn't create them. You must create them manually AND add the namespace to the `ns` array in `src/i18n.ts`.

**4. Nav entry:**
`src/shared/nav.ts` is never touched. You must append the nav item manually.

**5. Error constants:**
`src/shared/errors.ts` gets no new group. Manual addition required.

**6. Barrel export in `src/shared/schemas/index.ts`:**
The generated schema files are not exported from the barrel. Manual addition required.

**7. The actual field definitions in every file:**
Every generated file has only TODOs where the real logic goes:
- Schema fields in Zod schemas
- Table columns and indexes in `convex/schema.ts`
- `args` in mutations/queries
- `handler` logic in all backend functions
- Form fields in form components
- Hook implementation in hooks
- UI content in page components

**8. Cross-entity relationships:**
Any foreign key reference (e.g., `productId: v.id("products")` in stock movements) is completely manual.

**9. The correct route pattern:**
The generated route uses wrong context access pattern. Must be replaced with the correct Convex auth pattern.

### Percentage Breakdown

To build a fully functional inventory feature with real CRUD operations for products (not the beyond-CRUD features):

| Category | Estimate | Notes |
|----------|----------|-------|
| **Generated (correct, usable)** | ~15% | File structure, imports, component shell, barrel exports, route file, form shell |
| **Declarable (could be generated with better YAML)** | ~55% | Schema fields, table definition, mutation args, query filters, i18n files, nav entry, error constants, test setup |
| **Truly Custom (behavioral logic)** | ~30% | Cross-entity side effects, computed views, tree rendering, status transitions, business rules |

The key insight: what's in the "declarable" bucket is the frustrating gap. It's mechanical, repetitive, rule-based work — exactly what generators should handle — but there's no mechanism to declare it.

---

## Specific Gaps

### Missing Generator Capabilities

**1. No field declaration.**
The single biggest gap. There is no way to tell the generator "this entity has name (string), price (number), status (enum: active/discontinued)." You always get an empty placeholder.

**2. No schema.ts integration.**
The generator never touches `convex/schema.ts`. Adding a new entity requires a separate manual step with a completely different syntax (Convex validators vs. Zod). The `zodToConvex()` pattern from CLAUDE.md makes this easier but the generator should scaffold it.

**3. No i18n file creation.**
The page component hardcodes a fallback `"Products"` string but no translation files are created. A new feature silently breaks i18n in production if the JSON files aren't created.

**4. No wiring of extension points.**
The framework has three append-only extension points (`nav.ts`, `errors.ts`, `i18n.ts`), but the generator never touches them. Every new feature requires manual edits to all three.

**5. convex-function generator can't append to existing files.**
The generator uses `skipIfExists: true`, so it's only useful for creating `actions.ts` (the one file the feature generator doesn't create). It cannot add a second query or mutation to an existing file. The feature generator only stubs one `list` query and one `create` mutation.

**6. No test scaffolding for backend.**
The feature generator creates a frontend test (`{name}.test.tsx`) but no backend test files (`convex/{name}/queries.test.ts`, `convex/{name}/mutations.test.ts`). The project requires 100% test coverage. Every generated backend file immediately fails coverage thresholds.

**7. Route template uses wrong auth pattern.**
The generated route uses `context.user` which doesn't exist in the router context. The real auth pattern is handled by the `/_app/_auth.tsx` layout. Additionally, the route path `/_app/_auth/products` is wrong — real feature routes are nested under `dashboard/_layout/`.

**8. No relationship declaration.**
There is no way to express "stock-movements has a productId that references products." Foreign key relationships require fully manual schema work.

### Pain Points

**The "valley of frustration" between scaffold and working code is wide.**
After running the generator, you have 7 files with clean structure but zero functionality. None of them compile without warnings. None of them actually fetch or write data. The scaffold feels like it's supposed to help, but the bulk of the work is still ahead of you.

**The wiring checklist is not enforced.**
CLAUDE.md documents 7 steps to add a new entity. The generator handles steps 4-6 (partially). Steps 1, 2, 3, and 7 are manual — but the generator completes silently without reminding you. A developer who only runs `gen:feature` will have a broken app (missing i18n files, missing nav entry, missing schema table).

**The convex-function generator's `skipIfExists` design means it can only be used once.**
If you want to add a second query to an existing domain, you'd expect to run `gen:convex-function`. Instead, it silently does nothing. The only way to add more functions is to manually edit the existing file — which is fine, but the generator creates a false impression of being able to add functions incrementally.

**Form generator produces commented-out fields.**
The form template has the entire form field pattern commented out. You uncomment the commented example and replace the placeholder names. This "comment gymnastics" workflow is awkward compared to an approach where you either have real working code or clearly no code at all.

**stdin piping crashes with readline ERR_USE_AFTER_CLOSE.**
Multi-prompt generators (route, form) crash when stdin is not a TTY. This breaks any scripted workflow, CI-driven generation, or agent-based code generation. The `-- --key=value` workaround isn't documented.

### Positive Surprises

**The file structure is correct and consistent.**
Even though the content is all TODOs, the scaffolded structure perfectly matches the project conventions. File locations, import paths, component naming, barrel export pattern — all correct. This alone saves maybe 10-15 minutes of "where does this go?" per entity.

**The naming transformations work well.**
`stock-movements` → `StockMovements` (PascalCase), `useStockMovements` (camelCase), `StockMovementsPage`, `"stock-movements"` (i18n namespace). The Handlebars helpers handle hyphenated names correctly.

**The form generator pairs schema + component together.**
Running one command (`gen:form`) creates both the Zod schema file and the form component that imports it. The import path is pre-wired correctly. This is a small but genuine time-saver.

**The hook template pre-wires the correct import pattern.**
The generated hook already imports from `~/convex/_generated/api` with the right alias and shows exactly how `convexQuery` would be used. Uncommenting and filling in the entity name is genuinely fast.

**Backend mutation template shows the Zod path.**
The mutations template comment says "Use Zod validation via zCustomMutation for complex inputs." It doesn't implement it, but the pointer is there. Contrast: tasks.ts in the real codebase shows the full implementation.

---

## Recommendations for DX Architecture

These recommendations feed directly into the existing design work in `FEATHER-DX-ARCHITECTURE.md`.

### 1. Add a `feather.yaml` field declaration layer

The single highest-value addition to the generator system. A minimal schema:

```yaml
# feather.yaml or specs/inventory.yaml
feature: products
fields:
  - name: name
    type: string
    required: true
    max: 200
  - name: sku
    type: string
    required: true
    unique: true
  - name: price
    type: number
    min: 0
  - name: status
    type: enum
    values: [active, discontinued]
    default: active
  - name: stockQuantity
    type: number
    default: 0
  - name: reorderLevel
    type: number
    default: 5
  - name: categoryId
    type: ref
    to: categories
    required: false
indexes:
  - [status]
  - [categoryId]
```

From this, a generator could produce: Zod schema with correct validators, Convex `defineTable()` with correct types and indexes, typed mutation args, list query with reasonable defaults, translation keys for all fields.

This is what the YAML layer referenced in the task spec *should* exist. It doesn't yet.

### 2. Auto-wire the extension points

The generator should modify `src/shared/nav.ts`, `src/shared/errors.ts`, and `src/i18n.ts` as part of the feature scaffold. These are append-only arrays — plop's `append` action handles this exactly. Example:

```javascript
{
  type: "append",
  path: "src/i18n.ts",
  pattern: /const ns = \[/,
  template: `  "{{name}}",`,
}
```

A developer should never have to remember the 7-step checklist.

### 3. Generate backend tests alongside backend code

The feature generator produces `{name}.test.tsx` for the frontend but nothing for `convex/{name}/`. Given 100% coverage is required, every new feature immediately fails pre-commit hooks. Add:

```
convex/{name}/queries.test.ts    # Smoke test: list() returns []
convex/{name}/mutations.test.ts  # Smoke test: create() with auth guard
```

### 4. Fix the route template

The current route template is wrong for this codebase. Auth is handled by the `_auth.tsx` layout route. The correct template:

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { {{pascalCase name}}Page } from "@/features/{{name}}";

export const Route = createFileRoute("/_app/_auth/dashboard/_layout/{{name}}")({
  component: {{pascalCase name}}Page,
  beforeLoad: () => ({
    headerTitle: "{{pascalCase name}}",
  }),
});
```

Or better: make the route path structure configurable (top-level vs. nested under dashboard layout).

### 5. Fix the mutations template: don't import unused `v`

Two options:
- Remove the import and add it only in the commented example
- Import it conditionally via a prompt: "Does this mutation take arguments?"

The current approach produces type errors on every new entity.

### 6. Create i18n files as part of `gen:feature`

Add plop `add` actions for `public/locales/en/{{name}}.json` and `public/locales/es/{{name}}.json` with minimal structure:

```json
{
  "nav": {
    "{{camelCase name}}": "{{pascalCase name}}"
  },
  "page": {
    "title": "{{pascalCase name}}",
    "description": "Manage your {{name}}."
  }
}
```

### 7. The `convex-function` generator needs an `append` mode

Add an action type that appends a new named function to an existing file, rather than silently skipping. This unlocks incremental function addition to an existing domain.

### 8. Document the `-- --key=value` bypass in README

The stdin piping bug affects every scripted or agent-driven workflow. The `-- --key=value` workaround works and should be documented.

### 9. Surface the "what's not generated" gap explicitly

The generator should emit a post-generation checklist:

```
✔  Generated 7 files for "products"

Next steps (manual):
  □ Add schema to convex/schema.ts
  □ Define Zod fields in src/shared/schemas/products.ts
  □ Add "products" to ns in src/i18n.ts
  □ Add nav entry to src/shared/nav.ts
  □ Create public/locales/en/products.json
  □ Add error constants to src/shared/errors.ts
```

This alone would prevent the "I ran the generator, why is my app broken?" experience.

---

*This document was produced by actually running the generators against the worktree and observing the output. All file paths, error messages, and generator outputs are real.*
