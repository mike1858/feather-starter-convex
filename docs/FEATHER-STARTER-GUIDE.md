# Feather Starter (Convex) — New Developer Guide

This guide covers what you need to know to be productive on this codebase. Read it once, then use it as a reference.

---

## 1 — What this repository is

**Feather Starter (Convex)** is a full-stack SaaS starter combining React 19 (Vite), a Convex backend, and opinionated conventions so code lands in predictable places.

### Purpose

Build and maintain real product features (tasks, projects, auth, settings, etc.) on a stack that already includes routing, forms, validation, i18n, email flows, and strict testing. The goal is **developer velocity**: less time deciding where files go, more time shipping behavior.

### What ships in the box

- **Authenticated app shell** — dashboard layout, data-driven navigation, protected routes.
- **Auth** — Convex Auth with password, email OTP, and optional GitHub OAuth.
- **Domains** — task/project/subtask/work-log/activity-log features with Convex queries/mutations and React UI; plus onboarding, settings, uploads, and a dev mailbox.
- **Generators** — Plop-based CLI (`npm run gen:*`) that scaffold from per-feature `feather.yaml` specs.
- **Plugins** — optional features delivered as git branches you merge (billing, command palette, etc.).
- **Strict quality bar** — Vitest with 100% coverage enforced by pre-commit hooks (1186 tests across 101 files). E2E tests use Playwright with a Phoenix Test-inspired fluent Session DSL (`feather-testing-core`).

### When this repo is a strong fit

You want Convex + React, shared Zod validation, YAML-driven scaffolding, and strict test discipline without assembling those pieces yourself.

---

## 2 — Architecture: frontend ↔ backend

### Directory layout

```
src/features/{name}/     Frontend feature (components, hooks, barrel index.ts, tests, feather.yaml)
src/routes/              TanStack Router file-based routes (thin wrappers)
src/shared/              Zod schemas, nav config, error constants, shared hooks/utils
src/ui/                  Shadcn-style primitives (Button, Input, Sheet, Select, etc.)
src/custom/              User customization directory (survives generator re-runs)
convex/{name}/           Backend domain (queries.ts, mutations.ts, actions.ts, tests)
convex/custom/           User customization directory for backend code
convex/schema.ts         Convex schema entrypoint (required at convex root)
```

### UI primitives (`src/ui/`)

Shared shadcn-style components: `Button`, `Input`, `Sheet`, `Select`, `DropdownMenu`, `Switch`, `Header`, `Logo`, `LanguageSwitcher`, `ThemeSwitcher`. Reuse these across features instead of building new primitives. Use the `cn()` utility from `src/ui/button-util.ts` for class merging (tailwind-merge + clsx).

### Custom directories (`src/custom/`, `convex/custom/`)

These directories are **yours** — the generator never touches them. Put durable business logic, custom hooks, or extensions here instead of in generated files. This is the cleanest alternative to marked custom regions when you need a full module.

### How the two sides connect

The app uses the generated Convex API (`convex/_generated/api`) with paths like `api.tasks.mutations.create`. The React side uses Convex's React client so queries, subscriptions, and mutations go through typed entrypoints.

**Key rule:** Renaming or moving folders under `convex/` changes `api.*` paths. Update every frontend call site in lockstep.

### Path aliases

| Alias    | Maps to                                  |
| -------- | ---------------------------------------- |
| `@/*`    | `./src/*` (frontend features and shared) |
| `@cvx/*` | `./convex/*` (backend modules)           |
| `~/*`    | `./*` (project root)                     |

### Where "truth" lives

- **Field validation** → Zod schemas in `src/shared/schemas/`
- **Database tables/indexes** → `convex/schema.ts`
- **Navigation** → `src/shared/nav.ts`
- **Error constants** → `src/shared/errors.ts`
- **i18n namespaces** → `src/i18n.ts`, strings in `public/locales/{en,es}/`
- **Site metadata** → `site.config.ts` (title, description, favicon, OG image)

### Summary

**Features implement behavior. Routes point at features. Shared holds cross-cutting contracts. Convex domains implement persistence and auth. The generated `api` is the seam between UI and backend.**

---

