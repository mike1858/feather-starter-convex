---
phase: 01-architecture-modernization
plan: 08
subsystem: testing
tags: [vitest, typecheck, plop, generators, typescript]

requires:
  - phase: 01-architecture-modernization
    provides: "Route test files, feature test template, generators"
provides:
  - "Zero typecheck errors in route test files (was 8)"
  - "Working feature test template matching project conventions"
  - "CLI bypass documentation for all 4 generators"
affects: []

tech-stack:
  added: []
  patterns:
    - "Feature test template uses test() from @cvx/test.setup with client fixture"
    - "HTMLElement cast for Element.focus() in tests"

key-files:
  created: []
  modified:
    - "src/routes/_app/_auth/dashboard/_layout.checkout.test.tsx"
    - "src/routes/_app/_auth/dashboard/_layout.settings.billing.test.tsx"
    - "src/routes/_app/_auth/dashboard/_layout.settings.index.test.tsx"
    - "templates/feature/test.tsx.hbs"
    - "README.md"

key-decisions:
  - "Pre-existing convex/http.ts typecheck error logged to deferred-items.md (out of scope)"

patterns-established:
  - "Test template pattern: import test from @cvx/test.setup, renderWithRouter from @/test-helpers"

requirements-completed: [STRUCT-08, GEN-01, GEN-02]

duration: 2min
completed: 2026-03-09
---

# Phase 01 Plan 08: Gap Closure - Typecheck, Test Template, Generator Docs Summary

**Fixed 8 typecheck errors across 3 route test files, corrected feature test template to match project conventions, and documented CLI bypass flags for all 4 generators**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T12:54:24Z
- **Completed:** 2026-03-09T12:56:20Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Eliminated all 8 typecheck errors in route test files (missing vi import, Element.focus() casts, unused variables)
- All 160 existing tests continue passing
- Feature test template now generates tests matching project conventions (test() from @cvx/test.setup, renderWithRouter from @/test-helpers)
- README Generators section now includes scripted/CI usage with -- bypass flag syntax

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix typecheck errors in 3 route test files** - `8e67aea` (fix)
2. **Task 2: Fix feature test template and document CLI bypass flags** - `b64294b` (feat)

## Files Created/Modified
- `src/routes/_app/_auth/dashboard/_layout.checkout.test.tsx` - Added vi to vitest import
- `src/routes/_app/_auth/dashboard/_layout.settings.billing.test.tsx` - HTMLElement casts, removed unused vars
- `src/routes/_app/_auth/dashboard/_layout.settings.index.test.tsx` - Removed unused variable
- `templates/feature/test.tsx.hbs` - Corrected to match project test conventions
- `README.md` - Added CLI bypass documentation for generators

## Decisions Made
- Pre-existing `convex/http.ts` typecheck error (TS2554) is out of scope -- logged to deferred-items.md

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `convex/http.ts:42` has a pre-existing typecheck error (TS2554: Expected 0-1 arguments). This was present before our changes and is unrelated to the 8 errors this plan targeted. Logged to deferred-items.md.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- STRUCT-08 (typecheck), GEN-01 (test template), GEN-02 (CLI docs) verification gaps are now closed
- Plan 01-09 remains for any additional gap closure

---
*Phase: 01-architecture-modernization*
*Completed: 2026-03-09*
