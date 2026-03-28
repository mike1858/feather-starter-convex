# VISION.md — Frappe for Convex

The full product arc: from starter template to model-driven application platform.

## The Elevator Pitch

Upload a spreadsheet. Get a working app — CRUD UI, permissions, workflows, audit trail, tests — instantly. Work in the app or in Excel. Everything is transferable. Customize with real code when it matters, runtime config everywhere else.

**Inspirations (in order):**
1. [Frappe Framework](https://frappe.io/framework) — DocType → everything generated. Low-code first, pro-code when needed.
2. [Avo](https://avohq.io/) — Ruby on Rails admin that makes CRUD beautiful with a Resource DSL.
3. [JHipster](https://www.jhipster.tech/) — Full-stack code generation from a domain model (JDL).
4. [Phoenix LiveView](https://www.phoenixframework.org/) — Generators with tests, Context pattern, real-time by default.
5. [Glide](https://www.glideapps.com/) — Upload spreadsheet → working app instantly. Stunning default UX.
6. [FullProduct](https://fullproduct.dev/) — Git-based plugin system, installable features.

**Stack:** React 19 + Convex + TanStack Router + shadcn/ui + Vitest

---

## Why This Exists — The Real Problem

> I work as a data consultant. When I try to build data pipelines, what I get are a lot of Excel sheets — some of them with master data lookup definitions of codes that are in the ERP. I need to get a quick system up and running. That's my prime requirement.
>
> Then come the slightly more complex cases like budgets stored in Excel, where columns might get added — it evolves over time. What people want with budgets is to work on the app, maybe download it, tweak it a little in Excel — maybe just add rows, or even tweak columns and formulas — then upload it back.
>
> I work heavily with finance professionals. When we hand them a new system, they want to have everything in Excel. Excel is going to be the single language I use with my users. They upload an Excel to get a system, they iterate on the system, and when they finish, they write things back so users get it in Excel.
>
> 100% interoperable. A system built through Excel, operated through Excel, config changed through Excel. Every version backed up and restored. A complete transferable system.
>
> To work on multiple projects, people want a menu where they pick 5-10 items — horizontal features, plug and play modules, cross-cutting concerns — and they get working systems.
>
> Started as a developer but moved into data. My team is skilled in both. Our aim is to bootstrap something very quickly, and if we need to get into code for custom requirements, we can. Otherwise, we just want to get moving.
>
> I often sit with users in full-day workshops where all I can share is Excel — email Excel, email Excel back to me. Things should be transferable back and forth. A technical person can convert to CSV for version control. When I say Excel, I mean the two-dimensional format — CSV, maybe MD tables or XML in some cases, but primarily the 2D tabular format to capture everything.

### The Three Roles of Excel

This vision gives Excel (the 2D tabular format — CSV for version control) three distinct roles:

**1. Excel as Model Definition**
Upload a spreadsheet → system infers schema from column headers and data types → working CRUD app. The spreadsheet IS the model definition. No TypeScript DSL to learn — the data you already have defines the system.

**2. Excel as Bidirectional Data Layer**
Upload data in → work in the app → download data out → modify in Excel (add rows, tweak formulas, even change columns) → re-upload. The system adapts to schema changes. Finance professionals never leave their comfort zone.

**3. Excel as Configuration**
A "menu" spreadsheet where you tick which modules you want (auth, budgets, lookups, master data, approvals...) → the system assembles itself from those selections. Feature selection via spreadsheet, not CLI flags or config files.

### The Interoperability Promise

```
Excel (upload) ──→ Model Definition ──→ Working App
                        ↑                    ↓
                   CSV (git)            App (CRUD)
                        ↑                    ↓
Excel (download) ◄── MD/CSV backup ◄── Data changes
```

Every state is exportable. Every version is restorable. The system is never trapped in the app — it can always come back to the 2D format that finance professionals trust.

---

## The Builder's Journey

> I started as a developer building a Gartner-rated MDM product for i2 Technologies. I integrated Business Objects and Informatica into i2's reporting and MDM suite. Then I went on to my MBA in Finance, joined KPMG, set up its data analytics/BI practice, then worked with a lot of NGOs in Geneva, Switzerland and set up my own consulting company BIsquared. I helped large and small clients get the best value out of Tableau and PowerBI-like tools — remove the hype, get them working to solve real problems, using small iterative cycles of ideally 2-3 weeks of delivery.
>
> My frustration was with the amount of different tools I had to buy and configure to make it work, and the amount of mouse-clicks my team and I have to do to make this all possible. That is my entire professional journey.

**Professional arc:** Developer (MDM, enterprise integration) → Finance (MBA) → Consulting (KPMG, BIsquared) → Data platform builder (this project).

**Clients:** Unilever, WHO, IOM, Olam — large organizations where data lives in Excel, SAP, and scattered systems. Finance professionals who trust spreadsheets and need results in 2-3 week cycles.

### The Tool Graveyard

Tools this project aims to replace — or at least reduce dependence on:

| Tool | What It Does | The Frustration |
|------|-------------|-----------------|
| Alteryx | ETL / data prep | Expensive, proprietary, desktop-only |
| Talend | ETL / integration | Complex setup, Java-heavy, steep learning curve |
| Power Pivot | Data modeling in Excel | Limited, crashes on large data, locked to Microsoft |
| QlikView | BI / dashboards | Custom scripting language, vendor lock-in |
| VBA for Excel | Automation / macros | Fragile, unmaintainable, no version control |
| Python scripts | Data cleaning / transformation | Requires developer, not accessible to finance teams |
| Data Wrangler | Data cleaning | Yet another tool in the chain |
| Tableau | Visualization / dashboards | Expensive per-seat, separate from the data pipeline |
| Tableau Prep | Visual ETL | Separate product, separate license, limited |
| Business Objects | Enterprise reporting | Legacy, heavyweight, complex administration |
| Informatica | Enterprise ETL | Enterprise pricing, enterprise complexity |

**The core frustration:** Each tool solves one piece. You need 5-7 tools wired together, each with its own license, learning curve, and configuration overhead. The promise of this project: **one system that covers upload → clean → transform → model → view → analyze → report → export**.

### Product Strategy

**Two products, one core:**

```
                    ┌─────────────────────┐
                    │    Shared Core       │
                    │  Model Definition    │
                    │  Runtime Renderer    │
                    │  Convex Backend      │
                    │  Auth / Permissions  │
                    │  Excel Interop       │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                                  ▼
    ┌──────────────────┐              ┌──────────────────┐
    │  Product A:      │              │  Product B:      │
    │  App Builder     │              │  Data Platform   │
    │                  │              │                  │
    │  CRUD generation │              │  ETL / data prep │
    │  Workflows       │              │  Data Navigator  │
    │  Dashboards      │              │  Reporting / BI  │
    │  Plugin system   │              │  Data quality    │
    │                  │              │  Annotations     │
    │  (Frappe/Avo)    │              │  (Tableau/Prep)  │
    └──────────────────┘              └──────────────────┘
```

Like Frappe extracted the framework when they built ERPNext — the core emerges from building the products, not the other way around. Build what's needed, extract the reusable core as it crystallizes.

**Go-to-market evolution:**
1. **Now:** Open source everything + paid consulting (BIsquared model — use the tool to deliver client work faster)
2. **Later:** Open source core + managed cloud hosting (Frappe Cloud model — clients can self-serve)
3. **Eventually:** Clients operate it themselves, BIsquared provides training and premium support

**What's explicitly OUT of scope:**
- **MDM (Master Data Management)** — Siraj has the background (built Gartner-rated MDM) but explicitly defers this. MDM is an enterprise sales cycle and a product in itself. If it happens, it's a third product on the shared core, not part of v1-v14.
- **Enterprise sales motions** — Start with consulting delivery, not enterprise software sales.

---

## The Hybrid Architecture

The central architectural decision: **runtime config by default, generated code when customization matters.**

### Runtime Config (Declarative)

For things that follow predictable patterns and rarely need custom code:

| Concern | Model Definition → Runtime Rendering |
|---------|--------------------------------------|
| List views | Columns, sort order, filters, pagination — all from model config |
| Form layout | Field order, sections, tabs, conditional visibility — declarative |
| Detail/show views | Which fields to display, layout, related records — declarative |
| Permissions | RBAC rules: which roles can CRUD — declarative in model |
| Workflows | State machine: states, transitions, role requirements — declarative |
| Validations | Required, min/max, regex, unique — expressed as rules in model |
| Field → widget | String → text input, Boolean → toggle, Date → date picker — automatic |
| Dashboard cards | Metrics, counts, charts — declarative config |
| Filters & scopes | Named query presets — declarative |
| Search | Which fields are searchable — declared per field |
| Audit trail | Field-level change tracking — automatic from model |

A **runtime renderer** reads the model definition and provides a working UI immediately. No code generation step required for basic CRUD.

### Generated Code (Eject When Needed)

For things where developers need full control:

| Concern | Why Code Generation |
|---------|---------------------|
| Custom components | When auto-rendered UI isn't enough — need pixel-perfect design |
| Complex business logic | Convex functions with domain-specific rules, multi-step operations |
| Custom actions | Bulk operations, integrations, workflows with side effects |
| External integrations | API calls, webhooks, third-party services |
| Complex form behavior | Multi-step wizards, dependent fields with async data |
| Tests | Always real code — integration tests, backend tests |
| Custom pages | Dashboards, reports, landing pages beyond CRUD |

### The Eject Pattern

Like shadcn gives you component code instead of a library dependency:

1. **Start runtime**: Define model → get working CRUD UI immediately (Frappe-style)
2. **Eject when needed**: Run `npm run eject <entity> <piece>` → generates the code version
3. **Customize freely**: The ejected code follows strict conventions, is fully yours
4. **Runtime defers**: Once ejected code exists, the runtime renderer yields to your custom version

```
Model Definition (JSON/DSL)
    ↓
    ├── Runtime Renderer (default) ──→ Working UI immediately
    │
    └── Code Generator (on eject) ──→ Your code, your rules
         ├── List component
         ├── Form component
         ├── Detail component
         ├── Convex functions
         ├── Tests
         └── Route file
```

**Key insight from Frappe**: The model definition is the source of truth. Both runtime rendering and code generation read from it. When you eject, you're not "leaving" the framework — you're just switching from interpreted to compiled for that specific piece.

### The 80/20 Principle

80% of business applications need the same thing: list, detail, create, edit, delete, search, filter, sort, auth, permissions, responsive UI. This platform nails that 80% from configuration alone. The remaining 20% gets full code control via the eject pattern. Build the common case fast, customize the exceptional case freely.

---

## Product Phases

### Phase 1: Foundation (Starter Pack)

**Goal:** A production-ready starting point that makes it impossible to skip testing.

| ID | Requirement |
|----|-------------|
| F1-01 | Vitest dual environments (edge-runtime + jsdom) with `projects` config |
| F1-02 | convex-test + convex-test-provider + @testing-library/react |
| F1-03 | 100% coverage thresholds enforced |
| F1-04 | tdd-guard Claude Code hook |
| F1-05 | Lefthook pre-commit (lint + format + coverage) |
| F1-06 | Complete auth flow: login route, component-level guard, auth wrappers, signout |
| F1-07 | TanStack Router file-based routing with auto code splitting |
| F1-08 | shadcn/ui sidebar + topbar layout shell |
| F1-09 | Custom ThemeProvider (dark/light/system) |
| F1-10 | Error boundaries (app + route level) + Sonner toast + ConvexError pattern |
| F1-11 | Zod env validation |
| F1-12 | AGENTS.md, .env.example, clean schema |
| F1-13 | TodoMVC example demonstrating all patterns (removable via clean branch) |
| F1-14 | Cell pattern: Loading/Empty/Failure/Success for all query components |
| F1-15 | Phoenix Context pattern: one Convex file per domain, thin functions |

**Delivers:** Clone → `npm install` → working app with auth, layout, theme, TodoMVC, 100% test coverage.

---

### Phase 2: Generator Spike (Plop.js)

**Goal:** Prove that consistent patterns enable code generation.

| ID | Requirement |
|----|-------------|
| F2-01 | `npm run generate model <Name>` via Plop.js |
| F2-02 | Generates 7 files: schema, functions, backend test, list component, form component, integration test, route |
| F2-03 | Generated code uses Cell pattern, auth wrappers, ConvexError handling |
| F2-04 | Generated tests follow TodoMVC test patterns |
| F2-05 | Rails-style naming: plural tables, singular models, consistent casing |
| F2-06 | Handles basic field types: string, number, boolean, date |

**Delivers:** `npm run generate model Project` → working CRUD with tests in seconds.

---

### Phase 3: Model Definition Language

**Goal:** A rich, declarative way to describe entities — the keystone everything builds on.

| ID | Requirement |
|----|-------------|
| F3-01 | JSON or TypeScript model definition format (not a custom DSL — tooling-friendly) |
| F3-02 | Field types: string, number, boolean, date, datetime, email, url, phone, currency, percentage, text (long), richtext, select (enum), multiselect, file, image |
| F3-03 | Field validations: required, min, max, minLength, maxLength, pattern, unique. Each validation carries an **enforcement level**: `hard` (blocks save) or `soft` (shows warning). Enables patterns like real vs soft due dates. |
| F3-04 | Field UI hints: label, placeholder, helpText, defaultValue, displayInList, displayInForm, sortable, searchable, filterable |
| F3-05 | Relationships: belongsTo (Link), hasMany (reverse), hasOne, manyToMany (junction table) |
| F3-06 | Relationship config: display field, cascade delete, required |
| F3-07 | Naming strategies: auto-increment, by field, custom expression, UUID |
| F3-08 | Model metadata: singular name, plural name, icon, description, default sort |
| F3-09 | Validation: model definition validated at build time with clear error messages |
| F3-10 | Schema generation: model definition → Convex schema.ts entries automatically |

**Example model definition:**
```typescript
// models/project.model.ts
export const ProjectModel = defineModel({
  name: "Project",
  plural: "projects",
  icon: "folder",
  defaultSort: { field: "name", order: "asc" },

  fields: {
    name: field.string({ required: true, maxLength: 200, searchable: true }),
    description: field.text({ placeholder: "Project description..." }),
    status: field.select({
      options: ["active", "archived", "draft"],
      default: "draft",
      filterable: true,
    }),
    dueDate: field.date({ label: "Due Date" }),
    budget: field.currency({ min: 0 }),
    isPublic: field.boolean({ default: false, label: "Public?" }),
  },

  relationships: {
    owner: belongsTo("User", { required: true, displayField: "name" }),
    tasks: hasMany("Task"),
  },
});
```

**Delivers:** A model definition format rich enough to drive both runtime rendering AND code generation.

---

### Phase 4: Runtime CRUD Renderer

**Goal:** Model definition → working CRUD UI with zero code generation.

| ID | Requirement |
|----|-------------|
| F4-01 | `<ModelList model={ProjectModel} />` — renders list view from model definition |
| F4-02 | `<ModelForm model={ProjectModel} />` — renders create/edit form from model definition |
| F4-03 | `<ModelDetail model={ProjectModel} />` — renders detail/show view from model definition |
| F4-04 | Field type → widget mapping (see table below): automatic, correct widget for every field type |
| F4-05 | List view: columns from model, sortable, filterable, searchable, paginated |
| F4-06 | Form view: correct input types, validation, error messages, layout |
| F4-07 | Detail view: read-only display with correct formatting per field type |
| F4-08 | Relationship rendering: belongsTo → select/combobox, hasMany → linked list |
| F4-09 | Auto-generated Convex functions (CRUD) from model at build time |
| F4-10 | Auto-generated routes from model registry |
| F4-11 | Empty state, loading state, error state handled automatically (Cell pattern) |
| F4-12 | Toast feedback wired to all mutations automatically |

**Type-to-widget mapping** (Glide-inspired — data shape determines UI automatically):

| Field Type | List Display | Form Widget | Detail Display |
|-----------|-------------|-------------|---------------|
| string | Text | Text input | Text |
| number | Formatted number | Number input | Formatted number |
| boolean | Badge/icon | Toggle | Badge/icon |
| date | Formatted date | Date picker | Formatted date |
| select | Badge | Select dropdown | Badge |
| currency | Formatted with symbol | Number + currency | Formatted |
| email | Mailto link | Email input | Mailto link |
| url | Clickable link | URL input | Clickable link |
| text | Truncated | Textarea | Full text |
| richtext | Rendered HTML | Rich editor | Rendered HTML |
| file/image | Thumbnail/icon | Upload widget | Preview/download |

**Delivers:** Define a model → get a working CRUD app. No components to write for standard CRUD.

---

### Phase 5: Eject & Customize

**Goal:** Escape hatch from runtime to code, without losing the model definition as source of truth.

| ID | Requirement |
|----|-------------|
| F5-01 | `npm run eject <Entity> list` — generates the list component code |
| F5-02 | `npm run eject <Entity> form` — generates the form component code |
| F5-03 | `npm run eject <Entity> detail` — generates the detail component code |
| F5-04 | `npm run eject <Entity> functions` — generates the Convex functions |
| F5-05 | `npm run eject <Entity> tests` — generates test files |
| F5-06 | `npm run eject <Entity> all` — ejects everything |
| F5-07 | Ejected code is clean, readable, follows project conventions |
| F5-08 | Runtime renderer detects ejected code and defers to it |
| F5-09 | Model definition still drives schema, validations, and any non-ejected pieces |
| F5-10 | Eject is one-way per piece (no "re-inject") — but you can delete ejected code to go back to runtime |

**Delivers:** Start fast with runtime, customize exactly what you need.

---

### Phase 6: Resource Configuration (Avo-inspired)

**Goal:** Rich admin-like capabilities without ejecting.

| ID | Requirement |
|----|-------------|
| F6-01 | Actions: define custom actions per model (bulk select → action, row action, standalone) |
| F6-02 | Action forms: actions can have input forms (e.g., "assign to user" → user picker) |
| F6-03 | Filters: boolean, select, date range, custom filter definitions |
| F6-04 | Scopes: named query presets (e.g., "Active Projects", "My Tasks", "Overdue") |
| F6-05 | Global search across all models (searchable fields) |
| F6-06 | Per-model search with field weighting |
| F6-07 | Bulk operations: select multiple → delete, update field, run action |
| F6-08 | Export: CSV export of list view (respecting current filters) |
| F6-09 | Custom field types: register new field type → widget mapping |
| F6-10 | Computed/virtual fields: derived from other fields, display-only |

**Delivers:** Admin-quality CRUD interface from configuration alone.

---

### Phase 7: Permissions (Frappe-inspired)

**Goal:** Declarative security from model definition.

| ID | Requirement |
|----|-------------|
| F7-01 | Role definition: named roles with hierarchy (admin > editor > viewer) |
| F7-02 | Model-level permissions: per role, which operations (create, read, update, delete) |
| F7-03 | Row-level permissions: "users see only their own records" or "team members see team records" |
| F7-04 | Field-level permissions: some fields read-only or hidden for certain roles |
| F7-05 | Permission enforcement in Convex functions (server-side, not just UI) |
| F7-06 | Permission-aware UI: buttons/actions hidden when user lacks permission |
| F7-07 | Permission declared in model definition — not scattered across code |
| F7-08 | Super-admin role that bypasses all permissions |
| F7-09 | Permission testing utilities: test "as role X, can I do Y?" |

**Example:**
```typescript
permissions: {
  admin: { create: true, read: true, update: true, delete: true },
  editor: { create: true, read: true, update: true, delete: false },
  viewer: { read: true },
  rules: [
    { type: "owner", field: "userId", roles: ["editor"] }, // editors see only own records
  ],
}
```

**Implementation pattern:** A 4-layer permission framework designed during earlier prototyping:
1. **Atomic permissions** — `resource.action` (e.g., `tasks.edit`)
2. **Scopes** — `all`, `own`, `assigned`, `team` (e.g., `tasks.edit:own,assigned`)
3. **Roles** — Named bundles of scoped permissions
4. **Grants** — Subject → permission mapping with context hierarchy (global → org → project)

See `_methodologies/superpowers/permission-framework.md` for the detailed design.

**Delivers:** RBAC from config. No permission logic sprinkled across components and functions.

---

### Phase 8: Workflows (Frappe-inspired)

**Goal:** State machines defined in the model, enforced everywhere.

| ID | Requirement |
|----|-------------|
| F8-01 | Workflow definition: states, transitions, roles required per transition |
| F8-02 | Status field auto-added to model when workflow is defined |
| F8-03 | Transition conditions: field-based rules (e.g., "can only approve if amount < 10000") |
| F8-04 | Transition actions: run custom logic on transition (send email, update related records) |
| F8-05 | UI: action buttons change based on current state and user role |
| F8-06 | History: transition log (who moved it, when, from what state to what state) |
| F8-07 | Workflow enforced in Convex functions — can't skip states via API |

**Example:**
```typescript
workflow: {
  field: "status",
  states: ["Draft", "Submitted", "Approved", "Rejected", "Cancelled"],
  transitions: [
    { from: "Draft", to: "Submitted", roles: ["editor", "admin"] },
    { from: "Submitted", to: "Approved", roles: ["admin"], condition: "budget < 50000" },
    { from: "Submitted", to: "Rejected", roles: ["admin"] },
    { from: ["Draft", "Submitted"], to: "Cancelled", roles: ["editor", "admin"] },
  ],
}
```

**Delivers:** Approval flows, document lifecycles, order processing — from config.

---

### Phase 9: Audit Trail & Versioning (Frappe-inspired)

**Goal:** Know who changed what, when, automatically.

| ID | Requirement |
|----|-------------|
| F9-01 | Field-level change tracking: log every field change with old value, new value, user, timestamp |
| F9-02 | Version snapshots: full record snapshot on significant changes |
| F9-03 | Version comparison: diff two versions side-by-side |
| F9-04 | Activity timeline on detail view: changes, comments, workflow transitions |
| F9-05 | Configurable per model: opt-in (not all models need audit trail) |
| F9-06 | Audit data stored in Convex (queryable, real-time) |
| F9-07 | Audit trail respects permissions (can't see changes to records you can't access) |

**Delivers:** Built-in compliance and accountability.

---

### Phase 10: Child Tables & Complex Relationships (Frappe-inspired)

**Goal:** Parent-child embedded records for documents with line items.

| ID | Requirement |
|----|-------------|
| F10-01 | Child table field type: inline editable rows within a parent record |
| F10-02 | Add/remove/reorder child rows in the form |
| F10-03 | Child rows inherit parent's permissions |
| F10-04 | Computed parent fields from children: sum, count, min, max |
| F10-05 | Cascade operations: delete parent → delete children |
| F10-06 | Child table in list view: expandable rows or nested display |
| F10-07 | Validation across parent + children (e.g., "at least one line item required") |

**Use case:** Invoice → Line Items, Order → Order Items, Project → Tasks.

**Delivers:** Document-style records (Frappe's core strength).

---

### Phase 11: Data Navigator, Dashboards & Reporting (Tableau + Avo + Frappe)

> I worked with Tableau and PowerBI for a long time, but I want the ideas without the stack and the need to learn another tool. Ideally I want to build a Data Navigator-like UI for all the models, so that the user can click on a table, see the rows like in Excel, filter and sort, then click on an FK field, see the related table, filter those items, export them or bookmark them, add comments to indicate data quality issues. All built around my main work as a data consultant for large firms like Unilever, WHO, IOM, Olam.

**Goal:** Explore, analyze, and annotate data without leaving the app — Tableau's ideas, no Tableau needed.

#### Data Navigator (Core)

| ID | Requirement |
|----|-------------|
| F11-01 | Model browser: see all tables/models, click to open any one |
| F11-02 | Spreadsheet-style grid view: rows like Excel, columns from model fields |
| F11-03 | Inline filtering: per-column filters (text search, range, select, date) |
| F11-04 | Sorting: click column header to sort asc/desc, multi-column sort |
| F11-05 | FK navigation: click a foreign key field value → navigate to the related table, filtered to that relationship |
| F11-06 | Breadcrumb trail: track navigation path (Products → clicked Category "Electronics" → Category table filtered) |
| F11-07 | Bookmark views: save current table + filters + sort as a named bookmark |
| F11-08 | Data annotations: add comments/flags to any row indicating data quality issues (missing data, suspect values, needs review) |
| F11-09 | Annotation dashboard: view all flagged rows across tables, filter by issue type, assign to team members |
| F11-10 | Export current view: CSV/Excel export respecting current filters and sort |
| F11-11 | Bulk inline edit: edit cells directly in the grid (with permission checks) |
| F11-12 | Real-time: grid updates live via Convex subscriptions as data changes |

#### Dashboards

| ID | Requirement |
|----|-------------|
| F11-13 | Dashboard page: configurable grid of cards |
| F11-14 | Card types: metric (count/sum/avg), chart (bar/line/pie), list (recent/top), custom |
| F11-15 | Cards defined per model or globally |
| F11-16 | Real-time: dashboard cards update live via Convex subscriptions |

#### Reporting

| ID | Requirement |
|----|-------------|
| F11-17 | Report builder: select model → pick fields → filter → sort → display |
| F11-18 | Report types: list report, pivot/aggregate report |
| F11-19 | Export: CSV, PDF from reports |
| F11-20 | Saved reports: name and save report configurations |
| F11-21 | Cross-model reports: join related tables, group by FK fields |

**Delivers:** A data consultant can explore an entire dataset relationally, flag quality issues, export slices, and build reports — all within the app. No Tableau, no PowerBI, no context switching.

---

### Phase 12: Plugin System (FullProduct-inspired)

**Goal:** Extensibility via git-based plugins.

| ID | Requirement |
|----|-------------|
| F12-01 | Plugin branch convention: `plugin/<name>` branches fork from `main` |
| F12-02 | Plugins add files, don't modify shared files |
| F12-03 | `PLUGIN.md` per plugin: description, install instructions, dependencies |
| F12-04 | Plugin install: `git merge plugin/<name>` |
| F12-05 | Plugin registry: document available plugins in repo README |
| F12-06 | Example plugins: Stripe payments, email (Resend), file uploads, i18n |
| F12-07 | Plugin template: `npm run generate plugin <name>` scaffolds plugin branch |

**Delivers:** Community-extensible without a runtime plugin framework.

---

### Phase 13: Excel Interoperability (Glide-inspired)

**Goal:** Excel as the universal interface — import, export, round-trip, configure.

| ID | Requirement |
|----|-------------|
| F13-01 | Upload CSV/Excel → infer model definition from column headers and data types |
| F13-02 | Type inference: detect string, number, date, email, URL, phone, boolean, currency from data patterns |
| F13-03 | Relationship inference: detect lookup columns (codes matching another sheet's IDs) |
| F13-04 | Master data import: upload lookup/reference tables → auto-create enum/reference models |
| F13-05 | Bidirectional sync: download data as CSV/Excel, modify, re-upload with change detection |
| F13-06 | Schema evolution: new columns in re-upload → prompt to add fields to model |
| F13-07 | Bulk data operations: upload replaces dataset, append mode, merge mode |
| F13-08 | Export: any list view → CSV/Excel with current filters applied |
| F13-09 | Config via spreadsheet: module selection sheet → system assembles selected features |
| F13-10 | Version snapshots: export entire system state (data + config) as CSV bundle, restorable |

**Delivers:** Finance professionals work in Excel. The system adapts. Everything is transferable.

---

### Phase 14: Browser-Based Model Editor (Frappe endgame)

**Goal:** Non-developers can define and modify models through UI.

| ID | Requirement |
|----|-------------|
| F14-01 | Model editor UI: visual form for defining fields, types, validations |
| F14-02 | Relationship editor: visual connection between models |
| F14-03 | Workflow editor: visual state machine builder |
| F14-04 | Permission editor: matrix UI (roles × operations) |
| F14-05 | Live preview: see the generated CRUD UI as you define the model |
| F14-06 | Export: model definition → JSON/TypeScript file committed to repo |
| F14-07 | Import: upload/paste model definition → load into editor |
| F14-08 | Import from Excel: upload spreadsheet → populate model editor fields |
| F14-09 | Schema migration: model changes → automatic Convex schema updates |

**Delivers:** Low-code model definition. The Frappe experience for Convex.

---

### Phase 15a: File-Based ETL (Tableau Prep-inspired)

**Goal:** Upload messy data → clean, transform, join → load into the system. No Alteryx, no Talend, no Python scripts.

| ID | Requirement |
|----|-------------|
| F15a-01 | Pipeline definition: YAML/JSON config or visual UI defining source → transform → target |
| F15a-02 | Sources: CSV/Excel file upload, existing tables in the system |
| F15a-03 | Transforms: rename columns, change types, filter rows, deduplicate, fill missing values, split/merge columns |
| F15a-04 | Joins: join two sources on a key (inner, left, right, full) — like Tableau Prep's join step |
| F15a-05 | Lookups: map codes to descriptions using a reference table (e.g., country code → country name) |
| F15a-06 | Validation rules: flag rows that fail rules (e.g., "amount must be positive", "date must be in range") |
| F15a-07 | Preview: see output at each step before committing (like Tableau Prep's step-by-step preview) |
| F15a-08 | Target: load cleaned data into a model/table in the system |
| F15a-09 | Saved pipelines: name and rerun a pipeline when new data arrives |
| F15a-10 | Pipeline history: log of every run with row counts, errors, warnings |
| F15a-11 | Scheduled runs: rerun pipeline on a schedule (daily, weekly) for recurring data loads |
| F15a-12 | Error handling: quarantine rows that fail validation, let user review and fix |

**Delivers:** A data consultant uploads messy Excel, defines cleanup steps, loads clean data — all in one system. Replaces Alteryx, Talend, Python scripts, VBA, Data Wrangler for file-based work.

---

### Phase 15b: Connector-Based ETL (Future — Informatica territory)

**Goal:** Connect to external databases and APIs as data sources.

| ID | Requirement |
|----|-------------|
| F15b-01 | Database connectors: PostgreSQL, MySQL, SQL Server, SAP HANA |
| F15b-02 | API connectors: REST API with auth (API key, OAuth) |
| F15b-03 | Cloud connectors: Google Sheets, Airtable, Notion |
| F15b-04 | Connection management: saved credentials, test connection, connection health |
| F15b-05 | Incremental sync: only pull changed records (timestamp or change tracking) |
| F15b-06 | Same pipeline engine as 15a — connectors are just another source type |

**Delivers:** External data flows into the same pipeline engine. Replaces Informatica, Talend, Airbyte for common integrations.

---

## Cross-Cutting Concerns

These span multiple phases and evolve over time:

| ID | Concern | Introduced | Matures |
|----|---------|------------|---------|
| CC-01 | Testing: every generated artifact includes tests | Phase 1 | Phase 4 |
| CC-02 | Type safety: end-to-end TypeScript, model → DB → API → UI | Phase 1 | Phase 3 |
| CC-03 | Real-time: all data reactive via Convex subscriptions | Phase 1 | Phase 11 |
| CC-04 | Mobile-responsive: all generated UI works on mobile | Phase 4 | Phase 6 |
| CC-05 | Accessibility: WCAG 2.1 AA for all generated components | Phase 4 | Phase 6 |
| CC-06 | i18n-ready: string extraction, locale support | Phase 6 | Phase 12 |
| CC-07 | Performance: pagination, lazy loading, code splitting | Phase 1 | Phase 4 |
| CC-08 | AI-agent friendly: patterns consistent enough for LLMs to extend | Phase 1 | All |
| CC-09 | Excel interop: every data view exportable as CSV, every model importable from CSV | Phase 6 | Phase 13 |
| CC-10 | Version control: system state serializable to files (CSV/MD), committable, restorable | Phase 1 | Phase 13 |

## Phase Dependencies

```
Phase 1: Foundation ─────────────────────────────────────────┐
    ↓                                                         │
Phase 2: Generator Spike                                      │
    ↓                                                         │
Phase 3: Model Definition Language ◄──── THE KEYSTONE         │
    ↓                                                         │
Phase 4: Runtime CRUD Renderer ──────────────────────────┐    │
    ↓                                                     │    │
Phase 5: Eject & Customize                                │    │
    ↓                                                     │    │
    ├── Phase 6: Resource Config (Avo)                    │    │
    ├── Phase 7: Permissions (Frappe) ────────────────────┤    │
    ├── Phase 8: Workflows (Frappe) ──────────────────────┤    │
    ├── Phase 9: Audit Trail (Frappe) ────────────────────┤    │
    └── Phase 10: Child Tables (Frappe) ──────────────────┘    │
                                                               │
Phase 11: Dashboards & Reporting ◄─── needs Phase 4 + 7       │
Phase 12: Plugin System ◄──────────── independent, needs Ph 1 ┘
Phase 13: Excel Interop ◄─────────── needs Phase 3 + 4
Phase 14: Browser Model Editor ◄──── needs Phase 3 + 4 + 13
Phase 15a: File-Based ETL ◄───────── needs Phase 3 + 13
Phase 15b: Connector ETL ◄────────── needs Phase 15a
```

Phases 6-10 can be built in any order after Phase 5. Phase 11 needs data + permissions. Phase 12 is independent. Phase 13 (Excel) can start after Phase 4. Phase 15a (ETL) builds on Excel interop. Phase 14 and 15b are capstones.

---

## Real-World Example: CalmDo on This Platform

CalmDo (a task management system for a 2-person dev team) demonstrates how a real product leverages the platform at each phase:

| Platform Phase | CalmDo Usage |
|---------------|-------------|
| Phase 1 (Foundation) | Clone starter, get auth + layout + testing |
| Phase 2 (Generator) | `npm run generate model Project`, `Task`, `Subtask` |
| Phase 3 (Model Definition) | Define task fields, relationships, statuses |
| Phase 4 (Runtime CRUD) | Instant working UI for all entities |
| Phase 5 (Eject) | Eject task form for custom subtask promotion UI |
| Phase 6 (Resource Config) | Add actions (mark complete, assign), filters (by status, assignee) |
| Phase 7 (Permissions) | Team member vs client roles, own-tasks-only rules |
| Phase 8 (Workflows) | Task state machine: todo → in_progress → done |
| Phase 9 (Audit) | Who changed task status and when |
| Phase 10 (Child Tables) | Subtasks as inline rows within tasks |
| Phase 11 (Data Navigator) | Time reporting dashboard, project overview |
| Phase 13 (Excel) | Export time logs for billing |

See `_calmdo/` for the full product spec, domain model, and roadmap.

---

## What Makes This Different

| Competitor | Their Strength | Our Advantage |
|------------|---------------|---------------|
| Frappe | Schema → everything, low-code | Real-time by default (Convex), modern React UI, TypeScript end-to-end, Excel round-trip |
| Avo | Beautiful admin UI, Ruby DX | Not locked to Rails, test-first discipline, eject pattern, Excel interop |
| JHipster | Mature code generation, JDL | Hybrid runtime+codegen (not just codegen), simpler stack, fewer files, no Java |
| Phoenix | Generators with tests, real-time | Lower learning curve, larger React ecosystem, Excel-first model definition |
| Glide | Spreadsheet → app instantly | Pro-code escape hatch, own your code, no 25K row limits, real-time via Convex, version control |
| Retool | No-code internal tools | Own your code, no vendor lock-in, full test coverage, git-based |
| Alteryx / Talend | ETL / data prep | Open source, integrated with the app (not a separate tool), config-driven |
| Tableau / PowerBI | BI / dashboards | Integrated Data Navigator, no separate license, real-time, Excel round-trip |
| Informatica | Enterprise ETL | Modern stack, no enterprise pricing, same pipeline engine for files and connectors |

**The unique combination:** Excel-first model definition + Convex real-time + hybrid runtime/codegen + test-first discipline + integrated ETL + Data Navigator + bidirectional Excel sync. One system for the entire data consultant workflow — upload → clean → model → view → analyze → report → export. No tool-hopping.

---
*Last updated: 2026-02-20*
