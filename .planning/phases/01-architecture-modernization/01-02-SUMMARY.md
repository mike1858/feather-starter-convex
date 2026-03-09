---
phase: 01-architecture-modernization
plan: 02
subsystem: api
tags: [convex, domain-folders, zod, shared-schemas, billing]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Shared schemas directory, username schema, glob-based coverage"
provides:
  - Domain-organized Convex backend (users/, billing/, uploads/, onboarding/)
  - Shared billing Zod schemas (currency, interval, planKey)
  - Updated api.* and internal.* import paths across entire codebase
  - Username max-length bug fix (VAL-03)
affects: [01-03, 01-04, 01-05, 01-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Convex functions organized by domain: convex/{domain}/{type}.ts"
    - "Shared Zod schemas for billing enums (currency, interval, planKey)"
    - "API paths follow domain structure: api.{domain}.{type}.{function}"

key-files:
  created:
    - convex/users/queries.ts
    - convex/users/mutations.ts
    - convex/billing/queries.ts
    - convex/billing/actions.ts
    - convex/billing/stripe.ts
    - convex/uploads/mutations.ts
    - convex/onboarding/mutations.ts
    - src/shared/schemas/billing.ts
    - src/shared/schemas/billing.test.ts
    - convex/users/queries.test.ts
    - convex/users/mutations.test.ts
    - convex/billing/queries.test.ts
    - convex/billing/stripe.test.ts
    - convex/onboarding/mutations.test.ts
    - convex/uploads/mutations.test.ts
  modified:
    - src/shared/schemas/index.ts
    - convex/_generated/api.d.ts
    - convex/http.ts
    - convex/init.ts
    - src/routes/_app.tsx
    - src/routes/_app/login/_layout.index.tsx
    - src/routes/_app/_auth/dashboard/_layout.tsx
    - src/routes/_app/_auth/dashboard/_layout.checkout.tsx
    - src/routes/_app/_auth/dashboard/_layout.settings.index.tsx
    - src/routes/_app/_auth/dashboard/_layout.settings.index.test.tsx
    - src/routes/_app/_auth/dashboard/_layout.settings.billing.tsx
    - src/routes/_app/_auth/onboarding/_layout.username.tsx
    - src/routes/_app/_auth/onboarding/_layout.username.test.tsx

key-decisions:
  - "Kept all Stripe internal functions in billing/stripe.ts (no separate billing/mutations.ts)"
  - "Manually updated _generated/api.d.ts since npx convex dev unavailable without deployment"
  - "cancelCurrentUserSubscriptions moved to internalAction in billing/stripe.ts"

patterns-established:
  - "Domain folder convention: convex/{domain}/{queries|mutations|actions|stripe}.ts"
  - "API path convention: api.{domain}.{type}.{function} (e.g., api.users.queries.getCurrentUser)"
  - "Internal path convention: internal.{domain}.{type}.{function}"

requirements-completed: [STRUCT-02, STRUCT-06, STRUCT-08, VAL-01, VAL-02, VAL-03, VAL-04]

# Metrics
duration: 7min
completed: 2026-03-09
---

# Phase 1 Plan 2: Convex Backend Restructure Summary

**Split convex god files into domain folders (users, billing, uploads, onboarding), updated all api.* paths atomically, added shared billing Zod schemas, and fixed username max-length bug**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-09T09:10:19Z
- **Completed:** 2026-03-09T09:17:05Z
- **Tasks:** 3
- **Files modified:** 30

## Accomplishments
- Eliminated convex/app.ts and convex/stripe.ts god files
- Split into 4 domain folders: users/, billing/, uploads/, onboarding/
- Updated all api.app.*, api.stripe.*, internal.stripe.* references across 13 frontend/backend files
- Created shared billing Zod schemas (currency, interval, planKey) with 9 test stubs
- Fixed username max-length bug -- now uses USERNAME_MAX_LENGTH constant instead of hardcoded "32"
- Split test files into domain-specific locations (6 new test files)
- All 118 tests pass with 100% coverage thresholds

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared Zod schemas for billing domain with test stubs** - `902c663` (feat)
2. **Task 2: Split convex files into domain folders** - `a200cde` (feat)
3. **Task 3: Update all api.* import paths and split tests** - `6c595af` (feat)

## Files Created/Modified
- `src/shared/schemas/billing.ts` - Currency, interval, planKey Zod schemas
- `src/shared/schemas/billing.test.ts` - 9 test stubs for billing schemas
- `src/shared/schemas/index.ts` - Updated barrel export with billing schemas
- `convex/users/queries.ts` - getCurrentUser query
- `convex/users/mutations.ts` - updateUsername, updateUserImage, removeUserImage, deleteCurrentUserAccount
- `convex/billing/queries.ts` - getActivePlans query
- `convex/billing/actions.ts` - createSubscriptionCheckout, createCustomerPortal
- `convex/billing/stripe.ts` - Stripe SDK, all PREAUTH/UNAUTH internal functions
- `convex/uploads/mutations.ts` - generateUploadUrl
- `convex/onboarding/mutations.ts` - completeOnboarding
- `convex/_generated/api.d.ts` - Updated for new module paths
- `convex/http.ts` - Updated stripe import and internal.stripe.* references
- `convex/init.ts` - Updated stripe import path

## Decisions Made
- Kept all Stripe internal functions (PREAUTH_*, UNAUTH_*) in `billing/stripe.ts` rather than creating separate `billing/mutations.ts` -- they're tightly coupled to the Stripe workflow
- Manually updated `_generated/api.d.ts` since `npx convex dev` requires a deployment -- this file will be regenerated properly on next deploy
- Moved `cancelCurrentUserSubscriptions` to `billing/stripe.ts` as internalAction since it calls Stripe SDK

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed convex/init.ts stripe import path**
- **Found during:** Task 3 (api.* path updates)
- **Issue:** `convex/init.ts` imported from `@cvx/stripe` which no longer exists after the restructure
- **Fix:** Changed import to `@cvx/billing/stripe`
- **Files modified:** convex/init.ts
- **Verification:** `npx vitest run` passes -- init.test.ts no longer fails
- **Committed in:** 6c595af (Task 3 commit)

**2. [Rule 3 - Blocking] Updated _generated/api.d.ts for new module paths**
- **Found during:** Task 3 (typecheck verification)
- **Issue:** Auto-generated types still referenced old `app` and `stripe` modules
- **Fix:** Manually updated api.d.ts to reflect new domain module structure
- **Files modified:** convex/_generated/api.d.ts
- **Verification:** `npm run typecheck` shows only pre-existing errors unrelated to restructure
- **Committed in:** 6c595af (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were necessary for tests to pass and types to resolve. No scope creep.

## Issues Encountered
- Pre-existing typecheck errors in test files (checkout.test.tsx, billing.test.tsx) are unrelated to this restructure -- not addressed per scope boundary rules

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Domain folder structure ready for Zod validation additions (Plan 01-03 can add zCustomMutation)
- All api.* paths updated -- frontend components reference new domain paths
- Shared billing schemas available for both frontend forms and backend validation

---
*Phase: 01-architecture-modernization*
*Completed: 2026-03-09*
