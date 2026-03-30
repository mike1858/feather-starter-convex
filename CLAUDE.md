# Project Conventions

## Design Principles

### The Tableau Standard: Smart Defaults, Open for Power Override

When designing any feature, config option, or user-facing decision: **infer from context first**, pick a sensible default that works for the common case, and **always allow power-user override**.

**Before asking a design question, apply this principle:**
1. What's the sensible default? (Infer from context — field type from data, single option = auto-select, etc.)
2. Can the user override it? (YAML config, parameter, environment variable, etc.)
3. If both answers are clear → **make the decision yourself**, document the default + override mechanism
4. Only ask when the sensible default is genuinely ambiguous or the override mechanism isn't obvious

**The anti-pattern (configuration death):** "Name this → pick data source → name that → configure columns → set permissions → choose layout." Every unnecessary question is friction. One config surface (YAML), no multi-step wizards, no right-click menus.

**The reference:** Tableau. Drag an Excel file with one tab → auto-imports (no "which tab?" question). Double-click a dimension → bar chart. It infers from context and only asks when genuinely ambiguous.

### Testing Philosophy (Universal)

All tests — backend, frontend, infrastructure, generators, CLI, tooling — must follow the testing philosophy in [`feather-testing-convex/TESTING-PHILOSOPHY.md`](https://github.com/siraj-samsudeen/feather-testing-convex/blob/main/TESTING-PHILOSOPHY.md).

**Core principles that apply to ALL test types:**
- **Test behavior, not implementation** — assert outcomes and state changes, not that specific mocks were called
- **Integration-first** — prefer tests that exercise real code paths over mocked ones. Mock only at system boundaries (external APIs, network, filesystem in unit tests)
- **MECE test decomposition** — test cases should be Mutually Exclusive, Collectively Exhaustive. No overlapping tests, no gaps
- **No `v8 ignore` as substitute for real tests** — if code has logic (conditionals, error paths, event handlers), it must be tested
- **Each test independent and self-contained** — no test should depend on another test's state or execution order

**For infrastructure/tooling (generators, CLI, AST wiring, YAML validation):**
- Test the **output**, not the internal steps — e.g., generator test should verify the generated file contents, not that template engine was called
- Use real file I/O with temp directories, not mocked filesystems — these tests verify real behavior
- Test error cases: malformed input, missing files, invalid config
- Test idempotency: running the same operation twice should produce the same result

**Every phase plan must include an explicit task:** "Review tests against testing philosophy" — tracked, not optional.

## Architecture

Feature-folder architecture. Each domain has a frontend folder and a backend folder:
- Frontend: `src/features/{name}/components/`, `hooks/`, `index.ts` (barrel export)
- Backend: `convex/{name}/queries.ts`, `mutations.ts`, `actions.ts`
- Routes: `src/routes/_app/_auth/dashboard/_layout.{name}.tsx` — thin wrappers (under 20 lines) that import from features

Shared code in `src/shared/`: schemas, hooks, utils, nav items, error constants.

### Frontend Features

auth, dashboard, onboarding, settings, uploads, tasks, projects, subtasks, work-logs, activity-logs

### Backend Domains

tasks, projects, subtasks, work-logs, activity-logs, auth, devEmails, email, onboarding, otp, password, uploads, users

### Shared Schemas (`src/shared/schemas/`)

tasks.ts, projects.ts, subtasks.ts, work-logs.ts, activity-logs.ts, username.ts

## Path Aliases

- `@/*` → `./src/*` (frontend code)
- `@cvx/*` → `./convex/*` (backend code)
- `~/*` → `./*` (project root)

## Adding a New Entity

1. **Spec file** — create `src/features/{name}/feather.yaml` defining fields, behaviors, views, relationships, indexes (see `src/features/tasks/feather.yaml` for reference)
2. **Generator** — run `npm run gen:feature` which reads the `feather.yaml` and generates schema, backend, frontend, route, tests, and i18n files
3. **Zod schema** — generated at `src/shared/schemas/{name}.ts`, review and adjust
4. **Schema table** — update `convex/schema.ts` with `zodToConvex()` to derive Convex validators from Zod schemas (don't duplicate validation logic)
5. **Wiring (manual):**
   - Nav entry → append to `src/shared/nav.ts`
   - i18n namespace → append to `ns` array in `src/i18n.ts`
   - Translations → `public/locales/{en,es}/{name}.json`
   - Error constants → add group to `src/shared/errors.ts`

### Available Generators

| Command | Purpose |
|---------|---------|
| `npm run gen:feature` | Full CRUD feature from `feather.yaml` spec |
| `npm run gen:schema` | Zod schema + update `convex/schema.ts` |
| `npm run gen:backend` | Convex mutations, queries, and tests |
| `npm run gen:frontend` | Frontend components, route, and wiring |
| `npm run gen:route` | Route file (with optional auth guard) |
| `npm run gen:convex-function` | Single Convex query/mutation/action |

Generator infrastructure: `plopfile.js` (entry), `generators/*.js` (ESM with JSDoc types), `generators/utils/*.js` (helpers), `templates/feature/` (26 Handlebars templates), `templates/defaults.yaml` (field/behavior defaults).

## Backend Patterns

```typescript
// Convex imports use @cvx/ alias
import { mutation, query } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { internal } from "@cvx/_generated/api";

// Zod-validated mutation (for user-typed input — strings, numbers, booleans)
import { zCustomMutation } from "convex-helpers/server/zod4";
import { NoOp } from "convex-helpers/server/customFunctions";
const zMutation = zCustomMutation(mutation, NoOp);

// Derive Convex validators from Zod (in schema.ts)
import { zodToConvex } from "convex-helpers/server/zod4";
const myValidator = zodToConvex(myZodSchema);
```

### zCustomMutation Gotcha

Do NOT mix `v.id()` (Convex validator) inside Zod `.extend()` calls — this causes runtime errors. Use `zMutation` for mutations with pure user-typed input (create forms). Use plain `mutation` with Convex validators (`v.id()`, `v.string()`, etc.) for mutations that take document IDs as args (update, delete, assign).

Pattern in practice (see `convex/tasks/mutations.ts`):
- `create` → `zMutation` with Zod-validated args (title, description, priority)
- `update`, `remove`, `assign` → plain `mutation` with `v.id("tasks")` args

## Auth System

- `@convex-dev/auth` with three providers: Password, OTP (email code), GitHub OAuth
- Password provider uses named import: `import { Password } from "@convex-dev/auth/providers/Password"`
- Password reset uses provider id `"password-reset"` (not `"resend-otp"`) to avoid collision with the OTP provider
- Email delivery via Resend (`convex/otp/ResendOTP.ts`, `convex/password/ResendOTPPasswordReset.ts`)
- Auth config: `convex/auth.ts`, `convex/auth.config.ts`
- Auth tables auto-created by `authTables` spread in `convex/schema.ts`

### Dev Mailbox

Dev environment: OTP and password-reset emails are intercepted and stored in `devEmails` table, viewable at `/dev/mailbox` route. Gated by `DEV_MAILBOX` env var — defaults to enabled (only `"false"` disables interception).

## Testing Patterns

- 489 tests across 59 test files, 100% coverage enforced by pre-commit hook
- Backend tests: `convex/{name}/*.test.ts` using `feather-testing-convex` with `test` fixture from `@cvx/test.setup`
- Frontend tests: `src/features/{name}/{name}.test.tsx` using Testing Library with `renderWithRouter` from `@/test-helpers` and `ConvexTestClient` from `feather-testing-convex`
- Tests are co-located with source (not in a separate `tests/` directory)
- Run `npm test` to verify (must pass with 100% coverage)

## Extension Points (append-only for clean git merges)

- `src/shared/nav.ts` — `navItems` array
- `src/shared/errors.ts` — `ERRORS` object groups
- `src/i18n.ts` — `ns` namespace array

## Constraints

- `convex/schema.ts` must stay at convex root (Convex requirement)
- Route files must stay in `src/routes/` with TanStack Router naming conventions
- Reorganizing `convex/` changes all `api.*` paths — update all frontend calls in lockstep

<!-- GSD:profile-start -->
## Developer Profile

> Generated by GSD from session_analysis. Run `/gsd:profile-user --refresh` to update.

| Dimension | Rating | Confidence |
|-----------|--------|------------|
| Communication | detailed-structured | HIGH |
| Decisions | fast-intuitive | HIGH |
| Explanations | detailed | HIGH |
| Debugging | hypothesis-driven | MEDIUM |
| UX Philosophy | pragmatic | MEDIUM |
| Vendor Choices | opinionated | HIGH |
| Frustrations | scope-creep | HIGH |
| Learning | self-directed | MEDIUM |

**Directives:**
- **Communication:** Match message length to context: respond concisely to terse commands, provide structured detail when the developer asks design or architecture questions. Never over-explain in response to short imperative messages.
- **Decisions:** Present options concisely with clear labels (A/B/C or numbered). Expect immediate selection. When presenting trade-offs, lead with a recommendation -- this developer decides fast and appreciates a clear default to accept or override.
- **Explanations:** Always explain the 'why' and present pros/cons when offering options or making decisions. Keep explanations focused and non-verbose, but prioritize understanding over brevity. When introducing unfamiliar concepts, include doc/blog URLs for deeper understanding. Lead with code when implementing, but follow with the reasoning behind key choices.
- **Debugging:** When this developer reports a problem, they have usually already diagnosed it. Validate their hypothesis, then fix. Do not start from scratch with basic debugging steps -- meet them at their level of analysis.
- **UX Philosophy:** Apply the Tableau Standard: infer sensible defaults, minimize configuration steps, and always allow power-user override. Focus on usability and developer experience over visual polish. When building features, optimize for 'works out of the box' with zero setup friction.
- **Vendor Choices:** Respect this developer's established tool choices -- they have strong, experience-based preferences. Do not suggest alternative libraries for areas where they have already chosen (feather-testing, Convex, TanStack). When new tool decisions arise, present options but expect them to have a strong opinion. Never default to popular choices over their stated preferences.
- **Frustrations:** Stay strictly within the stated request -- do not add unrequested features or take shortcuts. Never exclude code from coverage, skip verification steps, or modify scope without explicit permission. When in doubt about scope, ask. Repeat back the requirement before executing if the task is complex.
- **Learning:** Answer targeted questions directly without unnecessary preamble. This developer investigates independently and comes with specific questions -- provide precise answers at their level. When introducing unfamiliar concepts or tools, include doc/blog/video URLs for deeper understanding.
<!-- GSD:profile-end -->
