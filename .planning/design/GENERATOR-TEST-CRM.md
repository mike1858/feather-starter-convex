# Generator Stress Test: Simple CRM

**Date:** 2026-03-28
**Worktree:** agent-a10c22e4 (commit 87f197a, 80 commits behind main)
**Approach:** Generated contacts and deals using the main project's generators (plopfile.js + generators/feature.js) run against the main project, then documented the output.

---

## What I Built

A Simple CRM consisting of:
- **Contacts** — name, email, phone, company, notes, status (lead/prospect/customer/churned)
- **Deals** — title, value (dollars), stage (discovery/proposal/negotiation/closed_won/closed_lost), linked to a contact

Cross-entity features attempted:
- Pipeline view (deals grouped by stage with total value per stage)
- Contact-to-deals relationship (contact_id FK on deals)
- Activity log (auto-generated when deal stage changes)

---

## Generator Usage

### First Discovery: Worktree Version Gap

The first thing discovered was a version gap problem. This worktree is 80 commits behind `main`. The worktree's `plopfile.js` is the OLD generator (simple feature scaffolder, no YAML support). The main project has a completely redesigned YAML-driven generator system (`generators/feature.js`, `generators/schema.js`, `generators/backend.js`, `generators/frontend.js`).

Running `npm run gen:feature` from the worktree uses the OLD plopfile. Running the main project's plop binary with `--plopfile` pointing at the worktree's plopfile.js fails with the same old generator. The fix was to run the main project's plop binary with the main project's plopfile from the main project directory.

**Lesson: The worktree's package.json scripts are stale. The new generator system is only available from the main project root.**

### YAML Definitions Written

**contacts.gen.yaml:**
```yaml
name: contacts
label: Contact
labelPlural: Contacts

fields:
  name:
    type: string
    required: true
    max: 200
  email:
    type: string
    required: false
    max: 200
  phone:
    type: string
    required: false
    max: 50
  company:
    type: string
    required: false
    max: 200
  notes:
    type: text
    required: false
    max: 5000
  status:
    type: enum
    values: [lead, prospect, customer, churned]
    default: lead
    filterable: true
    transitions:
      lead: [prospect]
      prospect: [customer]
      customer: [churned]

timestamps: both

behaviors:
  softDelete: false
  auditTrail: false
  immutable: false
  assignable: false
  orderable: false

access:
  scope: owner

views:
  default:
    defaultView: list
    enabledViews: [list, card, table]
  table:
    columns:
      - field: name
      - field: company
      - field: email
      - field: status
  filteredViews:
    - name: leads
      label: Leads
      filter: { status: lead }
      navEntry: false
    - name: customers
      label: Customers
      filter: { status: customer }
      navEntry: false

indexes:
  - name: by_status
    fields: [status]
  - name: by_company
    fields: [company]
```

**deals.gen.yaml:**
```yaml
name: deals
label: Deal
labelPlural: Deals

fields:
  title:
    type: string
    required: true
    max: 200
  value:
    type: number
    required: false
  stage:
    type: enum
    values: [discovery, proposal, negotiation, closed_won, closed_lost]
    default: discovery
    filterable: true
    transitions:
      discovery: [proposal]
      proposal: [negotiation]
      negotiation: [closed_won, closed_lost]

timestamps: both

behaviors:
  softDelete: false
  auditTrail: false
  immutable: false
  assignable: false
  orderable: false

access:
  scope: owner

views:
  default:
    defaultView: list
    enabledViews: [list, table]

relationships:
  contact:
    type: belongs_to
    target: contacts
    required: false
    column: contactId

indexes:
  - name: by_stage
    fields: [stage]
  - name: by_contact
    fields: [contactId]
```

### What the Generator Produced

**For each feature, the generator created 25+ files:**

**Backend (convex/{name}/):**
- `mutations.ts` — create, update, remove, updateStatus (for enum with transitions)
- `queries.ts` — list, get, plus one query per filteredView
- `mutations.test.ts` — tests for create, update, remove, updateStatus
- `queries.test.ts` — tests for list, get, and each filteredView query

