---
phase: 01-architecture-modernization
plan: 07
subsystem: tooling, docs
tags: [plop, handlebars, generators, cli, documentation, readme, providers]

# Dependency graph
requires:
  - phase: 01-architecture-modernization/01-06
    provides: "Plugin system with management script, CI workflows, and demo plugins"
provides:
  - "4 Plop.js CLI generators (feature, route, convex-function, form)"
  - "Handlebars templates producing wired-up TypeScript files"
  - "PROVIDERS.md with vendor swap guides"
  - "Comprehensive README with Mermaid architecture diagram"
  - "6 per-feature READMEs following strict template"
affects: []

# Tech tracking
tech-stack:
  added: [plop]
  patterns: [cli-code-generation, handlebars-templates, vendor-swap-documentation]

key-files:
  created:
    - plopfile.js
    - templates/feature/component.tsx.hbs
    - templates/feature/hook.ts.hbs
    - templates/feature/index.ts.hbs
    - templates/feature/test.tsx.hbs
    - templates/feature/readme.md.hbs
    - templates/feature/queries.ts.hbs
    - templates/feature/mutations.ts.hbs
    - templates/route/route-auth.tsx.hbs
    - templates/route/route-public.tsx.hbs
    - templates/convex-function/query.ts.hbs
    - templates/convex-function/mutation.ts.hbs
    - templates/convex-function/action.ts.hbs
    - templates/form/schema.ts.hbs
    - templates/form/form.tsx.hbs
    - PROVIDERS.md
    - src/features/auth/README.md
    - src/features/onboarding/README.md
    - src/features/billing/README.md
    - src/features/dashboard/README.md
    - src/features/uploads/README.md
    - src/features/settings/README.md
  modified:
    - package.json
    - README.md

key-decisions:
  - "Plop generators use skipIfExists for convex-function to avoid overwriting existing files"
  - "Route generator uses separate templates for auth vs public routes (not conditional in one template)"
  - "Pre-existing typecheck errors in route test files left as-is (out of scope)"

patterns-established:
  - "Feature generator creates both src/features/{name}/ and convex/{name}/ with 7 files total"
  - "Route generator prompts for auth requirement and places file in correct directory"
  - "Per-feature README template: Purpose, Backend Counterpart, Key Files, Dependencies, Extension Points"
  - "PROVIDERS.md swap guide format: What it does, Files, Env vars, Step-by-step swap"

requirements-completed: [GEN-01, GEN-02, GEN-03, GEN-04, DOC-01, DOC-02, DOC-03]

# Metrics
duration: 7min
completed: 2026-03-09
---

# Phase 1 Plan 7: Generators and Documentation Summary

**4 Plop.js generators (feature/route/convex-function/form) with Handlebars templates, PROVIDERS.md with vendor swap guides, comprehensive README with Mermaid diagram, and 6 per-feature READMEs**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-09T12:13:05Z
- **Completed:** 2026-03-09T12:20:07Z
- **Tasks:** 3
- **Files modified:** 25

## Accomplishments
- 4 CLI generators producing wired-up TypeScript files with imports, types, and sample content
- PROVIDERS.md documenting Convex, Resend, Stripe, GitHub OAuth, and Vercel with step-by-step swap guides
- Comprehensive README with Mermaid architecture diagram, plugin system docs, generator docs, and full directory structure
- 6 per-feature READMEs with real content (not placeholders) following strict template
- All 160 tests pass, no stale api references, generators verified end-to-end

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Plop.js and create 4 generators with templates** - `3d6a1fb` (feat)
2. **Task 2: Write PROVIDERS.md, README.md, and per-feature READMEs** - `9b88b38` (docs)
3. **Task 3: Final verification** - no commit (verification only, no file changes)

## Files Created/Modified

- `plopfile.js` - 4 Plop.js generators (feature, route, convex-function, form)
- `templates/feature/*.hbs` - 7 Handlebars templates for feature scaffolding
- `templates/route/*.hbs` - 2 route templates (auth, public)
- `templates/convex-function/*.hbs` - 3 Convex function templates (query, mutation, action)
- `templates/form/*.hbs` - 2 form templates (schema, component)
- `package.json` - added plop dependency and 4 gen:* scripts
- `PROVIDERS.md` - vendor documentation with swap guides
- `README.md` - comprehensive project documentation with Mermaid diagram
- `src/features/{auth,onboarding,billing,dashboard,uploads,settings}/README.md` - per-feature docs

## Decisions Made
- **Separate route templates:** Used two template files (auth/public) instead of conditional logic in one template, for clarity
- **skipIfExists for convex-function:** Prevents overwriting existing files when generating into a domain that already has functions
- **Pre-existing typecheck errors:** Route test files and convex/http.ts have pre-existing TS errors from earlier plans; not fixed here as they are out of scope

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Pre-existing typecheck errors:** `npm run typecheck` reports errors in route test files (TS2304 `vi` not found, TS2339 `focus` on Element) and convex/http.ts (TS2554 argument count). These existed before this plan and are not caused by any changes here. All 160 runtime tests pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 1: Architecture Modernization is now complete. The codebase has:
- Feature-folder architecture (6 domains)
- Shared Zod validation between frontend and backend
- Data-driven navigation, namespace i18n, feature-grouped errors
- Git-branch plugin system with 3 demo plugins
- 4 CLI generators for scaffolding
- Complete documentation

---
*Phase: 01-architecture-modernization*
*Completed: 2026-03-09*
