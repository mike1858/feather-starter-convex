# feather-starter-convex — Project Overview

**Last Updated:** 2026-04-02

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TanStack Router, TanStack Form, TanStack Query |
| Backend | Convex (serverless DB + functions), `convex-helpers` for Zod integration |
| Styling | Tailwind CSS v4, Radix UI primitives, CVA (class-variance-authority), lucide-react icons |
| Auth | `@convex-dev/auth` — OTP + password providers, Resend for email delivery |
| i18n | i18next — languages: `en`, `es`. Namespace per feature. Files: `public/locales/{lang}/{namespace}.json` |
| Validation | Zod v4 — single source of truth, `zodToConvex()` derives Convex validators |
| Testing | Vitest (unit/integration), Playwright (E2E), `feather-testing-convex` (Convex test helpers) |
| Build | Vite 7, TypeScript 5.9 (strict) |
| Deploy | Netlify — `convex deploy --cmd 'npm run build'` |
| Code gen | Plop templates in `templates/` |

## Directory Structure

```
convex/           Backend: schema, auth, domain functions (queries/mutations/actions)
src/features/     Frontend feature folders (components, hooks, barrel exports)
src/shared/       Shared schemas, hooks, utils, nav, errors
src/routes/       TanStack Router file-based routes
src/ui/           Reusable UI components (Radix wrappers, buttons, inputs)
e2e/              Playwright E2E tests
templates/        Plop code generators
public/locales/   i18n translation files (en/, es/)
```

## Development Commands

| Task | Command |
|------|---------|
| Install | `npm install` |
| Dev (frontend + backend) | `npm run dev` |
| Build | `npm run build` |
| Test (unit + coverage) | `npm test` |
| Test (watch) | `npm run test:watch` |
| Test (E2E) | `npm run test:e2e` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Generate feature | `npm run gen:feature` |
| Generate route | `npm run gen:route` |
| Generate Convex function | `npm run gen:convex-function` |
| Generate form | `npm run gen:form` |

## Pre-Commit Hooks (lefthook)

Runs **before every commit** — both must pass:
1. **Typecheck** — all 3 tsconfigs (app, node, convex)
2. **Test + coverage** — `vitest run --coverage` (100% thresholds)

If either fails, the commit is blocked. Fix before retrying.

## Auth System

- `@convex-dev/auth` with OTP (email code) and password (email + password) providers
- Email delivery via Resend (`convex/otp/ResendOTP.ts`, `convex/password/ResendOTPPasswordReset.ts`)
- Dev environment: emails stored in `devEmails` table, viewable at `/dev/mailbox`
- Auth tables auto-created by `authTables` spread in `convex/schema.ts`
