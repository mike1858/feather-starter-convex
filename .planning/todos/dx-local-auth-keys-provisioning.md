---
title: "Auto-provision JWT_PRIVATE_KEY/JWKS for local Convex backend"
area: dx
priority: P1
status: done
created: 2026-03-25
source: Phase 3 verify-work (auth sign-in failed on local backend)
---

## Problem

Local Convex backend doesn't auto-provision `JWT_PRIVATE_KEY` and `JWKS` environment variables needed by `@convex-dev/auth`. Cloud deployments handle this automatically during deploy, but local requires a manual `npx @convex-dev/auth` run. Any developer cloning the repo and running `npm run dev` locally will hit:

```
Uncaught Error: Missing environment variable `JWT_PRIVATE_KEY`
```

## Options

1. **Add `npx @convex-dev/auth` to predev script** — runs before `convex dev`, ensures keys are always provisioned. May add ~2s to startup but is idempotent.
2. **Startup check in init.ts** — fail fast with a helpful error message if keys are missing. Doesn't fix the problem but makes it obvious.
3. **Document in README** — lowest effort but relies on developers reading docs.

## Recommendation

Option 1 (predev script) is the most robust. The predev script already runs `convex dev --run init --until-success` — adding auth key provisioning fits naturally here. Option 2 as a belt-and-suspenders fallback.