**Frontend (src/features/{name}/components/):**
- `{Name}Page.tsx` — main page component with view switching and filter logic
- `{Name}TitleBar.tsx` — header with title, count, view switcher
- `{Name}Item.tsx` — individual list item
- `{Name}Form.tsx` — inline + full create form
- `{Name}ListView.tsx` — list layout
- `{Name}CardView.tsx` — card grid layout (if card view enabled)
- `{Name}TableView.tsx` — full-featured table with sorting, pagination, row actions
- `{Name}DetailPage.tsx` — inline-editable detail view
- `{Name}StatusBadge.tsx` — clickable badge that advances enum status (if transitions exist)
- `{Name}ViewSwitcher.tsx` — tab UI for switching views (if multiple views)
- `{Name}FilterBar.tsx` — filter tabs combining filteredViews and enum values
- `{Name}EmptyState.tsx` — empty state component
- `{Name}LoadingSkeleton.tsx` — loading skeleton
- `{Name}Form.tsx` — inline + full form

**Supporting files:**
- `src/features/{name}/index.ts` — barrel export
- `src/features/{name}/{name}.test.tsx` — frontend component tests
- `src/features/{name}/{name}.resolved.yaml` — fully resolved config (excellent for debugging)
- `src/routes/_app/_auth/dashboard/_layout.{name}.tsx` — route file
- `src/shared/schemas/{name}.ts` — Zod schema with enums, validators, create/update input types
- `public/locales/en/{name}.json` — English translations
- `public/locales/es/{name}.json` — Spanish translations

**Auto-wired shared files:**
- `convex/schema.ts` — added table definition with indexes
- `src/shared/nav.ts` — added navigation entry
- `src/shared/errors.ts` — added error group (NOT_FOUND, INVALID_STATUS_TRANSITION)
- `src/i18n.ts` — added namespace to ns array

**Total: ~28 files created or modified per feature.**

---

## Errors and Issues During Generation

### Issue 1: Worktree Cannot Run the New Generator

**Severity: Blocking**

The worktree's `plopfile.js` and `package.json` are on an older commit. The new YAML-driven generator (`generators/feature.js`) does not exist in the worktree. This means any agent working in this worktree cannot use `npm run gen:feature` with YAML input.

Workaround: Use the main project's plop binary and plopfile from the main project's cwd.

This is a fundamental DX problem for worktree-based workflows. The generator infrastructure needs to be available wherever you're working.

### Issue 2: Duplicate Import in schema.ts

**Severity: TypeScript error (compile-time break)**

When two features use an enum field both named `status` (contacts and todos both had this), the wiring action `appendToSchema` generates a duplicate import:

```typescript
import { priority, status } from "../src/shared/schemas/todos";  // existing
import { status } from "../src/shared/schemas/contacts";           // generated — COLLISION
```

TypeScript will refuse to compile this. The fix is to use aliased imports:
```typescript
import { status as contactStatus } from "../src/shared/schemas/contacts";
```

The generator has no awareness that an import named `status` may already exist. It blindly appends the import block without checking for name collisions. This is a silent bug that only manifests when two features with same-named enums are added.

