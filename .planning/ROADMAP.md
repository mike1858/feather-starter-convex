# Roadmap: Feather Starter Convex -- Architecture Modernization

## Overview

Transform a flat-structured SaaS starter kit into a feature-folder architecture with shared Zod validation, git-based plugins, and CLI generators. All work is consolidated into a single phase with seven plans that execute in dependency order: shared infra first, then backend, frontend extraction (two plans), plugin-ready files, plugin system, and finally generators/docs.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (1.1, 1.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Architecture Modernization** - Restructure backend and frontend into feature folders, add shared Zod validation, build plugin system with plugin branches, create CLI generators, and document everything

## Phase Details

### Phase 1: Architecture Modernization
**Goal**: The starter kit has a feature-folder architecture with shared validation, a working plugin system with three plugin branches, CLI generators, and architecture documentation
**Depends on**: Nothing (first phase)
**Requirements**: STRUCT-01, STRUCT-02, STRUCT-03, STRUCT-04, STRUCT-05, STRUCT-06, STRUCT-07, STRUCT-08, VAL-01, VAL-02, VAL-03, VAL-04, PLUG-01, PLUG-02, PLUG-03, PLUG-04, PLUG-05, PLUG-06, PLUG-07, PLUG-08, PLUG-09, PLUG-10, GEN-01, GEN-02, GEN-03, GEN-04, DOC-01, DOC-02, DOC-03
**Success Criteria** (what must be TRUE):
  1. Convex functions live in domain folders and all `api.*` imports resolve; frontend code lives in `src/features/` with thin route wrappers
  2. Shared Zod schemas validate on both client and server; the username max-length bug is fixed
  3. Navigation is data-driven, i18n uses namespace-based loading, and error constants are grouped by feature
  4. `scripts/plugin.sh` can list/install plugins; three plugin branches exist and a two-plugin merge succeeds
  5. Four CLI generators (`gen:feature`, `gen:route`, `gen:convex-function`, `gen:form`) scaffold correct files
  6. README, PROVIDERS.md, and per-feature READMEs document the architecture
  7. `npm run typecheck` and `npm test` pass with 100% coverage throughout

Plans:
- [ ] 01-01: Shared infrastructure and vitest glob fix
- [ ] 01-02: Convex backend restructure and Zod validation wiring
- [ ] 01-03: Frontend feature extraction (dashboard, billing, settings)
- [ ] 01-04: Frontend feature extraction (remaining) and thin routes
- [ ] 01-05: Plugin-friendly shared files (nav, i18n namespaces, error groups)
- [ ] 01-06: Plugin infrastructure and plugin branches
- [ ] 01-07: CLI generators and architecture documentation

**Plan dependency order:** 01-01 -> 01-02 -> 01-03 -> 01-04 -> 01-05 -> 01-06 -> 01-07

**Plan-to-requirement mapping:**

| Plan | Requirements |
|------|-------------|
| 01-01 | STRUCT-03, STRUCT-07 |
| 01-02 | STRUCT-02, STRUCT-06, STRUCT-08, VAL-01, VAL-02, VAL-03, VAL-04 |
| 01-03 | STRUCT-01, STRUCT-04 |
| 01-04 | STRUCT-04, STRUCT-05 |
| 01-05 | PLUG-01, PLUG-02, PLUG-03 |
| 01-06 | PLUG-04, PLUG-05, PLUG-06, PLUG-07, PLUG-08, PLUG-09, PLUG-10 |
| 01-07 | GEN-01, GEN-02, GEN-03, GEN-04, DOC-01, DOC-02, DOC-03 |

## Progress

**Execution Order:**
Plans execute sequentially: 01-01 -> 01-02 -> 01-03 -> 01-04 -> 01-05 -> 01-06 -> 01-07

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Architecture Modernization | 2/7 | In Progress|  |
