# Technology Stack: CalmDo Configurable Feature Assembly

**Project:** CalmDo Core -- Configurable task management system
**Researched:** 2026-03-10
**Scope:** NEW capabilities only. Existing stack (React 19, Convex, TanStack, Zod v4, Plop.js, etc.) is validated and not re-researched.

## Recommended Stack Additions

### Zero New Runtime Dependencies

The CalmDo feature assembly system requires **no new npm packages**. The existing stack covers every need. What changes is how we use the existing tools -- specifically Plop.js gets extended with custom actions, Zod v4 schemas define config shape, and Convex stores runtime config.

This is deliberate. The lesson from 7+ CalmDo attempts (LESSONS.md): "Process > Stack." Adding libraries is the easy trap. The hard work is config design and generator templates.

### Build-Time: Config-Driven Code Generation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Plop.js | ^4.0.5 (installed) | Orchestrate multi-file code generation from feature config | Already proven in project. Extend with `setActionType` custom actions for config-aware generation. No replacement needed. |
| Handlebars | (bundled with Plop) | Template engine for generated code | Supports conditionals (`{{#if}}`) and helpers for feature-flag-driven template variants. Already in use. |
| Zod v4 | ^4.3.6 (installed) | Config file schema validation | Validate `calmdo.config.ts` at generation time. Discriminated unions model feature relationships. Already installed. |
| TypeScript | ^5.9.3 (installed) | Config file format (`calmdo.config.ts`) | Config as `.ts` file gives autocompletion, type checking, and import support. No YAML/JSON parser needed. |

