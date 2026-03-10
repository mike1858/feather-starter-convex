# Phase 2: Auth & DX Infrastructure - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Add email/password authentication (alongside existing OTP and GitHub OAuth), password reset via email link, a dev-only email viewer route, Lefthook pre-commit hooks enforcing 100% test coverage, and Playwright E2E tests covering user-facing flows.

</domain>

<decisions>
## Implementation Decisions

### E2E Test Scope
- Cover auth flows (sign up, sign in, password reset, sign out) AND existing flows (onboarding, profile settings, billing)
- Not just the minimum auth round-trip — test everything that exists today
- Future phases add their own E2E tests for tasks/projects

### E2E Test Environment
- Separate Convex deployment dedicated to E2E tests (isolated from dev data)
- No CI integration for now — Playwright runs locally during development
- CI workflow to be added in a later phase when the test suite matures

### E2E Auth Handling
- Claude's discretion on how tests authenticate (real login flow vs programmatic helper)

### Claude's Discretion
- Login page layout — how email/password form coexists with OTP and GitHub OAuth
- Dev mailbox design — storage approach, route location, email display format, HTML preview
- Password reset flow — page structure, token expiry, success/error feedback
- Pre-commit hook configuration — Lefthook setup, coverage thresholds, what runs on commit

</decisions>

<specifics>
## Specific Ideas

- Dev mailbox inspired by Phoenix's `/dev/mailbox` — a dev-only route where developers can see all emails sent during development without needing an external email service
- The project already has `feather-testing-core` and `feather-testing-convex` packages for test infrastructure
- The `infra-ci` plugin branch exists but CI for E2E is deferred to later

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `convex/auth.ts`: `convexAuth` setup with `ResendOTP` and `GitHub` providers — password provider adds here
- `convex/email/index.ts`: `sendEmail()` utility with Resend API + Zod validation — reusable for password reset emails
- `convex/otp/ResendOTP.ts`: Email provider pattern using `@convex-dev/auth` Email — password provider follows same pattern
- `src/routes/_app/login/_layout.index.tsx`: Login page with email→OTP flow + GitHub button — needs modification for password form
- `@convex-dev/auth` ^0.0.91: Auth framework already installed, supports password provider
- `@react-email/components` + `@react-email/render`: Email template rendering — reusable for reset emails

### Established Patterns
- Auth providers registered in `convex/auth.ts` via `convexAuth({ providers: [...] })`
- Email sending via raw Resend API in `convex/email/index.ts`
- Form handling with `@tanstack/react-form` + Zod validators
- Feature folders: `src/features/auth/` (currently empty components/hooks dirs)
- Backend domains: `convex/otp/` for OTP-specific code

### Integration Points
- `convex/schema.ts`: May need password-related fields or email log table
- `convex/auth.config.ts`: Provider domain configuration
- `src/shared/nav.ts`: Dev mailbox route registration
- Route files in `src/routes/`: New routes for password reset, dev mailbox
- `package.json` scripts: Lefthook and Playwright additions

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-auth-dx-infrastructure*
*Context gathered: 2026-03-10*
