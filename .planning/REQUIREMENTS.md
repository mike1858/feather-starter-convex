# Requirements: Feather Starter Convex -- Architecture Modernization

**Defined:** 2026-03-09
**Core Value:** Developer velocity -- new features are faster to build because every file has a clear, predictable home

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Codebase Structure

- [ ] **STRUCT-01**: Frontend code is organized into feature folders (`src/features/auth/`, `src/features/billing/`, etc.) with components, hooks, and barrel exports
- [ ] **STRUCT-02**: Convex backend is organized by domain (`convex/users/`, `convex/billing/`, `convex/uploads/`) with queries, mutations, and actions in separate files
- [x] **STRUCT-03**: Cross-feature code lives in `src/shared/` (hooks, utils, schemas) with clear promotion rules (3+ features = shared)
- [ ] **STRUCT-04**: Route files are thin wrappers that import page components from feature folders
- [ ] **STRUCT-05**: Tests are co-located with their source in feature folders
- [ ] **STRUCT-06**: All `api.*` import paths are updated to reflect new Convex file structure
- [x] **STRUCT-07**: vitest coverage config uses globs instead of hardcoded file paths
- [ ] **STRUCT-08**: TypeScript compilation and all existing tests pass after restructure

### Plugin System

- [ ] **PLUG-01**: Navigation is data-driven (array of nav items) so plugins can add entries without editing component JSX
- [ ] **PLUG-02**: i18n uses namespace-based loading so plugins add separate JSON files instead of editing `translation.json`
- [ ] **PLUG-03**: Error constants are grouped by feature with clear sections for plugin additions
- [ ] **PLUG-04**: A shell script (`scripts/plugin.sh`) can list, preview, and install plugin branches
- [ ] **PLUG-05**: GitHub Actions auto-rebase all `plugin/*` branches when `main` is pushed and create issues on conflicts
- [ ] **PLUG-06**: GitHub Actions run typecheck + lint + tests on every push to `plugin/*` branches
- [ ] **PLUG-07**: `plugin/infra-ci-github-actions` branch exists with CI workflow files
- [ ] **PLUG-08**: `plugin/ui-command-palette` branch exists with a working command palette component
- [ ] **PLUG-09**: `plugin/feature-admin-panel` branch exists with routes, Convex functions, schema table, and nav item
- [ ] **PLUG-10**: Multi-plugin merge tested and compatibility matrix documented

### CLI Generators

- [ ] **GEN-01**: `npm run gen:feature` scaffolds `src/features/{name}/` with components/, hooks/, index.ts and matching `convex/{name}/` directory
- [ ] **GEN-02**: `npm run gen:route` generates a TanStack Router file at the correct path with auth guard option
- [ ] **GEN-03**: `npm run gen:convex-function` generates a typed query/mutation/action with auth check boilerplate
- [ ] **GEN-04**: `npm run gen:form` generates a Zod schema + TanStack Form component with shadcn/ui fields

### Shared Validation

- [ ] **VAL-01**: Shared Zod schemas in `src/shared/schemas/` for username, currency, interval, plan key, email options
- [ ] **VAL-02**: Convex mutations validate with Zod via `convex-helpers/server/zod4`
- [ ] **VAL-03**: Username max-length bug fixed (UI references schema constraint dynamically)
- [ ] **VAL-04**: Convex validators derived from Zod schemas for enums where `zodToConvex` supports Zod v4

### Documentation

- [ ] **DOC-01**: `PROVIDERS.md` documents which services use which vendors and how to swap them
- [ ] **DOC-02**: Main README includes architecture diagram, feature guide, plugin usage, and generator instructions
- [ ] **DOC-03**: Each `src/features/*/README.md` documents what the feature does, its backend counterpart, and dependencies

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Demo App

- **DEMO-01**: A todolist app with tasks and projects built using the starter kit's feature folders, generators, shared schemas, and plugin-friendly patterns -- demonstrating how the architecture works in practice

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend abstraction / workspace drivers | Convex is un-abstractable by design |
| Monorepo tooling (Turborepo/Nx) | Single package keeps Convex integration simple |
| Universal (web + mobile) support | Web-only starter kit |
| Runtime plugin system | Git-branch merge is simpler and more transparent |
| Auto-generated CRUD | Too opinionated, limits flexibility |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Plan | Status |
|-------------|-------|------|--------|
| STRUCT-01 | Phase 1 | 01-03 | Pending |
| STRUCT-02 | Phase 1 | 01-02 | Pending |
| STRUCT-03 | Phase 1 | 01-01 | Pending |
| STRUCT-04 | Phase 1 | 01-03 | Pending |
| STRUCT-05 | Phase 1 | 01-03 | Pending |
| STRUCT-06 | Phase 1 | 01-02 | Pending |
| STRUCT-07 | Phase 1 | 01-01 | Pending |
| STRUCT-08 | Phase 1 | 01-02 | Pending |
| VAL-01 | Phase 1 | 01-02 | Pending |
| VAL-02 | Phase 1 | 01-02 | Pending |
| VAL-03 | Phase 1 | 01-02 | Pending |
| VAL-04 | Phase 1 | 01-02 | Pending |
| PLUG-01 | Phase 1 | 01-04 | Pending |
| PLUG-02 | Phase 1 | 01-04 | Pending |
| PLUG-03 | Phase 1 | 01-04 | Pending |
| PLUG-04 | Phase 1 | 01-05 | Pending |
| PLUG-05 | Phase 1 | 01-05 | Pending |
| PLUG-06 | Phase 1 | 01-05 | Pending |
| PLUG-07 | Phase 1 | 01-05 | Pending |
| PLUG-08 | Phase 1 | 01-05 | Pending |
| PLUG-09 | Phase 1 | 01-05 | Pending |
| PLUG-10 | Phase 1 | 01-05 | Pending |
| GEN-01 | Phase 1 | 01-06 | Pending |
| GEN-02 | Phase 1 | 01-06 | Pending |
| GEN-03 | Phase 1 | 01-06 | Pending |
| GEN-04 | Phase 1 | 01-06 | Pending |
| DOC-01 | Phase 1 | 01-06 | Pending |
| DOC-02 | Phase 1 | 01-06 | Pending |
| DOC-03 | Phase 1 | 01-06 | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-03-09*
*Last updated: 2026-03-09 after roadmap revision (all requirements -> Phase 1)*
