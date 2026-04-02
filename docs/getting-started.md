# Getting Started with Feather Starter

A guide for developers (and their AI coding assistants) to go from zero to a running app.

---

## What You Get

Feather Starter is a full-stack SaaS starter kit. Out of the box:

| Layer | What's Included |
|-------|----------------|
| **Frontend** | React 19, TanStack Router/Query/Form, Tailwind v4, Radix UI primitives, i18n (en/es) |
| **Backend** | Convex serverless DB + functions, Zod v4 shared validation, `zodToConvex()` bridge |
| **Auth** | Email/password, email OTP, GitHub OAuth via `@convex-dev/auth`, dev mailbox |
| **Code Gen** | YAML-driven generators (`npm run gen:feature`) that scaffold full CRUD features |
| **CLI** | `feather` CLI for validation, generation, adding features/bundles, import |
| **Testing** | Vitest (1186 tests, 100% coverage), Playwright E2E (10 specs), pre-commit hooks |
| **Example Apps** | Todos, Tickets, Contacts — installable via `feather add` |

### Built-in Features

| Feature | Route | What It Does |
|---------|-------|-------------|
| Dashboard | `/dashboard` | Landing page with data-driven navigation |
| Tasks | `/dashboard/tasks` | Full task management: create, edit, assign, status workflow, drag-reorder |
| Team Pool | `/dashboard/team-pool` | Shared tasks visible to all team members |
| Projects | `/dashboard/projects` | Project CRUD with status lifecycle, task counts |
| Subtasks | (via task detail panel) | Child tasks within a task, promotion to full task |
| Work Logs | (via task detail panel) | Time tracking entries per task |
| Activity Logs | (automatic) | Auto-generated audit trail for all entities |
| Import | `/dashboard/import` | Excel file import wizard with schema inference |
| Settings | `/dashboard/settings` | User profile, avatar upload, username |
| Dev Mailbox | `/dev/mailbox` | Captured OTP/reset emails (dev only) |

### Example Apps (Installed)

These are already installed in the starter. They demonstrate the generator output:

| App | Route | Complexity | Fields |
|-----|-------|-----------|--------|
| Todos | `/dashboard/todos` | Simple | title, completed |
| Tickets | `/dashboard/tickets` | Intermediate | title, description, status (open/in_progress/resolved/closed), priority |
| Contacts | `/dashboard/contacts` | Intermediate | name, email, company, status (lead/active/inactive), phone |

---

## Prerequisites

