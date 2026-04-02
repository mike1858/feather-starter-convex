# Providers

Every external vendor/service used by Feather Starter, with swap guides.

## Convex

**What it does:** Backend-as-a-service providing database, real-time subscriptions, server functions (queries/mutations/actions), file storage, scheduled jobs, and authentication via `@convex-dev/auth`.

**Files that use it:**
- `convex/` -- all backend logic (19 domain directories)
- `src/` -- any file importing `api` from `~/convex/_generated/api`
- `convex/schema.ts` -- database schema (19 tables + auth tables)
- `convex/auth.ts`, `convex/auth.config.ts` -- authentication setup
- `convex/crons.ts` -- scheduled jobs (error digest)
- `convex/http.ts` -- HTTP routes

**Env vars:**
- `CONVEX_DEPLOYMENT` -- deployment identifier (in `.env.local`)
- `VITE_CONVEX_URL` -- public Convex URL for the frontend (in `.env.local`)
- `VITE_CONVEX_SITE_URL` -- public site URL (in `.env.local`)

**Swap guide:**
Convex is deeply integrated. Swapping it requires replacing:
1. All `convex/` server functions with your new backend (REST, tRPC, etc.)
2. `@convex-dev/react-query` hooks with standard fetch/query patterns
3. `convex/schema.ts` with your ORM schema (Prisma, Drizzle, etc.)
4. `@convex-dev/auth` with your auth library (NextAuth, Lucia, etc.)
5. File storage (`ctx.storage`) with S3/Cloudflare R2
6. Scheduled jobs (`ctx.scheduler`) with a job queue (BullMQ, Inngest, etc.)

---

## Resend

**What it does:** Transactional email delivery. Sends OTP verification codes and password reset emails.

**Files that use it:**
- `convex/otp/ResendOTP.ts` -- OTP email sender
- `convex/password/ResendOTPPasswordReset.ts` -- password reset email sender
- `convex/email/index.ts` -- email rendering with `@react-email/components`

**Env vars:**
- `AUTH_RESEND_KEY` -- Resend API key (set in Convex dashboard via `npx convex env set`)

**Swap guide:**
1. Replace `convex/otp/ResendOTP.ts` and `convex/password/ResendOTPPasswordReset.ts` with your email provider's SDK (SendGrid, Postmark, AWS SES)
2. Update the `send()` call to use your provider's API
3. Keep `convex/email/index.ts` -- it renders React Email templates (provider-agnostic)
4. Update env var name if different

---

## GitHub OAuth (Optional)

**What it does:** Social login via GitHub. Configured through `@convex-dev/auth`.

**Files that use it:**
- `convex/auth.config.ts` -- OAuth provider configuration
- `convex/auth.ts` -- auth setup with `@convex-dev/auth`

**Env vars:**
- `AUTH_GITHUB_ID` -- GitHub OAuth app client ID (set in Convex dashboard)
- `AUTH_GITHUB_SECRET` -- GitHub OAuth app client secret (set in Convex dashboard)

**Swap guide:**
1. Update `convex/auth.config.ts` to add/replace with your OAuth provider (Google, Discord, etc.)
2. `@convex-dev/auth` supports multiple providers -- see [Convex Auth docs](https://labs.convex.dev/auth)
3. Update env vars for your new provider
4. No frontend changes needed -- the auth flow is provider-agnostic

---

## Hosting (Vercel / Netlify / Any Static Host)

**What it does:** Frontend hosting with automatic deployments from Git.

**Files that reference it:**
- `netlify.toml` -- Netlify build config (included in repo)
- No `vercel.json` -- Vercel works with zero config for Vite apps

**Setup for any host:**
1. Build command: `npm run build` (or `npx convex deploy --cmd 'npm run build'` for production)
2. Output directory: `dist/`
3. Set `VITE_CONVEX_URL` environment variable in your hosting provider

---

## Stripe (Plugin Only)

**What it does:** Payment processing, subscription billing. Available as an optional plugin on the `plugin/billing` branch -- **not part of the core starter**.

**To install:**
```sh
bash scripts/plugin.sh install plugin/billing
```

**Env vars (after installation):**
- `STRIPE_SECRET_KEY` -- Stripe secret key (set in Convex dashboard)
- `STRIPE_WEBHOOK_SECRET` -- webhook signing secret (set in Convex dashboard)

---

## Other Dependencies

These are npm packages, not external services. No API keys or accounts needed.

| Package | Purpose | Used In |
|---------|---------|---------|
| `@tanstack/react-router` | File-based routing | `src/routes/` |
| `@tanstack/react-query` | Data fetching (via `@convex-dev/react-query`) | Feature components |
| `@tanstack/react-form` | Form management with Zod validation | Feature forms |
| `@radix-ui/*` | Accessible UI primitives | `src/ui/` |
| `tailwindcss` v4 | Utility-first CSS | All components |
| `zod` v4 | Schema validation (shared frontend ↔ backend) | `src/shared/schemas/`, `convex/` |
| `i18next` | Internationalization (en, es) | All features |
| `xlsx` | Excel file parsing | `templates/pipeline/excel/` |
| `@xixixao/uploadstuff` | File upload to Convex storage | Settings (avatar) |
| `@dnd-kit/*` | Drag-and-drop reordering | Tasks, subtasks |
| `@sentry/react` | Error tracking (opt-in) | Error capture |
| `plop` | Code generation engine | `npm run gen:*` |
| `ts-morph` | AST manipulation for code wiring | `templates/pipeline/`, `templates/wiring/` |
| `commander` | CLI framework | `bin/feather.ts` |
| `feather-testing-convex` | Convex test helpers (in-memory backend) | All backend + frontend tests |
| `feather-testing-core` | Fluent Session DSL for E2E | Playwright E2E tests |
