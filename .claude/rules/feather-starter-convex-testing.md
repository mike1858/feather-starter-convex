> **Testing philosophy:** See [feather-testing-convex/TESTING-PHILOSOPHY.md](https://github.com/siraj-samsudeen/feather-testing-convex/blob/main/TESTING-PHILOSOPHY.md). This file covers project-specific setup only.

# feather-starter-convex — Testing

## Test Environment

| Context | Environment | Config |
|---------|------------|--------|
| Frontend (`src/`) | `jsdom` | `vitest.config.ts` |
| Backend (`convex/`) | `edge-runtime` | `environmentMatchGlobs` in vitest config |
| Generators/CLI (`generators/`, `bin/`, `lib/`) | `node` | `environmentMatchGlobs` in vitest config |
| E2E (`e2e/`) | Chromium (Playwright) | `playwright.config.ts` |

## Coverage — 100% Required

Thresholds: statements, branches, functions, lines — all 100%. Enforced by `vitest run --coverage`.

Coverage is glob-based (see `vitest.config.ts` → `coverage.include` / `coverage.exclude`). When adding new files, verify they're captured by existing globs or add them.

## Backend Tests (`convex/{name}/*.test.ts`)

```typescript
import { test } from "@cvx/test.setup";  // createConvexTest(schema, modules)

test("should create task", async ({ mutation, query, auth }) => {
  const asUser = await auth.getUserIdentity();
  // mutation/query are typed to your schema
  const id = await mutation(api.tasks.mutations.create, { title: "Test" });
  const task = await query(api.tasks.queries.get, { id });
  expect(task.title).toBe("Test");
});
```

`feather-testing-convex` provides `createConvexTest` which sets up an in-memory Convex backend with your schema and modules. The `test` fixture gives typed `mutation`, `query`, `auth` helpers.

## Frontend Tests (`src/features/{name}/{name}.test.tsx`)

```typescript
import { renderWithRouter } from "@/test-helpers";
import { ConvexTestClient } from "feather-testing-convex";
import schema from "@cvx/schema";

const client = new ConvexTestClient(schema);

test("renders component", async () => {
  const { getByText } = renderWithRouter(<MyComponent />, client, {
    authenticated: true,
    initialPath: "/dashboard/tasks",
  });
});
```

`renderWithRouter` wraps the component in TanStack Router + ConvexTestQueryAuthProvider. No mocking needed for Convex queries, mutations, auth, or routing.

## E2E Tests (`e2e/`)

- Playwright with Chromium, `baseURL: http://localhost:5173`
- Run: `npm run test:e2e` (auto-starts dev server via `webServer` config)
- Fixtures in `e2e/fixtures.ts`, helpers in `e2e/helpers.ts`

## Inline Coverage Ignores

Use `/* v8 ignore start */` / `/* v8 ignore stop */` for code that's unreachable in test (e.g., `import.meta.env.DEV` branches). Always add a comment explaining why.