## 3 — Feature YAML and generators

### Two kinds of `feather.yaml`

|                  | Root (`feather.yaml`)                                     | Per-feature (`src/features/{name}/feather.yaml`)               |
| ---------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| **Purpose**      | Product manifest: app name, modules, i18n, auth providers | Spec for one domain: fields, views, behaviors → drives codegen |
| **Who reads it** | Tooling that cares about the whole product                | Plop generators, `feather validate`                            |

### Generator commands

| Script                | What it does                                                      |
| --------------------- | ----------------------------------------------------------------- |
| `gen:feature`         | Full vertical slice from per-feature YAML (or interactive wizard) |
| `gen:schema`          | Zod schema + update `convex/schema.ts`                            |
| `gen:backend`         | Convex mutations, queries, and tests                              |
| `gen:frontend`        | React components, route, and wiring                               |
| `gen:route`           | TanStack route file (with optional auth guard)                    |
| `gen:convex-function` | Single Convex query/mutation/action                               |

### Typical new-entity flow

1. Copy a mature spec (e.g. `src/features/tasks/feather.yaml`) → `src/features/<kebab-name>/feather.yaml`
2. Edit the YAML to define your fields, views, relationships
3. Validate: `npx tsx bin/feather.ts validate src/features/<name>/feather.yaml`
4. Generate: `npm run gen:feature -- --yamlPath src/features/<name>/feather.yaml`
5. Run `npx convex dev` and `npm test`
6. Hand-fix anything the spec cannot express

### What the generator does

Plop reads your feature YAML, merges with `templates/defaults.yaml`, generates 26+ files (schema, backend, frontend, route, tests, i18n), and auto-wires 5 shared files:

- `convex/schema.ts` — adds table definition
- `src/shared/nav.ts` — appends nav entry
- `src/shared/errors.ts` — appends error group
- `src/i18n.ts` — appends namespace
- `public/locales/{en,es}/{name}.json` — creates locale files

### Feather CLI

`npx tsx bin/feather.ts` supports: `validate`, `generate`, `update`, `init`, `add`, `remove`. `validate` is the most common alongside hand-edited YAML.

### `/feather:architect` skill

An AI-assisted domain modeling workflow (`.claude/skills/feather-architect.md`) that guides you through 4 phases — entity discovery, schema definition, behavior overlay, and validation — to produce `feather.yaml` files from plain English descriptions. Useful when designing multiple related entities from scratch. Not required; hand-editing YAML is normal for small changes.

---

## 4 — Marked custom regions (re-run safety)

Generators use `smartAdd` — on re-runs, they **only preserve code inside marked custom regions**:

```
// TS:     // @custom-start key  ...  // @custom-end key
// JSX:    {/* @custom-start key */}  ...  {/* @custom-end key */}
```

**Rule:** If your code is outside these markers, assume it will be overwritten on regeneration. Put durable business logic inside marked regions (if the template defines them) or in separate files the generator doesn't touch.

Wiring files (`nav.ts`, `errors.ts`, `i18n.ts`) use append logic that may not be perfectly idempotent across repeated runs — review diffs after regeneration.

---

## 5 — Day-to-day commands

### Run the app

```sh
npm run dev        # Vite + Convex dev in parallel
```

### Quality gates

```sh
npm test           # Vitest (single run)
npm run test:watch # Vitest in watch mode
npm run typecheck  # App + Node + Convex TypeScript
npm run lint       # ESLint
```

### "What do I run when?"

| Situation                  | Commands                                                          |
| -------------------------- | ----------------------------------------------------------------- |
| Daily dev                  | `npm run dev`                                                     |
| After YAML edits           | `feather validate`, regen if needed, `npx convex dev`, `npm test` |
| After codegen / DB changes | `npx convex dev`, `npm test`                                      |
| Before push                | `npm test`, `npm run typecheck`                                   |

### Other useful scripts

- `npm run setup` / `npx tsx scripts/setup.ts` — branding customization
- `bash scripts/plugin.sh list` — list available plugin branches
- `npm run test:e2e` — Playwright E2E tests

---

## 6 — Auth and email

### Auth providers

Three providers via `@convex-dev/auth`:

