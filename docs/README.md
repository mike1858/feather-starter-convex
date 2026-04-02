# Feather Starter Documentation

Feather Starter is a production-ready SaaS starter kit built with React 19, Convex, TanStack, Zod v4, and Tailwind v4. Feature-folder architecture with YAML-driven code generation and 100% test coverage.

## Guides

| Guide | Audience | What It Covers |
|-------|----------|---------------|
| [Getting Started](./getting-started.md) | New users (human + AI agent) | Setup, project structure, generators, AI workflow |
| [Feather Starter Guide](./FEATHER-STARTER-GUIDE.md) | Developers going deeper | Architecture, patterns, testing, backend conventions |
| [Example Apps Guide](./EXAMPLE-APPS-GUIDE.md) | Learning the generator | Step-by-step YAML spec → generated feature walkthrough |

## Reference

| Document | What It Covers |
|----------|---------------|
| [CLAUDE.md](../CLAUDE.md) | AI agent instructions, project conventions, design principles |
| [PROVIDERS.md](../PROVIDERS.md) | External services (Convex, Resend, GitHub OAuth) with swap guides |
| [Main README](../README.md) | Architecture diagram, tech stack, full feature list |

## Quick Start

```sh
npm install
npx convex dev --once
npx @convex-dev/auth
npx convex env set AUTH_RESEND_KEY re_your_key
npm run dev
```

> **Warning:** Do not use `npx convex dev --configure=new` — it overwrites `convex/tsconfig.json` and breaks path aliases. See [Getting Started](./getting-started.md) for full setup instructions.
