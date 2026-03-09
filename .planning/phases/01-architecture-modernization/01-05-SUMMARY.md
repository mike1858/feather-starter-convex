---
phase: 01-architecture-modernization
plan: 05
subsystem: ui, i18n, errors
tags: [i18next, navigation, error-constants, plugin-architecture]

# Dependency graph
requires:
  - phase: 01-architecture-modernization/01-04
    provides: "Feature folder structure with Navigation component at src/features/dashboard/components/Navigation.tsx"
provides:
  - "Data-driven NavItem interface and navItems array (src/shared/nav.ts)"
  - "Feature-grouped ERRORS constant (src/shared/errors.ts)"
  - "Namespace-based i18n config with per-feature JSON files"
  - "Plugin extension points for nav items, translations, and error constants"
affects: [01-06, 01-07, plugins]

# Tech tracking
tech-stack:
  added: []
  patterns: [data-driven-navigation, namespace-i18n, feature-grouped-errors]

key-files:
  created:
    - src/shared/nav.ts
    - src/shared/nav.test.ts
    - src/shared/errors.ts
    - src/shared/errors.test.ts
    - public/locales/en/common.json
    - public/locales/en/auth.json
    - public/locales/en/dashboard.json
    - public/locales/en/settings.json
    - public/locales/en/billing.json
    - public/locales/en/onboarding.json
    - public/locales/es/*.json (6 files)
  modified:
    - errors.ts
    - src/i18n.ts
    - src/features/dashboard/components/Navigation.tsx
    - src/features/dashboard/components/DashboardPage.tsx
    - convex/billing/actions.ts
    - convex/billing/stripe.ts
    - convex/email/index.ts
    - convex/http.ts
    - convex/init.ts

key-decisions:
  - "Root errors.ts kept as re-export shim for backward compat with convex ~/errors imports"
  - "Empty namespace JSON files created for auth/settings/billing/onboarding as extension points"
  - "Navigation tab bar rendered from navItems array; dropdown menus remain hardcoded (Radix complexity)"

patterns-established:
  - "Data-driven nav: plugins append to navItems array instead of editing JSX"
  - "Namespace i18n: plugins add their own {{ns}}.json files, registered in ns array"
  - "Feature-grouped errors: plugins add their own section to ERRORS constant"

requirements-completed: [PLUG-01, PLUG-02, PLUG-03]

# Metrics
duration: 4min
completed: 2026-03-09
---

# Phase 1 Plan 5: Plugin Extension Points Summary

**Data-driven navigation, namespace-based i18n, and feature-grouped error constants for plugin extensibility**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-09T09:36:17Z
- **Completed:** 2026-03-09T09:40:12Z
- **Tasks:** 2
- **Files modified:** 26

## Accomplishments
- Navigation tab bar renders from navItems array -- plugins append items without editing JSX
- i18n split from monolithic translation.json into 6 namespace files per locale with loadPath using {{ns}}
- ERRORS restructured from flat (ERRORS.AUTH_EMAIL_NOT_SENT) to nested (ERRORS.auth.EMAIL_NOT_SENT)
- All ERRORS references across 5 convex files updated to nested format
- Wave 0 tests for nav (4 tests) and errors (3 tests) pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Data-driven navigation and feature-grouped errors** - `00561ab` (feat)
2. **Task 2: Namespace-based i18n with per-feature translation files** - `2e0b4ad` (feat)

## Files Created/Modified
- `src/shared/nav.ts` - NavItem interface and navItems array (Dashboard, Settings, Billing)
- `src/shared/nav.test.ts` - 4 tests: non-empty, required fields, no duplicates, path format
- `src/shared/errors.ts` - Feature-grouped ERRORS constant (auth, onboarding, billing, common)
- `src/shared/errors.test.ts` - 3 tests: groups exist, values are strings, const assertion
- `errors.ts` - Re-export shim from src/shared/errors for backward compat
- `src/i18n.ts` - Namespace array, defaultNS, loadPath with {{ns}}
- `src/features/dashboard/components/Navigation.tsx` - Tab bar renders from navItems
- `src/features/dashboard/components/DashboardPage.tsx` - useTranslation("dashboard")
- `public/locales/{en,es}/{common,auth,dashboard,settings,billing,onboarding}.json` - 12 namespace files
- `convex/billing/actions.ts` - ERRORS.billing.SOMETHING_WENT_WRONG
- `convex/billing/stripe.ts` - All billing/common nested error refs
- `convex/email/index.ts` - ERRORS.auth.EMAIL_NOT_SENT, ERRORS.common.ENVS_NOT_INITIALIZED
- `convex/http.ts` - All billing/common nested error refs
- `convex/init.ts` - ERRORS.billing.SOMETHING_WENT_WRONG

## Decisions Made
- Root `errors.ts` kept as a re-export shim rather than updating all convex `~/errors` imports. Convex files use the `~` alias which resolves to root, so the shim avoids touching every convex import path.
- Empty namespace JSON files created for auth, settings, billing, onboarding as explicit extension points for plugins (even though no translations exist yet for those features).
- Navigation dropdown menus remain hardcoded (Radix complexity) -- only the tab bar is data-driven via navItems.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused variables after navItems refactor**
- **Found during:** Task 1 (Navigation refactor)
- **Issue:** isDashboardPath, isSettingsPath, isBillingPath became unused after tab bar switched to navItems.map()
- **Fix:** Removed all three unused const declarations
- **Files modified:** src/features/dashboard/components/Navigation.tsx
- **Verification:** TypeScript compiles without unused variable errors
- **Committed in:** 00561ab (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial cleanup of dead code after planned refactor. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three plugin extension points established (nav, i18n, errors)
- Ready for Plan 01-06 (plugin system implementation)
- navItems array, namespace i18n, and ERRORS groups are the clean interfaces plugins will use

---
*Phase: 01-architecture-modernization*
*Completed: 2026-03-09*
