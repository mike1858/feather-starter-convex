---
created: 2026-03-30T06:55:08.698Z
title: Fix update-base CI workflow after feature growth
area: tooling
files:
  - .github/workflows/update-base-branch.yml
  - scripts/strip-to-base.ts
  - convex/schema.ts
  - src/features/dashboard/components/Navigation.tsx
  - src/features/dashboard/components/SearchResultsDropdown.tsx
  - convex/testing/clearAll.ts
  - src/shared/schemas/work-logs.test.ts
---

## Problem

The `update-base` GitHub Actions workflow (`.github/workflows/update-base-branch.yml`) runs on every push to `main`. It executes `scripts/strip-to-base.ts` to remove feature code, then typechecks the stripped result, and force-pushes to a `base` branch.

The strip script currently removes 47 files/directories and modifies 4 wiring files, but the codebase has grown beyond what the script handles. After stripping, typecheck fails with 20+ errors:

- `convex/schema.ts` still imports stripped schemas (tasks, activity-logs, tickets, contacts)
- `SearchResultsDropdown.tsx` references tasks/projects tables that no longer exist
- `Navigation.tsx` — `activeProjects` becomes `unknown` type
- `convex/testing/clearAll.ts` references removed table names
- `src/shared/schemas/work-logs.test.ts` can't find stripped module
- `convex/otp/ResendOTP.ts` — excessively deep type instantiation
- `convex/password/ResendOTPPasswordReset.ts` — stale `@ts-expect-error`

User indicated they don't currently need CI at all — decision needed on whether to fix the strip script or remove the workflow entirely.

## Solution

Options:
1. **Delete the workflow** — remove `.github/workflows/update-base-branch.yml` and `scripts/strip-to-base.ts` if the base branch concept is no longer needed
2. **Fix the strip script** — update it to handle all new features (search, projects in nav, tickets, contacts, work-logs) added since it was written
3. **Disable temporarily** — rename workflow file or add `workflow_dispatch` trigger only