1. **Password** — email + password with password reset
2. **Email OTP** — one-time code via email
3. **GitHub OAuth** — social login (optional)

Config: `convex/auth.ts` and `convex/auth.config.ts`. Auth state: `convex/users/queries.ts` (`getCurrentUser`).

### Email

Production email via Resend. Set `AUTH_RESEND_KEY` in the Convex dashboard.

### Dev mailbox

In dev, emails are intercepted into the `devEmails` table. View at `/dev/mailbox`. Defaults to on; set `DEV_MAILBOX=false` to disable.

### Gotchas

- Password reset provider id is `"password-reset"` (not `"resend-otp"`) to avoid collision with the OTP provider.
- Password provider uses a **named import**: `import { Password } from "@convex-dev/auth/providers/Password"` (not default export).

---

## 7 — Testing

### Stack

- **Vitest** with v8 coverage (100% threshold enforced by pre-commit hook)
- **Frontend:** `feather-testing-core` fluent Session DSL + `feather-testing-convex` providers
- **Backend:** `feather-testing-convex` with `test` fixture from `@cvx/test.setup`
- **E2E:** Playwright (`npm run test:e2e`)

### Layout

Tests are co-located with source:

- `convex/{domain}/*.test.ts` — backend tests
- `src/features/{name}/*.test.tsx` — frontend tests

### Test fixture (`test` from `@cvx/test.setup`)

Both frontend and backend tests use the same `test` fixture from `convex/test.setup.ts`. It provides:

- **`client`** — a `ConvexTestClient` for calling queries/mutations (used by `renderWithRouter` and backend tests)
- **`userId`** — an authenticated user ID, automatically set up per test
- **`testClient`** — for direct database access: `await testClient.run(async (ctx) => { ctx.db.insert(...) })` to seed data or assert state
- **`seed(table, data)`** — shorthand for inserting test data, returns the new document ID
- **`createUser()`** — creates a second authenticated user, returns `{ userId, client }`

Backend tests call mutations/queries via `client` and verify database state via `testClient.run()`. Frontend tests pass `client` to render helpers.

### Frontend testing: `renderWithRouter`

All frontend tests use `renderWithRouter(ui, client, options?)` from `src/test-helpers.tsx`. This renders with:

- **Real TanStack Router** (memory history, catch-all route) — so `<Link>`, `useNavigate()`, `useRouter()` all work
- **Real Convex context** (`ConvexTestQueryAuthProvider`) — so `useQuery(convexQuery(...))`, `useConvexMutation(...)`, `useConvexAuth()`, and `useAuthActions()` all work
- **Zero mocks**

Options: `{ authenticated?: boolean, initialPath?: string }` — defaults to authenticated at `/`.

```tsx
import { renderWithRouter } from "@/test-helpers";

test("shows empty state", async ({ client }) => {
  renderWithRouter(<TasksPage />, client);
  expect(await screen.findByText("No tasks yet.")).toBeInTheDocument();
});
```

### Test matrix convention

Test files start with a comment matrix mapping each test case to its scenario. See `convex/tasks/mutations.test.ts` or `src/features/tasks/tasks.test.tsx` for examples.

### Coverage

100% threshold on statements, branches, functions, and lines. Some paths are intentionally excluded: thin route wrappers, barrel files, Radix portal components, dnd-kit components, generated scaffold components, and the example apps (todos/tickets/contacts). See `vitest.config.ts` for the full include/exclude lists.

### Philosophy

- Test **behavior and outcomes**, not implementation
- **Integration-first**; mock only at system boundaries
- **MECE** — no redundant overlap, no gaps
- Each test **independent** — no order dependence

### Pre-commit hooks (`lefthook.yml`)

Each commit runs typecheck + full test suite with coverage. Failing either blocks the commit.

---

## 8 — Convex backend patterns

### Schema

`convex/schema.ts` uses `defineSchema`/`defineTable`. Zod enums are converted via `zodToConvex()` from `convex-helpers/server/zod4`. Auth tables are spread from `@convex-dev/auth/server`.

### Mutation pattern

