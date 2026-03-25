---
phase: 4
slug: projects
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0 + convex-test (backend) / Testing Library (frontend) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npm test` (includes coverage) |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npm test` (full suite with coverage)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | PROJ-01 | unit | `npx vitest run convex/projects/mutations.test.ts -t "create" -x` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | PROJ-02 | unit | `npx vitest run convex/projects/mutations.test.ts -t "update" -x` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | PROJ-03 | unit | `npx vitest run convex/projects/mutations.test.ts -t "delete" -x` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | PROJ-04 | unit | `npx vitest run convex/projects/queries.test.ts -t "list" -x` | ❌ W0 | ⬜ pending |
| 04-01-05 | 01 | 1 | PROJ-05 | unit | `npx vitest run convex/projects/mutations.test.ts -t "assign" -x` | ❌ W0 | ⬜ pending |
| 04-01-06 | 01 | 1 | PROJ-06 | unit | `npx vitest run convex/projects/queries.test.ts -t "getWithTasks" -x` | ❌ W0 | ⬜ pending |
| 04-01-07 | 01 | 1 | PROJ-07 | unit | `npx vitest run convex/projects/queries.test.ts -t "statusSummary" -x` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | VIEW-03 | unit | `npx vitest run src/features/projects/projects.test.tsx -t "Projects" -x` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | VIEW-04 | unit | `npx vitest run src/features/projects/projects.test.tsx -t "Detail" -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/shared/schemas/projects.ts` — Zod schemas for project domain
- [ ] `convex/projects/queries.ts` — backend queries (list, getWithTasks)
- [ ] `convex/projects/mutations.ts` — backend mutations (create, update, delete)
- [ ] `convex/projects/queries.test.ts` — covers PROJ-04, PROJ-06, PROJ-07
- [ ] `convex/projects/mutations.test.ts` — covers PROJ-01, PROJ-02, PROJ-03, PROJ-05
- [ ] `src/features/projects/projects.test.tsx` — covers VIEW-03, VIEW-04
- [ ] `public/locales/en/projects.json` + `public/locales/es/projects.json` — i18n translations
- [ ] Verify `by_project` index exists on tasks table; add if missing

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Card grid responsive layout | VIEW-03 | CSS grid responsiveness untestable in jsdom | Open /dashboard/projects, resize browser, verify 2-3 column layout |
| Status badge colors | VIEW-03 | Visual styling untestable in jsdom | Verify active=green, on_hold=amber, completed=gray, archived=gray(dimmed) |
| Status summary progress bar | VIEW-04 | Visual rendering untestable in jsdom | Open project detail, verify colored bar matches task counts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
