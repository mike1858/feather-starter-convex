# Milestones

## v2.0 CalmDo Core (Shipped: 2026-03-28)

**Phases completed:** 12 phases, 30 plans, 78 tasks

**Key accomplishments:**

- Password auth provider with PasswordForm component (signIn/signUp/forgot-password) and login page restructured to show password form primary with OTP and GitHub as alternatives
- Lefthook pre-commit hooks enforcing TypeScript typecheck and vitest 100% coverage on every git commit
- Two-step password reset form with OTP code verification, plus Phoenix-inspired dev mailbox for email inspection during development
- Playwright E2E test suite with auth/onboarding/settings specs, Convex test fixtures, and clearAll cleanup mutation
- Billing-free core starter: removed Stripe SDK, 5 billing tables, 20+ billing files, simplified schema to users+devEmails
- Created plugin/billing branch with full Stripe billing as additive diff and rebased 3 existing plugin branches onto billing-free main
- 1. [Rule 3 - Blocking] Used plain mutation for update instead of zMutation
- Task management UI with dnd-kit drag-reorder, inline editing, status workflow, and 21 frontend tests at 100% coverage
- Task unassign visibility auto-flip, Resend skip for keyless local dev, JWT auto-provisioning, auth provider availability query, and dev mailbox auth bypass
- Auth error handling, provider hiding, email persistence, centered login, username hints, settings re-sync
- YAML resolver pipeline, marked regions parser, Handlebars helpers, and premium CSS design tokens for the CRUD generator system
- 5 Handlebars templates producing Zod schemas, auth-guarded CRUD mutations/queries, and comprehensive backend tests matching the tasks gold standard
- 10 premium Handlebars templates producing React components with shadow-card styling, TanStack Form, dot-indicator status badges, view switching, and i18n locale generation
- 5 Handlebars view templates (ListView, CardView, TableView, DetailPage, LoadingSkeleton) with YAML-driven variants for density, image styles, sorting, grouping, pagination, and display modes
- Modular plopfile with 6 generators (feature, schema, backend, frontend, route, convex-function), smartAdd action for marked region preservation, and auto-wiring actions for all 5 shared files
- End-to-end generator pipeline validation with 8 template bug fixes, retroactive tasks.gen.yaml, and smart merge preservation
- Project CRUD backend with Zod schemas, Convex table, cascade delete, status-filtered list with task counts, and task-project relationship mutations with visibility auto-flip
- Complete projects UI with card grid, status filter tabs, project detail with task list/summary bar/inline creation, navigation wiring, i18n, and TaskForm project dropdown
- Subtask CRUD with promote/reorder/toggle, work log CRUD with ownership guards, cascade delete through tasks/projects, and smart time parser utility
- Task detail Sheet panel with subtask checklist (drag-reorder, promote, toggle), work log form (smart time parsing), and work log list, wired to all task views
- logActivity helper with inline audit logging across all task/project/subtask mutations, plus taskTimeline merge query combining activity logs and work logs
- [Rule 1 - Bug] Zod v4 default cascade behavior:
- [Rule 1 - Bug] ERRORS 'as const' assertion:
- [Rule 3 - Blocking] Plop programmatic API deferred:
- [Rule 3 - Blocking] Panel Handlebars templates deferred:
- [Rule 3 - Blocking] Template-level bug fixes deferred:

---

## v1.0 Architecture Modernization (Shipped: 2026-03-09)

**Phases completed:** 1 phase, 9 plans | 65 commits | 181 files changed | +17,820 / -5,335 lines

**Key accomplishments:**

- Restructured Convex backend into domain folders (users/, billing/, uploads/, onboarding/) with all api.* paths updated
- Extracted frontend into 6 feature folders with thin route wrappers under 20 lines each
- Built git-based plugin system with install script, 3 plugin branches (CI, command palette, admin panel), and multi-plugin merge
- Created 4 Plop.js CLI generators (feature, route, convex-function, form) with wired-up templates
- Shared Zod schemas validate on both client and server via zodToConvex + zCustomMutation
- Comprehensive docs: PROVIDERS.md, Mermaid architecture diagram, 6 per-feature READMEs

---