```typescript
// Create (user-typed input) → use zMutation with Zod validation
import { zCustomMutation } from "convex-helpers/server/zod4";
import { NoOp } from "convex-helpers/server/customFunctions";
const zMutation = zCustomMutation(mutation, NoOp);

// Update/Delete (document IDs) → use plain mutation with v.id()
```

**Critical:** Do NOT mix `v.id()` validators inside Zod `.extend()` — this causes runtime errors. Use `zMutation` for form-shaped input, plain `mutation` with Convex validators for ID-centric operations.

### Authorization

All queries/mutations get userId via `auth.getUserId(ctx)` and return early if not authenticated. Activity logging via `logActivity()` from `@cvx/activityLogs/helpers`.

---

## 9 — Plugins and extension points

### Plugin model

Plugins are **git branches** (e.g. `plugin/billing`, `plugin/ui-command-palette`), not npm packages.

```sh
bash scripts/plugin.sh list                        # List remote plugin branches
bash scripts/plugin.sh preview plugin/billing       # Show diff vs main
bash scripts/plugin.sh install plugin/billing        # Merge into current branch
```

### Extension points (append-only)

When adding features or installing plugins, changes append to these surfaces to minimize merge conflicts:

- `src/shared/nav.ts` — `navItems` array (navigation entries)
- `src/shared/errors.ts` — `ERRORS` object (error constant groups)
- `src/i18n.ts` — `ns` array (namespace list)

---

## 10 — Shared schemas: Zod ↔ Convex

### Single source of truth

Field validation lives in `src/shared/schemas/` (Zod v4). The same schema drives:

- Frontend form validation (quick UI feedback)
- Backend validation (server-enforced correctness)

This prevents drift where the UI accepts something the backend rejects.

### The split

- User-typed input (strings, numbers, booleans) → Zod-validated mutations (`zMutation`)
- Document IDs → Convex validators (`v.id("tableName")`)
- Don't mix them

### Schema rule

`convex/schema.ts` must stay at the Convex root (Convex requirement). When adding tables or changing relationships, update `convex/schema.ts` and keep Zod + Convex aligned.

---

## 11 — Deployment

1. Build frontend: `npm run build`
2. Deploy Convex: `npx convex deploy`
3. Deploy static frontend: Vercel / Netlify / Cloudflare Pages (Netlify config in `netlify.toml`)
4. Set `VITE_CONVEX_URL` in your hosting environment

Vendor-specific details and swap guides in `PROVIDERS.md`.

---

## 12 — Practical checklist

### Adding a new entity

1. Create `src/features/{name}/feather.yaml` (copy from an existing feature)
2. `npx tsx bin/feather.ts validate src/features/{name}/feather.yaml`
3. `npm run gen:feature -- --yamlPath src/features/{name}/feather.yaml`
4. `npx convex dev` — refresh generated types
5. `npm test` — verify tests pass
6. Hand-fix business logic, put durable code in marked custom regions

### Modifying an existing feature

1. Edit `src/features/{name}/feather.yaml` and/or source code
2. If YAML changed: validate, then regenerate (review diffs for overwritten code)
3. `npx convex dev` + `npm test`
4. Check wiring surfaces: `nav.ts`, `errors.ts`, `i18n.ts`, `public/locales/*`

### Before pushing

1. `npm test` — must pass
2. `npm run typecheck` — must pass

### Common pitfalls

- Edits outside marked custom regions get overwritten on re-generation
- Renaming Convex folders breaks `api.*` paths — update frontend in lockstep
- Zod and Convex validators drifting — keep schemas aligned
- Wiring files may duplicate on repeated generator runs — review diffs

### Troubleshooting

| Problem                                    | Fix                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| YAML validation fails                      | Fix the field/shape the validator points to, re-validate                      |
| Types don't line up after generation       | `npx convex dev` then `npm run typecheck`                                     |
| Custom code disappeared after regen        | Move it into marked custom regions (`@custom-start`/`@custom-end`)            |
| Wiring files duplicated                    | Inspect `nav.ts`, `errors.ts`, `i18n.ts`, clean up manually                   |
| Things broke after renaming Convex folders | Update all `api.*` references in frontend, then `npx convex dev` + `npm test` |
