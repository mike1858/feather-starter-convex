---
phase: 02-auth-dx-infrastructure
plan: 03
subsystem: auth
tags: [convex, password-reset, dev-mailbox, email, otp, tanstack-form]

# Dependency graph
requires:
  - phase: 02-01
    provides: "Password provider with reset capability, ResendOTP, login page"
provides:
  - "Password reset two-step form (request code, verify with new password)"
  - "Dev mailbox table and API (store, list, clearAll)"
  - "Email interception in OTP and password reset providers"
  - "Dev mailbox route with HTML preview"
affects: [02-04, auth-testing, email-templates]

# Tech tracking
tech-stack:
  added: [ConvexHttpClient]
  patterns: [dev-email-interception, two-step-form-flow, env-gated-dev-routes]

key-files:
  created:
    - convex/devEmails/mutations.ts
    - convex/devEmails/queries.ts
    - convex/devEmails/mutations.test.ts
    - convex/devEmails/queries.test.ts
    - src/features/auth/components/PasswordResetForm.tsx
    - src/features/auth/components/PasswordResetForm.test.tsx
    - src/routes/_app/_auth/dev/mailbox.tsx
  modified:
    - convex/schema.ts
    - convex/otp/ResendOTP.ts
    - convex/password/ResendOTPPasswordReset.ts
    - convex/_generated/api.d.ts
    - src/routes/_app/login/_layout.index.tsx
    - src/shared/nav.ts
    - src/routeTree.gen.ts

key-decisions:
  - "Used public mutations instead of internalMutation for devEmails store/clearAll -- ConvexHttpClient cannot call internal functions"
  - "Email interception stores plain HTML string with token/expiry rather than rendering React email components"
  - "DEV_MAILBOX env var defaults to enabled (only disabled when explicitly set to 'false')"

patterns-established:
  - "Dev email interception: auth providers store email data via ConvexHttpClient before sending via Resend"
  - "Two-step form flow: state discriminated union ('forgot' | { email: string }) drives step rendering"
  - "Environment-gated nav items: import.meta.env.DEV conditional spread in navItems array"

requirements-completed: [AUTH-02, DX-01]

# Metrics
duration: 10min
completed: 2026-03-10
---

# Phase 2 Plan 3: Password Reset & Dev Mailbox Summary

**Two-step password reset form with OTP code verification, plus Phoenix-inspired dev mailbox for email inspection during development**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-10T04:00:04Z
- **Completed:** 2026-03-10T04:10:07Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Password reset form with two-step flow: request code via email, then enter code + new password
- Dev mailbox backend (devEmails table with store/list/clearAll) with email interception in both OTP and password reset providers
- Dev mailbox route at /dev/mailbox with email list, expandable HTML preview, and clear all button
- Login page wired with "Forgot password?" flow via PasswordForm's onForgotPassword prop
- 184 tests passing at 100% coverage (14 new tests added)

## Task Commits

Each task was committed atomically:

1. **Task 1: Dev mailbox backend + email interception** - `f03e5f5` (feat)
2. **Task 2: Password reset form + dev mailbox route** - `526d13a` (feat)

## Files Created/Modified
- `convex/schema.ts` - Added devEmails table with sentAt index
- `convex/devEmails/mutations.ts` - store and clearAll mutations for dev email records
- `convex/devEmails/queries.ts` - list query returning emails sorted by sentAt desc
- `convex/devEmails/mutations.test.ts` - 3 tests for store and clearAll
- `convex/devEmails/queries.test.ts` - 2 tests for list query
- `convex/otp/ResendOTP.ts` - Added dev email interception via ConvexHttpClient
- `convex/password/ResendOTPPasswordReset.ts` - Added dev email interception via ConvexHttpClient
- `convex/_generated/api.d.ts` - Added devEmails and password module type declarations
- `src/features/auth/components/PasswordResetForm.tsx` - Two-step password reset form
- `src/features/auth/components/PasswordResetForm.test.tsx` - 9 tests for reset form
- `src/routes/_app/login/_layout.index.tsx` - Integrated resetPassword step and wired onForgotPassword
- `src/routes/_app/_auth/dev/mailbox.tsx` - Dev mailbox route with email list and HTML preview
- `src/shared/nav.ts` - Added dev mailbox nav item (dev mode only)
- `src/routeTree.gen.ts` - Added dev/mailbox route registration

## Decisions Made
- Used public `mutation` instead of `internalMutation` for devEmails functions because `ConvexHttpClient` (needed from auth provider callbacks which lack Convex context) cannot call internal functions. This is acceptable since devEmails is a dev-only feature.
- Email interception stores a plain HTML string with the token and expiry info rather than attempting to render React email components server-side (the React components are rendered separately by Resend).
- `DEV_MAILBOX` env var defaults to enabled -- only explicitly setting it to `"false"` disables interception.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Changed internalMutation to mutation for devEmails**
- **Found during:** Task 1 (Dev mailbox backend)
- **Issue:** Plan specified using ConvexHttpClient with internal mutations, but ConvexHttpClient cannot call internal functions -- they are not exposed via the public API
- **Fix:** Changed store and clearAll from internalMutation to mutation
- **Files modified:** convex/devEmails/mutations.ts, convex/devEmails/mutations.test.ts, convex/devEmails/queries.test.ts
- **Verification:** Tests pass, typecheck passes
- **Committed in:** f03e5f5

**2. [Rule 3 - Blocking] Updated convex/_generated/api.d.ts with new modules**
- **Found during:** Task 1 (Dev mailbox backend)
- **Issue:** Generated type declarations did not include devEmails or password modules, causing TypeScript errors (Property 'devEmails' does not exist on type)
- **Fix:** Manually added import and module declarations for devEmails/mutations, devEmails/queries, and password/ResendOTPPasswordReset to api.d.ts
- **Files modified:** convex/_generated/api.d.ts
- **Verification:** npx tsc -p tsconfig.app.json --noEmit passes
- **Committed in:** f03e5f5

**3. [Rule 1 - Bug] Fixed useConvexMutation usage in dev mailbox route**
- **Found during:** Task 2 (Dev mailbox route)
- **Issue:** useConvexMutation returns a function (for use as mutationFn), not a mutation object with .mutate()
- **Fix:** Wrapped with useMutation({ mutationFn: useConvexMutation(...) }) and called mutate destructured from result
- **Files modified:** src/routes/_app/_auth/dev/mailbox.tsx
- **Verification:** npx tsc -p tsconfig.app.json --noEmit passes
- **Committed in:** 526d13a

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required. The DEV_MAILBOX env var defaults to enabled.

## Next Phase Readiness
- Password reset flow complete and wired into login page
- Dev mailbox captures emails from both OTP and password reset providers
- Ready for Plan 04 (if applicable) or next phase

---
*Phase: 02-auth-dx-infrastructure*
*Completed: 2026-03-10*