### Runtime: Dynamic Configuration in Convex

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Convex | ^1.32.0 (installed) | Runtime config storage (statuses, priorities, field shapes) | Config lives in `settings` table. Queries subscribe to changes reactively -- UI updates instantly when admin changes status options. |
| convex-helpers | ^0.1.114 (installed) | Zod validation for config mutations | `zCustomMutation` validates config updates server-side. Zod v4 support confirmed (PR #840 merged). |

### Feature Selection Wizard

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @tanstack/react-form | ^1.28.4 (installed) | Wizard form state management | Multi-step form with conditional fields based on feature selection. Already integrated in project. |
| shadcn/ui | (installed) | Wizard UI components | Stepper/card layout for feature selection. No separate wizard library needed -- compose from existing Button, Card, Select, Switch components. |
| Zod v4 | ^4.3.6 (installed) | Wizard form validation | Discriminated unions validate feature combinations (e.g., "subtasks requires tasks"). |

---

## How to Extend Plop.js (NOT Replace)

### Why Extend, Not Replace

Plop.js is the right tool. The existing 4 generators (feature, route, convex-function, form) scaffold individual files. CalmDo needs a **meta-generator** that reads a config file and orchestrates multiple file generations with conditional logic. Plop supports this through:

1. **`setActionType`** -- Custom action functions that run arbitrary Node.js code
2. **Conditional actions** -- Actions array can be a function receiving answers, returning filtered action list
3. **Dynamic templates** -- Handlebars `{{#if}}` blocks inside `.hbs` templates

### What Would Justify ts-morph?

ts-morph (v27.0.2, well-maintained) is the standard for AST-based TypeScript code manipulation. Consider it ONLY if:
- You need to **modify existing files** (e.g., append to `schema.ts` table definitions)
- Template strings become unmaintainable (deeply nested conditional generation)
- You need to **analyze existing code** before generating (e.g., check what tables already exist)

**Recommendation:** Start without ts-morph. Use Plop custom actions + Handlebars conditionals. Add ts-morph only when you hit the "modify existing files" use case (likely when wiring generated tables into `convex/schema.ts`). If/when needed: `npm install -D ts-morph@^27.0.2`.

**Confidence:** HIGH -- Plop's `setActionType` API verified. ts-morph version verified via npm registry (27.0.2, last published ~Oct 2025).

---

## Config File Design

### Build-Time Config: `calmdo.config.ts`

A TypeScript file at project root, validated by a Zod schema. This is the single source of truth for what features to generate.

```typescript
// calmdo.config.ts -- example shape
import type { CalmDoConfig } from "./src/shared/schemas/calmdo-config";

export default {
  features: {
    tasks: {
      enabled: true,
      statuses: ["todo", "in_progress", "done"],
      priorities: { type: "boolean" }, // isHighPriority: true/false
      visibility: ["private", "shared"],
    },
    projects: {
      enabled: true,
      statuses: ["active", "on_hold", "completed", "archived"],
      relationship: "parent", // tasks belong to projects
    },
    subtasks: {
      enabled: true,
      requires: ["tasks"],
      promotion: true, // can promote to full task
    },
    workLogs: {
      enabled: true,
      requires: ["tasks"],
      timeTracking: true, // optional time field
    },
    activityLogs: {
      enabled: true,
      requires: ["tasks"],
      // auto-generated, no additional config
    },
  },
} satisfies CalmDoConfig;
```

**Why TypeScript, not YAML/JSON:**
- Autocompletion in editor (the config Zod schema provides the types)
- `satisfies` keyword catches config errors at write time
- Can import constants (`STATUS_OPTIONS`, etc.) for DRY configs
- No parser dependency -- Node.js imports `.ts` files via the existing TS toolchain

**Why not a database for build-time config:**
- Config drives code generation. Code generation happens at build time, not runtime.
- Different clients get different codebases ("personal software" model from PRODUCT.md).
- Config changes = regenerate code = commit = deploy. This is deliberate.

### Runtime Config: Convex `settings` Table

For things that change without redeployment -- status labels, priority levels, custom field options.

```typescript
// convex/schema.ts addition
settings: defineTable({
  scope: v.union(v.literal("global"), v.literal("project")),
  scopeId: v.optional(v.id("projects")), // null for global
  key: v.string(), // e.g., "task.statuses", "task.priorities"
  value: v.any(), // validated by application code via Zod
  updatedAt: v.number(),
  updatedBy: v.id("users"),
}).index("by_scope_key", ["scope", "scopeId", "key"]),
```

**Why a `settings` table, not hardcoded enums:**
- PRODUCT.md says "Configurable -- Statuses, tags, and workflows should be configurable per org or per project"
- Convex reactive queries mean UI updates instantly when settings change
- `v.any()` for value is intentional -- Zod validates at the mutation layer, Convex stores the validated result

**Why not a dedicated table per config type:**
- Proliferates tables for simple key-value pairs
- Single `settings` table with typed keys is the standard pattern for application configuration

**Confidence:** MEDIUM -- Pattern is sound but exact schema shape will evolve during implementation. The `v.any()` approach needs careful Zod validation to prevent garbage data.

---

## Feature Selection Wizard (No New Libraries)

### Approach: TanStack Form + shadcn/ui Composition

Build the wizard from existing components. No dedicated wizard library.

**Step structure:**
1. Core features (checkboxes: tasks, projects, subtasks)
2. Feature relationships (select: parent-child vs. optional association)
3. Field configuration (status options, priority type, visibility modes)
4. Review and generate

**State management:** TanStack Form with Zod schema validation per step. Each step's schema is a slice of the full `CalmDoConfig` Zod schema.

**Why not a wizard library (react-hook-form-wizard, react-step-wizard, etc.):**
- TanStack Form already handles multi-step via controlled state
- Wizard libraries add opinions about step transitions that conflict with conditional feature logic
- The "wizard" is really a structured form with 3-4 pages, not a complex multi-branch flow
- shadcn/ui components (Card, Button, Tabs) provide the visual stepper

**Confidence:** HIGH -- TanStack Form multi-step patterns are well-documented. shadcn/ui has stepper patterns in their blocks library.

---

## LLM-Powered Generator (Deferred)

The milestone mentions "LLM-powered generator for complex wiring between intertwined features." This is explicitly deferred from stack research because:

1. It depends on understanding the exact wiring complexity AFTER building the first manual generators
2. LLM API choice (Claude API, OpenAI, local model) is a product decision, not a stack decision
3. The integration point is clear: LLM generates the config file content, Plop.js consumes it

**When to revisit:** After the first 2-3 feature generators are built manually and the wiring patterns are understood. The LLM's job is to produce a valid `calmdo.config.ts` -- the rest of the pipeline is deterministic.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Config format | TypeScript (`.ts`) | YAML | No autocompletion, requires parser, loses type safety |
| Config format | TypeScript (`.ts`) | JSON | No comments, no imports, no `satisfies` type checking |
| Config format | TypeScript (`.ts`) | JSON Schema | Overly complex for a config file; Zod already generates JSON Schema if needed via `.toJSONSchema()` |
| Code generation | Plop.js + custom actions | ts-morph | Overkill for initial templates. Add later only if file-modification (not file-creation) becomes a bottleneck. |
| Code generation | Plop.js + custom actions | Nx generators | Project explicitly avoids monorepo tooling (PROJECT.md: "Out of Scope"). |
| Code generation | Plop.js + custom actions | Custom Node scripts | Reinvents Plop's CLI, prompts, and template engine. |
| Runtime config | Convex `settings` table | Environment variables | Not reactive, not per-project, not user-configurable |
| Runtime config | Convex `settings` table | Config file on disk | Not reactive, requires redeployment, wrong for per-project settings |
| Wizard UI | TanStack Form + shadcn | react-step-wizard | Adds a dependency for something 20 lines of state management solves |
| Wizard UI | TanStack Form + shadcn | Formik | Already using TanStack Form. Two form libraries = confusion. |

---

## What NOT to Add

| Avoid | Why | The Temptation |
|-------|-----|----------------|
| ts-morph (for now) | Template-based generation is sufficient for creating new files. ts-morph shines at modifying existing files. | "We need AST manipulation for proper code generation" -- no, Handlebars conditionals handle feature flags fine. |
| JSON Schema / AJV | Zod v4 already validates configs. Adding JSON Schema adds a parallel validation system. | "Industry standard for config validation" -- Zod IS the standard in this stack. |
| Yeoman | Heavyweight, outdated. Plop is its spiritual successor with 1/10th the complexity. | "We need a more powerful generator framework" -- Plop's custom actions are powerful enough. |
| react-json-schema-form | Over-engineered for a 4-step wizard. The form structure is known at build time. | "Config-driven forms!" -- the wizard IS the config form, it doesn't need to be generated from config. |
| Prisma / Drizzle | Convex IS the database. Adding an ORM layer is architecturally wrong. | "We need schema migrations" -- Convex handles schema changes natively. |
| Feature flag service (LaunchDarkly, etc.) | Build-time feature assembly is not runtime feature flags. Different problem. | "Feature toggles!" -- PRODUCT.md mentions feature toggles, but those are simple booleans in the settings table, not a SaaS feature flag platform. |
| Turborepo / Nx | One codebase per client ("personal software"). Not a monorepo. Not a shared package ecosystem. | "We're generating multiple projects" -- each is standalone, not sharing code at build time. |

---

## Integration Points with Existing Stack

### Plop.js Extension Plan

```
plopfile.js (existing, 4 generators)
  |
  +-- gen:feature        (existing -- scaffold empty feature)
  +-- gen:route          (existing -- scaffold route file)
  +-- gen:convex-function (existing -- scaffold Convex function)
  +-- gen:form           (existing -- scaffold Zod schema + form)
  |
  +-- gen:calmdo         (NEW -- meta-generator)
  |     Reads calmdo.config.ts
  |     Validates with Zod
  |     Runs conditional Plop actions based on enabled features
  |     Generates: schema entries, queries, mutations, components,
  |                hooks, routes, tests, i18n files
  |
  +-- gen:calmdo-feature (NEW -- single CalmDo feature)
        Like gen:feature but CalmDo-aware
        Includes audit fields, auth guards, activity logging
```

### Zod Schema Hierarchy

```
src/shared/schemas/
  calmdo-config.ts      (NEW -- validates calmdo.config.ts)
  task.ts               (NEW -- task create/update schemas)
  project.ts            (NEW -- project create/update schemas)
  subtask.ts            (NEW -- subtask schemas)
  work-log.ts           (NEW -- work log schemas)
  settings.ts           (NEW -- runtime settings schemas)
  billing.ts            (existing)
  username.ts           (existing)
```

### Convex Schema Extension

```
convex/schema.ts        (existing -- add new table definitions)
  tasks                 (NEW)
  projects              (NEW)
  subtasks              (NEW)
  taskLinks             (NEW)
  workLogs              (NEW)
  activityLogs          (NEW)
  settings              (NEW -- runtime config)
```

### Template Structure

```
templates/                    (existing directory)
  feature/                    (existing templates)
  route/                      (existing templates)
  convex-function/            (existing templates)
  form/                       (existing templates)
  calmdo/                     (NEW)
    schema-table.ts.hbs       -- Convex table definition
    queries.ts.hbs            -- Queries with auth + scoping
    mutations.ts.hbs          -- Mutations with Zod + audit fields
    page.tsx.hbs              -- List/detail page component
    form.tsx.hbs              -- Create/edit form with Zod
    hook.ts.hbs               -- Data hook with TanStack Query
    route.tsx.hbs             -- Route with auth guard
    test.tsx.hbs              -- Integration test template
    i18n.json.hbs             -- Translation namespace
```

---

## Installation

```bash
# No new packages required.
# All capabilities come from extending existing tools.

# IF/WHEN ts-morph becomes necessary (for schema.ts modification):
# npm install -D ts-morph@^27.0.2
```

---

## Version Compatibility (New Concerns)

| Integration | Status | Notes |
|-------------|--------|-------|
| Plop.js custom actions + TypeScript config import | MEDIUM confidence | Plop runs in Node.js. Importing `.ts` config requires Node's `--experimental-strip-types` (Node 22+) or pre-compilation via `tsx`. Verify Node version or use `tsx` to load config. |
| Zod v4 discriminated unions for config | HIGH confidence | Zod v4 improved discriminated union support -- unions compose, O(1) discriminator lookup. Perfect for feature relationship modeling. |
| convex-helpers Zod v4 (`zod4` import) | HIGH confidence | PR #840 merged. Import from `convex-helpers/server/zod4`. |
| Convex `v.any()` for settings value | MEDIUM confidence | Works but bypasses Convex's type system. Must validate with Zod in mutations before storing. Test that `v.any()` round-trips complex objects correctly. |
| TanStack Form multi-step wizard | HIGH confidence | Well-documented pattern. Use `useForm` with step-specific `onSubmit`, accumulate state across steps. |

### Node.js Config Loading Strategy

The `calmdo.config.ts` file needs to be importable by the Plop custom action (a Node.js script). Options:

1. **tsx** (recommended) -- `npx tsx calmdo.config.ts` or use `tsx` as loader. Already common in the ecosystem, zero-config TypeScript execution.
2. **Node 22+ `--experimental-strip-types`** -- Native, no dependency, but requires Node 22+.
3. **Compile to .js first** -- Extra build step, stale output risk.

**Recommendation:** Use `tsx` as a dev dependency for config loading. It is the standard tool for running TypeScript in Node.js without compilation.

```bash
npm install -D tsx
```

This is the ONE new dev dependency. It enables `import("./calmdo.config.ts")` inside Plop custom actions.

**Confidence:** HIGH -- tsx is the standard TypeScript runner (13M+ weekly npm downloads).

---

## Sources

- [Plop.js documentation -- setActionType API](https://plopjs.com/documentation/) -- custom action functions for programmatic generation
- [Plop.js GitHub -- issue #103](https://github.com/plopjs/plop/issues/103) -- calling other actions from custom actions
- [ts-morph npm](https://www.npmjs.com/package/ts-morph) -- v27.0.2, TypeScript compiler API wrapper
- [ts-morph documentation](https://ts-morph.com/) -- AST manipulation capabilities
- [convex-helpers Zod v4 issue #558](https://github.com/get-convex/convex-helpers/issues/558) -- confirmed resolved, PR #840 merged
- [Zod v4 release notes -- discriminated unions](https://zod.dev/v4) -- composable unions, O(1) lookup
- [Zod v4 API -- defining schemas](https://zod.dev/api) -- discriminatedUnion, transform, pipe
- [Convex best practices](https://docs.convex.dev/understanding/best-practices/) -- schema design, index strategy
- [Convex data types](https://docs.convex.dev/database/types) -- v.any() behavior
- [shadcn/ui multi-step form patterns](https://github.com/shadcn-ui/ui/discussions/1869) -- stepper composition from existing components
- [TypeScript as config format (Reflect blog)](https://reflect.run/articles/typescript-the-perfect-file-format/) -- rationale for .ts over YAML/JSON

---
*Stack research for: CalmDo configurable feature assembly system*
*Researched: 2026-03-10*