**This is a pre-existing issue in the wiring.js logic. The check on line 73 of wiring.js (`if (content.includes(`${name}: defineTable(`)`) correctly prevents double table generation, but there's no equivalent check for import name collisions.**

### Issue 3: Missing contactId Field in deals Schema (Relationship Mapping Bug)

**Severity: Runtime error**

The `deals.gen.yaml` specifies:
```yaml
relationships:
  contact:
    type: belongs_to
    target: contacts
    required: false
    column: contactId
```

The `resolveDefaults()` function in `yaml-resolver.js` correctly reads `belongs_to` relationships and auto-generates a `by_contactId` index. However, the `appendToSchema` wiring action in `wiring.js` only iterates over `fields` to build the table definition — it does NOT add the FK column (`contactId: v.optional(v.id("contacts"))`) to the table definition.

The generated schema has:
```typescript
deals: defineTable({
  title: v.string(),
  value: v.optional(v.number()),
  stage: zodToConvex(stage),
  userId: v.id("users"),
})
  .index("by_stage", ["stage"])
  .index("by_contact", ["contactId"])      // index references a field...
  .index("by_contactId", ["contactId"])    // ...that doesn't exist in the table!
```

Convex will reject this at deploy time: an index on `contactId` but no `contactId` field. The relationship FK column is silently dropped.

Also note: the `by_contact` index (explicitly declared in the YAML) and the auto-generated `by_contactId` index are duplicates of each other. The auto-index logic adds a `by_{column}` index from the relationship, but the user already specified one manually.

### Issue 4: Branching Transitions Not Supported

**Severity: Logic bug — wrong runtime behavior**

The deals `stage` enum has branching transitions:
```yaml
transitions:
  negotiation: [closed_won, closed_lost]
```

The generated `updateStage` mutation uses linear index comparison:
```typescript
if (newIndex !== currentIndex + 1) {
  throw new Error(ERRORS.deals.INVALID_STATUS_TRANSITION);
}
```

This means:
- `negotiation` → `closed_won` (index 3) would check: `3 !== 2 + 1` = `3 !== 3` = passes ✓
- `negotiation` → `closed_lost` (index 4) would check: `4 !== 2 + 1` = `4 !== 3` = **FAILS** — even though it's a valid transition

The `STAGE_VALUES` array order is `[discovery, proposal, negotiation, closed_won, closed_lost]`, so only `closed_won` is reachable from `negotiation`. `closed_lost` would be rejected.

The generator interprets the `transitions` map only to determine whether an enum has transitions (for generating `updateStatus`) and for generating the linear advance badge (StatusBadge only knows `nextStatus = transitions[currentStatus][0]`). The YAML correctly captures branching, but the template only uses `currentIndex + 1` logic.

**Fix needed:** The mutations template must generate a set-based transition check: check if `args.stage` is in `transitions[deals.stage]`.

### Issue 5: FilterBar Generates Duplicate Filters

**Severity: UI confusion (not a crash)**

For contacts, the FilterBar generates:
```typescript
const FILTERS = [
  { key: "all", labelKey: "filter.all" },
  { key: "leads", labelKey: "nav.leads" },        // filteredView named "leads"
  { key: "customers", labelKey: "nav.customers" }, // filteredView named "customers"
  { key: "status:lead", labelKey: "status.lead" },      // enum value filter
  { key: "status:prospect", labelKey: "status.prospect" },
  { key: "status:customer", labelKey: "status.customer" },
  { key: "status:churned", labelKey: "status.churned" },
];
```

This gives 7 filter tabs. The `leads` and `customers` filteredViews overlap semantically with `status:lead` and `status:customer`. A user sees "Leads" and "Lead" as separate tabs that do the same thing.

### Issue 6: filteredViews Filter Logic is Broken in ContactsPage

**Severity: Runtime bug — filtering doesn't work**

The `ContactsPage.tsx` filter logic for `filteredViews`:
```typescript
if (activeFilter === "leads") {
  return true;  // BUG: no actual filtering applied!
}
if (activeFilter === "customers") {
  return true;  // BUG: same
}
```

The template generates the filter block but the variable name in the template is `filters` (with an `s`), while the YAML uses `filter`. Looking at `page.tsx.hbs` lines 48-50:
```handlebars
{{#each this.filter}}
if (item.{{@key}} !== {{json this}}) return false;
{{/each}}
```

The template iterates `this.filter` (singular) but the resolved config uses `filteredViews[n].filter` as the key. The code block runs but evaluates to an empty object, so no conditions are emitted. The result is a filter that always returns `true` — showing all items regardless of which filteredView is active.

### Issue 7: index.ts Exports Non-Existent Page Components

**Severity: TypeScript error**

The generated `src/features/contacts/index.ts` exports:
```typescript
export { ContactsLeadsPage } from "./components/ContactsLeadsPage";
export { ContactsCustomersPage } from "./components/ContactsCustomersPage";
```

Neither `ContactsLeadsPage.tsx` nor `ContactsCustomersPage.tsx` were generated. These exports reference files that don't exist. The generator creates barrel exports for filteredViews as if separate page components exist for each, but no such components are generated.

### Issue 8: Form Imports Non-Existent Schema Export

**Severity: TypeScript error**

Generated `ContactsForm.tsx`:
```typescript
import { contactsSchema } from "@/shared/schemas/contacts";
```

The generated `src/shared/schemas/contacts.ts` exports `createContactsInput`, `updateContactsInput`, `STATUS_VALUES`, `status`, etc. — but NOT `contactsSchema`. This import will fail at compile time.

### Issue 9: Test Fixtures Use Wrong Field Name (creatorId vs userId)

**Severity: Test runtime error**

The generated `mutations.test.ts` seeds test data with:
```typescript
await ctx.db.insert("contacts", {
  name: "Seed",
  status: "lead",
  creatorId: userId,  // Wrong field name
});
```

The schema definition uses `userId` (auto-generated by the wiring action). The `creatorId` field doesn't exist in the contacts table. This test seed would fail with a Convex schema validation error.

The mutations template uses `userId` in the actual mutation handler (`await ctx.db.insert("contacts", { ..., userId })`), but the test template generates `creatorId` for seeding — an inconsistency.

---

## Cross-Entity Challenges

### Relationships

**Contact-to-Deals Linking:**

The YAML `relationships` block is partially supported:
- Index generation: WORKS — the resolver adds `by_{column}` indexes
- Schema FK column: NOT SUPPORTED — the wiring action doesn't add the FK field to the table definition
- Frontend: NOT SUPPORTED — no form fields, no display, no linked query

To properly wire a belongs_to relationship, you need:
1. `contactId: v.optional(v.id("contacts"))` in deals schema — must be added manually
2. A contact selector in the DealsForm — must be added manually
3. A `listByContact` query in deals/queries.ts — must be added manually
4. Contact name display in DealsItem/DealsTableView — must be added manually
5. A "Deals" section in ContactsDetailPage sidebar — must be added manually

The generator handles relationships structurally (indexes) but not semantically (UI, queries, or schema fields).

### Pipeline View

The pipeline view (deals grouped by stage with total value per stage) is entirely outside generator scope.

The generator knows about:
- `filteredViews` — generates separate queries and filter tabs per view
- `views.default.enabledViews` — controls which view components are generated (list, card, table)

A "pipeline" view would be a grouped board view (like Kanban) where columns are enum values. The generator has no `kanban` or `pipeline` view type. The closest option is the table view with the stage filter tabs, which gives a filtered list per stage — but not a side-by-side pipeline board.

**What would be needed:** A new view type declaration in the YAML (e.g., `pipeline` or `board`) that generates a grouped layout component. This doesn't exist.

For the CRM, the pipeline view required:
1. A new `DealsPipelineView.tsx` component written from scratch
2. A `listAllByStage` query in deals/queries.ts written manually (groups all deals by stage)
3. Adding `pipeline` to `enabledViews` and wiring it into `DealsPage.tsx` manually (since the view type isn't known to the templates)

**Estimated manual work: 60-80 lines for pipeline component + 15 lines for query.**

### Activity Log (Auto-Generated on Stage Change)

The activity log pattern (like the existing tasks feature) involves:
1. Calling `logActivity()` inside the `updateStage` mutation's `// @custom-start updateStatus-post` block
2. Extending the activity log's `entityType` enum to include `"deal"`
3. Writing a `listByContact` query in activity-logs/queries.ts

The generator has a `// @custom-start` / `// @custom-end` marker system for exactly this purpose. This is the correct extension point.

**However:**
- The `activity-logs` feature's `entityType` enum (`["task", "project", "subtask"]`) is hardcoded in `convex/schema.ts` — adding `"deal"` requires manually editing both the schema and the `src/shared/schemas/activity-logs.ts` Zod schema.
- The `logActivity()` helper in `convex/activity-logs/helpers.ts` has hardcoded `EntityType = "task" | "project" | "subtask"` — must be extended manually.
- There's no YAML-level mechanism to declare "this entity participates in the activity log system."

**Full activity log wiring for deals requires 4 manual file edits, none of which the generator can help with.**

---

## Manual Work Required

### What the Generator Couldn't Handle

1. **Relationship FK field in schema** — `contactId: v.optional(v.id("contacts"))` must be added manually to the deals table in `convex/schema.ts`.

2. **Relationship-aware form field** — The DealsForm needs a contact selector (dropdown fetching contacts list). Must be added manually in `// @custom-start form`.

3. **Contact-filtered deal query** — `listByContact` query that takes a `contactId` parameter. Must be added manually.

4. **ContactDetailPage sidebar with deals** — The contact detail view needs a "Deals" section showing deals linked to this contact. Must be added manually in `// @custom-start detail-sidebar`.

5. **Pipeline/Board view** — No `pipeline` view type exists. Kanban-style grouped view must be written from scratch.

6. **Activity log participation** — Extending the activity log system to include `deal` entity type and wiring `logActivity()` calls into `updateStage`. 4 manual edits across existing files.

7. **Branching transition logic** — The `updateStage` mutation uses `currentIndex + 1` which breaks for `negotiation → closed_lost`. Must be replaced with set-based lookup.

8. **Schema duplicate import fix** — The `status` import collision in `convex/schema.ts` must be resolved with aliasing.

9. **Missing contactId field** — Must be added to the deals schema definition (schema.ts wiring bug).

10. **filteredViews filter bug** — The ContactsPage filter logic for named views always returns `true`. Must be fixed.

11. **Non-existent barrel exports** — `ContactsLeadsPage` and `ContactsCustomersPage` exports in index.ts must be removed.

12. **Non-existent schema import** — `contactsSchema` import in ContactsForm.tsx must be replaced with the correct export names.

13. **Test fixture field name** — `creatorId` must be changed to `userId` in test seeds.

### Percentage Breakdown

Looking at what a "production-ready contacts + deals CRM" would require:

| Category | Files | Work |
|----------|-------|------|
| **Generated, works correctly** | Schema, mutations (CRUD), queries (list/get/filteredViews), all frontend view components (list/card/table/detail), status badge, filter bar, empty state, loading skeleton, form (basic), route, locales, nav wiring, errors wiring, i18n wiring, tests (basic) | ~75% of total file content |
| **Generated but broken (bugs)** | ContactsPage filter logic, index.ts exports, ContactsForm import, test fixtures, schema import collision, branching transition logic | ~10% of total — generated but must be fixed |
| **Declarable (could work with YAML enhancement)** | Relationship FK column in schema, belongs_to form field selector, related items query | ~5% of total |
| **Truly Custom** | Pipeline view, activity log participation, contact-to-deals sidebar, complex relationship UI | ~10% of total |

**Summary:**
- Generated correctly: ~75%
- Generated but buggy: ~10%
- Declarable with better generator: ~5%
- Truly custom: ~10%

---

## Specific Gaps

### Missing Generator Capabilities

**1. Relationship FK Column in Schema Wiring**

The YAML has full relationship metadata (`belongs_to`, `column: contactId`, `target: contacts`). The wiring.js action that generates the schema table definition (lines 120-155 of wiring.js) only iterates over `fields` — it never looks at `relationships`. This is a straightforward fix: iterate relationships, add `{column}: v.optional(v.id("{target}"))` for each `belongs_to`.

**2. Branching Transition Validation**

The transitions map in YAML supports branching (`[closed_won, closed_lost]`) but the mutations template only generates linear `currentIndex + 1` logic. The template needs a `{{#hasbranchingTransitions}}` helper or the logic needs to generate set-based validation:
```typescript
const validNextStates = STAGE_TRANSITIONS[deals.stage] ?? [];
if (!validNextStates.includes(args.stage)) {
  throw new Error(ERRORS.deals.INVALID_STATUS_TRANSITION);
}
```
The `transitions` map is fully available in the resolved config. This is a template fix.

**3. Board/Pipeline View Type**

No `pipeline` or `board` view type exists. The `enabledViews` array accepts `list`, `card`, and `table`. A `board` view would group items by an enum field and display them in columns. The YAML already has `groupBy` in the table view config (`views.table.groupBy`) but it's unused. This capability exists in the schema but no template supports it.

**4. Related Items Query Generation**

When a `belongs_to` relationship is declared, the parent entity (`contacts`) should get a generated query like `listDealsForContact(contactId: Id<"contacts">)`. The generator currently only generates `list` and `get` queries plus filteredView queries. Cross-entity queries are entirely absent.

**5. FilterBar Deduplication**

The filter bar generates both `filteredViews` named filters AND `enum:value` field filters separately. They should be unified or the user should choose one. A `filteredViews` entry that filters on `status: lead` should suppress the auto-generated `status:lead` tab.

**6. Import Name Collision Detection**

The schema wiring action should check for name collisions before inserting imports. The check should look for existing variable names with the same identifier, not just whether the table already exists.

### Multi-Entity Feature Challenges

**Problem 1: No Cross-Entity Query Generation**

A CRM fundamentally requires queries that span entities: "get all deals for this contact," "get activity log for this contact's deals." The generator treats each YAML as a self-contained island. There's no mechanism to declare "when listing contacts, join with deal count" or "when listing deals, include contact name."

This shows up immediately in the UI: `DealsTableView` shows `contactId` (a UUID) instead of a contact name because there's no join logic.

**Problem 2: Shared Enum Type Naming**

Both contacts and deals have their primary status field just named `status` / `stage`. But contacts also calls its Zod enum `status` (lowercase), and the schema import ends up as just `status` — a generic name that collides with other features' `status` exports. Every feature should prefix its enum variable names (e.g., `contactStatus`, `dealStage`) to avoid collisions.

**Problem 3: Form Doesn't Know About Foreign Keys**

The deals form only renders fields declared in `fields:` — it has no awareness of `relationships`. A "create deal" form in a real CRM needs a "select contact" dropdown. The generator would need to generate a query call plus a Select component for belongs_to fields.

**Problem 4: Status Transition "Terminals" vs "Branches"**

The generator conflates "terminal state" (no outgoing transitions) with "all transitions end here." The `StatusBadge` uses `STATUS_TRANSITIONS[status] ?? null` and if `null`, disables the badge. For deals, both `closed_won` and `closed_lost` are terminals. This works. But `negotiation` has two valid transitions — the badge only shows `closed_won` (index+1) and you can never transition to `closed_lost` through the UI.

**Problem 5: Activity Log System is Closed**

The activity log is hardcoded to know about `task | project | subtask` entity types. It's implemented as a TypeScript union type in `helpers.ts`, not as a Convex table schema-driven configuration. Adding a new participating entity requires editing the enum in multiple places. A YAML-declared `auditTrail: true` behavior does exist in the FeatureConfig type but it does nothing — the template generates `// TODO` comments instead of wiring activity log calls.

### Pain Points

**1. Generator Only Runs from Main Project Root**

Running `npm run gen:feature` from a worktree that's behind main gives you the old generator without YAML support. The generator infrastructure (plopfile.js, generators/, templates/) is versioned alongside the application code, which means worktrees on older commits have older generators. The generator should be packaged separately or invoked via an absolute path.

**2. YAML Path Must Be Relative to CWD, Not to Feature Folder**

To generate contacts, you must run: `plop feature` → answer `contacts.gen.yaml` (from main project root). If you put the YAML in `src/features/contacts/contacts.gen.yaml` first (which is the natural location), you'd answer `src/features/contacts/contacts.gen.yaml`. This is fine but not obvious. The prompt message says "Path to feature YAML" but doesn't clarify relative to what.

**3. The Resolved YAML is Excellent for Debugging**

`{name}.resolved.yaml` is written to `src/features/{name}/` after generation. This shows exactly what defaults were applied and what the final config looks like. This is genuinely good DX — you can see why the generator made certain decisions.

**4. Blank Lines in Form Output**

The form template generates clusters of blank lines when some field types don't match their conditionals. For example, a `string` field renders the `string` block but leaves 4 blank lines where `text`, `boolean`, `number`, `enum` blocks would have been. The output compiles fine but looks messy and would fail a linter.

**5. Table View Column Type is Always "string" Even for Enums**

The YAML specifies `views.table.columns: [{ field: name }, { field: company }, { field: email }, { field: status }]`. The generated table view code hardcodes column types:
```typescript
const columns = [
  { field: "name", label: "name", type: "string", sortable: false, width: "auto" },
  { field: "status", label: "status", type: "string", ... },  // should be "enum"
```

The column type for `status` should be `"enum"` (to render as a `ContactsStatusBadge`), but the template generates `"string"` for all columns from the `views.table.columns` YAML config. The template doesn't cross-reference `fields[column.field].type` when generating column definitions. This means the status column renders as plain text in the table, not as the interactive badge.

### Positive Surprises

**1. The Volume of Correct Output is Impressive**

One command generates 28 files. The table view is a real, full-featured component with sorting, pagination, column widths, hover actions, and loading/empty states. The status badge is clickable and wired to the correct mutation. The form covers all field types with correct UI primitives (textarea for `text`, Select for `enum`, Switch for `boolean`, number input for `number`). The locales file is complete with all translation keys used anywhere in the generated code.

**2. Custom Hook Points Are Well-Placed**

Every generated file has `// @custom-start` / `// @custom-end` comment markers in all the right places: before/after create, before/after update, form additions, detail sidebar, page-level state, etc. You can safely add custom code without touching generated sections, and re-running the generator won't overwrite custom blocks (the `smartAdd` action checks if the file already exists).

**3. Auto-Wiring Works Cleanly**

Schema, nav, errors, and i18n are all updated correctly in a single run. The diff summary output (green `+` lines) makes it easy to see exactly what changed. The idempotency check prevents double-wiring on re-runs. This is one of the strongest parts of the system.

**4. The Resolved YAML + Re-Generation Pattern**

The resolved YAML makes it easy to re-run the generator after adjustments. If you want to change the views config, edit the `.gen.yaml`, delete the generated files, and re-run. The `smartAdd` action would recreate them with the updated config. This is a clean regeneration story.

**5. Tests Are Real, Not Stubs**

The generated backend tests actually exercise mutations and queries against an in-memory Convex instance. They test auth gating (unauthenticated cases), transitions (invalid transition rejection), and CRUD. These aren't empty placeholder tests — they have real assertions that would catch real bugs.

---

## Recommendations for DX Architecture

### 1. Fix the Relationship Gap — It Breaks the Core Promise

The `relationships` block in the YAML is the most important gap. A CRM is fundamentally a multi-entity system. The generator declares relationships but doesn't implement them anywhere except index generation. This leaves a broken state: index on a column that doesn't exist in the schema, no FK in the table, no UI for selecting the related entity.

**Concrete fix for wiring.js:** In `appendToSchema`, after iterating `fields`, iterate `relationships` and for each `belongs_to`, add:
```typescript
`    ${rel.column}: v.optional(v.id("${rel.target}")),`
```

**Concrete fix for mutations.ts.hbs:** Add a `{{#each relationships}}{{#ifEq type "belongs_to"}}` block that includes the FK field in create/update args.

**Concrete fix for form.tsx.hbs:** Generate a query call + Select dropdown for `belongs_to` fields, parameterized on `rel.target`.

### 2. Fix Branching Transitions — The Linear Index Assumption Is a Land Mine

The `currentIndex + 1` check assumes every enum is a linear pipeline. The moment you have any fork (won/lost, approved/rejected, active/paused/cancelled), the logic silently blocks valid transitions. The fix is straightforward — use the transitions map directly:

```typescript
// In mutations.ts.hbs, inside updateStatus handler:
const validTransitions = {
  {{#each this.transitions}}
  "{{@key}}": [{{#each this}}"{{{this}}}"{{#unless @last}}, {{/unless}}{{/each}}],
  {{/each}}
};
const allowed = validTransitions[{{camelCase ../name}}.{{@key}}] ?? [];
if (!allowed.includes(args.{{@key}})) {
  throw new Error(ERRORS.{{../name}}.INVALID_STATUS_TRANSITION);
}
```

### 3. Introduce a `board` View Type

A board/Kanban view grouped by an enum field is the natural UI for CRM pipeline, project status, and any other status-driven workflow. The generator knows about enums with values — generating a board view template that maps enum values to columns is achievable. The YAML already has `views.table.groupBy` as a declared but unused field. A `board` view type would use `groupBy: stage` to produce a Kanban layout.

### 4. Solve the Enum Name Collision Problem Systematically

Every feature's primary enum is likely to be named `status`. The schema wiring imports them as `status` (unqualified), which collides. Two options:

**Option A:** Force prefix in schema.ts.hbs — always export as `{featureName}Status` (e.g., `contactStatus`).

**Option B:** The wiring action detects collision and uses aliased imports automatically.

Option A is cleaner. It makes downstream TypeScript code explicit about which feature's status it's referring to. The templates already import by the YAML field name (e.g., `status`, `stage`). Changing to `contactStatus` and `dealStage` in the schema exports would prevent all future collisions.

### 5. Add an Activity Log Participation Mechanism

The `behaviors.auditTrail: true` flag exists in `FeatureConfig` and in `defaults.yaml` (default: false) but does nothing. Wiring this up would be high-value:

When `auditTrail: true`:
1. Import `logActivity` in mutations.ts
2. Add `// @custom-start create-post` block that calls `logActivity` with `action: "created"`
3. Add `logActivity` calls to update, remove, and updateStatus mutations
4. Extend the activity log's `entityType` enum in schema.ts (requires re-running activity-logs generator or manual edit)

The hardcoded `EntityType` union in `activity-logs/helpers.ts` is the real problem. It should be derived from a shared config or made generic enough to accept any string entity type.

### 6. Fix the FilterBar + Page Filter Duplication

The FilterBar generates both `filteredViews` tabs and `{field}:{value}` enum tabs, which overlap. The page filter logic for named views is broken (always returns true). Both issues have the same root fix: unify the filter model.

Proposal: filteredViews should be the only filter source. Remove the auto-generation of `{field}:{value}` enum tabs. The filteredViews already declare filters declaratively — that's the right model. Add a "show all" + one tab per filteredView. If the user wants per-value filtering, they declare each value as a filteredView entry.

### 7. Fix Table Column Type Cross-Reference

The table view generator should cross-reference `fields[column.field].type` when emitting the column definition. This would correctly set `type: "enum"` for status columns, enabling the StatusBadge to render instead of plain text.

The fix in `table-view.tsx.hbs`:
```handlebars
{ field: "{{field}}", label: "{{field}}", type: "{{lookup (lookup ../fields field) 'type'}}", ... }
```

### 8. Fix the Blank Lines in Form Output

The form template uses `{{#ifEq type "string"}}...{{/ifEq}}` blocks that leave blank lines for non-matching types. Use Handlebars whitespace control (`{{~#ifEq~}}`) or restructure the template with `{{else}}` chains to avoid multiple empty lines per field.

### 9. Consider a `generate-for-worktree` CLI Wrapper

Given that worktrees are on different commits, the generator needs to be invocable in a worktree context. Options:
- A `pilot gen:feature` command that always uses the main branch's generator
- A `generator-version.json` file that pins the generator version and checks for updates
- Symlinking `generators/` and `templates/` in the worktree to the main branch equivalents

### 10. The YAML + Re-Generation Cycle Needs a "Update" Mode

Currently, re-running the generator on an existing feature is blocked (smartAdd skips existing files). Once you've customized a file, you lose the ability to get upstream template improvements. Consider a `--update` mode that regenerates only the `@generated-start`/`@generated-end` regions while preserving `@custom-start`/`@custom-end` blocks. The marked-region infrastructure already exists in `generators/utils/marked-regions.js` — it just needs to be integrated into the generation pipeline as an update path.

---

*Last updated: 2026-03-28*