- **Node.js 18+** and npm
- **Convex account** — free at [convex.dev](https://convex.dev)
- **Resend account** — free at [resend.com](https://resend.com) (for email OTP and password reset)

Optional:
- GitHub OAuth app (for social login)

---

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/siraj-samsudeen/feather-starter-convex.git my-app
cd my-app
npm install
```

### 2. Set Up Convex

```bash
npx convex dev --once
npx @convex-dev/auth
```

> **Warning:** Do NOT use `--configure=new` — it overwrites `convex/tsconfig.json` and breaks path aliases. If you already ran it, restore with `git restore convex/tsconfig.json`.

### 3. Configure Email (Required for Auth)

In the Convex dashboard, set:

```bash
npx convex env set AUTH_RESEND_KEY re_your_key_here
```

GitHub OAuth (optional):
```bash
npx convex env set AUTH_GITHUB_ID your_client_id
npx convex env set AUTH_GITHUB_SECRET your_client_secret
```

### 4. Start Development

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173). This runs Vite (frontend) and Convex dev (backend) in parallel.

### 5. Verify Everything Works

```bash
npm test              # 1186 tests, 100% coverage
npm run typecheck     # 3 tsconfig passes
npm run test:e2e      # 10 Playwright specs (auto-starts dev server)
```

---

## Project Structure

```
feather-starter-convex/
  convex/                        # Backend (Convex serverless functions)
    {domain}/                    #   queries.ts, mutations.ts, actions.ts, *.test.ts
    schema.ts                    #   Database schema (single source of truth)
    auth.ts, auth.config.ts      #   Auth configuration
    test.setup.ts                #   Shared test fixture
  src/
    features/{name}/             # Frontend feature folders
      components/                #   React components
      feather.yaml               #   Feature spec (drives code generation)
      index.ts                   #   Barrel export
      {name}.test.tsx            #   Feature tests
    routes/                      # TanStack Router (thin wrappers, <20 lines)
    shared/                      # Cross-feature code
      schemas/                   #   Zod schemas (shared frontend ↔ backend)
      nav.ts                     #   Navigation items (append-only)
      errors.ts                  #   Error constants (append-only)
    ui/                          # Radix UI primitives (Button, Input, Sheet, etc.)
    custom/                      # Your code — generators never touch this
  convex/custom/                 # Your backend code — generators never touch this
  templates/
    feature/                     # 26 Handlebars templates for code generation
    features/{todos,tickets,contacts}/  # Example app source files
    pipeline/                    # Modern generation pipeline (ts-morph)
    defaults.yaml                # Generator defaults (field types, behaviors, views)
  bin/                           # Feather CLI source
  scripts/create/                # Project creation wizard (create-feather)
  e2e/                           # Playwright E2E tests
  public/locales/{en,es}/        # i18n translation files
```

### Path Aliases

| Alias | Maps To | Use In |
|-------|---------|--------|
| `@/*` | `./src/*` | Frontend code |
| `@cvx/*` | `./convex/*` | Backend code |
| `~/*` | `./*` | Project root |

---

## Adding Your Own Features

### Option A: YAML-Driven Generation (Recommended)

1. **Create a feature spec:**

   Copy an existing spec as a starting point:
   ```bash
   cp src/features/tasks/feather.yaml src/features/invoices/feather.yaml
   ```

2. **Edit the YAML** to define your entity's fields, views, behaviors:

   ```yaml
   name: invoices
   label: Invoice
   fields:
     - name: number
       type: string
       required: true
     - name: amount
       type: number
       required: true
     - name: status
       type: enum
       options: [draft, sent, paid, overdue]
       default: draft
     - name: dueDate
       type: string
   behaviors:
     timestamps: true
     softDelete: true
   views:
     default: list
     list: true
     table: true
   ```

3. **Validate:**
   ```bash
   npx tsx bin/feather.ts validate src/features/invoices/feather.yaml
   ```

4. **Generate:**
   ```bash
   npm run gen:feature -- --yamlPath src/features/invoices/feather.yaml
   ```

   This creates 26+ files: Zod schema, Convex queries/mutations with tests, React components, route, i18n files, and auto-wires nav.ts, errors.ts, schema.ts, i18n.ts.

5. **Refresh Convex types and verify:**
   ```bash
   npx convex dev --once
   npm test
   ```

### Option B: Granular Generators

| Command | What It Generates |
|---------|------------------|
| `npm run gen:schema` | Zod schema only |
| `npm run gen:backend` | Convex queries + mutations only |
| `npm run gen:frontend` | React components only |
| `npm run gen:route` | Route file (with optional auth guard) |
| `npm run gen:convex-function` | Single Convex query/mutation/action |

### Option C: Feather CLI

```bash
npx tsx bin/feather.ts validate <yaml-path>    # Validate YAML spec
npx tsx bin/feather.ts generate <name>         # Generate from YAML
npx tsx bin/feather.ts add <name>              # Install feature or bundle
npx tsx bin/feather.ts remove <name>           # Remove a feature
npx tsx bin/feather.ts list                    # List available features/bundles
npx tsx bin/feather.ts update                  # Update generated code after schema changes
npx tsx bin/feather.ts stats                   # Show project statistics
```

### Option D: AI-Assisted Design

Use the `/feather:architect` skill (requires Claude Code) to design entities from plain English. It guides you through entity discovery, schema definition, behavior overlay, and YAML generation.

---

## Working with an AI Agent

Feather Starter is designed for the human+agent workflow. The project includes:

### For the Agent

- **`CLAUDE.md`** — Comprehensive project instructions: architecture, patterns, conventions, gotchas
- **`.claude/rules/`** — Modular rules for project structure and testing
- **`feather.yaml` specs** — Machine-readable feature definitions the agent can read and generate from
- **`templates/defaults.yaml`** — Default field/behavior/view settings the agent should respect

### Recommended Workflow

1. **You describe what you want** in plain English
2. **The agent reads `feather.yaml` examples** and creates a spec for your entity
3. **The agent runs `npm run gen:feature`** to scaffold everything
4. **The agent customizes** the generated code for your specific business logic
5. **The agent runs `npm test`** to verify 100% coverage
6. **You review** the result in the running app

### What the Agent Should Know

- Generator output goes in `src/features/{name}/` and `convex/{name}/`
- Custom code goes in `src/custom/` and `convex/custom/` (never overwritten)
- Or inside marked custom regions: `// @custom-start key` ... `// @custom-end key`
- After any code generation, run `npx convex dev --once` then `npm test`
- Pre-commit hooks enforce typecheck + 100% coverage — commits are blocked if either fails
- Don't mix `v.id()` validators inside Zod `.extend()` — use `zMutation` for user input, plain `mutation` for ID-centric operations

---

## Testing

### Test Stack

| Type | Tool | Count | Command |
|------|------|-------|---------|
| Unit + Integration | Vitest | 1186 tests across 101 files | `npm test` |
| E2E | Playwright | 10 spec files | `npm run test:e2e` |
| Coverage | v8 | 100% enforced | Automatic with `npm test` |

### Test Layout

Tests are co-located with source:
- `convex/{domain}/*.test.ts` — Backend tests (edge-runtime environment)
- `src/features/{name}/*.test.tsx` — Frontend tests (jsdom environment)
- `e2e/*.spec.ts` — E2E tests (Playwright/Chromium)
- `bin/__tests__/*.test.ts` — CLI tests (node environment)
- `templates/**/*.test.ts` — Generator/pipeline tests (node environment)

### Pre-Commit Hooks

Every commit runs (via lefthook):
1. **Typecheck** — all 3 tsconfigs (app, node, convex)
2. **Tests + coverage** — `vitest run --coverage` with 100% threshold

Both must pass or the commit is blocked.

### Testing Philosophy

- Test **behavior**, not implementation
- **Integration-first** — mock only at system boundaries
- **MECE** test decomposition — no overlapping tests, no gaps
- Each test **independent** and self-contained

---

## Development Commands

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Run all tests | `npm test` |
| Watch mode | `npm run test:watch` |
| E2E tests | `npm run test:e2e` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Generate feature | `npm run gen:feature` |

---

## Deployment

1. **Build:** `npm run build`
2. **Deploy Convex:** `npx convex deploy`
3. **Deploy frontend:** Any static host (Vercel, Netlify, Cloudflare Pages — `netlify.toml` included)
4. **Set env var:** `VITE_CONVEX_URL` in your hosting provider

---

## Known Limitations

These are honest gaps in the current state:

| Issue | Impact | Workaround |
|-------|--------|------------|
| Subtasks, Work Logs, Activity Logs have nav items but no standalone routes | Clicking these nav links may 404 | These are sub-entities accessed via the task detail panel |
| Uploads feature is scaffolded but not implemented | No standalone upload UI | Avatar upload works in Settings |
| `src/shared/hooks/` directory is empty | No shared hooks | Feature-specific hooks live in their feature folders |
| Plugin system uses git branches (not npm) | Manual merge required | `bash scripts/plugin.sh install plugin/name` handles it |
| `docs/guide/` directory referenced but doesn't exist | Dead links in docs/README.md | Use this guide and FEATHER-STARTER-GUIDE.md instead |

---

## Further Reading

- [Feather Starter Guide](./FEATHER-STARTER-GUIDE.md) — Deep architecture reference
- [Example Apps Guide](./EXAMPLE-APPS-GUIDE.md) — Walkthrough of generating features from YAML
- [Providers](../PROVIDERS.md) — External service documentation and swap guides
- [CLAUDE.md](../CLAUDE.md) — Agent instructions and project conventions
