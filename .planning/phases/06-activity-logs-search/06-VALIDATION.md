---
phase: 6
slug: activity-logs-search
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-27
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit + integration), Playwright (E2E) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --silent` |
| **Full suite command** | `npm test -- --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --silent`
- **After every plan wave:** Run `npm test -- --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | ACTV-01 | unit | `npm test -- convex/activity-logs` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | ACTV-01,02,03 | unit | `npm test -- convex/tasks/mutations.test.ts convex/projects/mutations.test.ts convex/subtasks/mutations.test.ts` | ✅ (existing, need updates) | ⬜ pending |
| 06-02-01 | 02 | 2 | ACTV-04 | unit | `npm test -- activity-logs` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | SRCH-01,02,03,04 | unit | `npm test -- tasks` | ✅ (existing, need updates) | ⬜ pending |
| 06-02-03 | 02 | 2 | SRCH-05 | unit | `npm test -- projects` | ✅ (existing, need updates) | ⬜ pending |
| 06-02-04 | 02 | 2 | SRCH-06 | unit | `npm test -- search` | ❌ W0 | ⬜ pending |
| 06-02-05 | 02 | 2 | VIEW-05 | unit | `npm test -- activity-timeline` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `convex/activity-logs/mutations.test.ts` — stubs for ACTV-01,02,03
- [ ] `convex/activity-logs/queries.test.ts` — stubs for ACTV-04, VIEW-05
- [ ] Activity timeline component test stubs

*Existing infrastructure covers test framework — no new tooling needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Timeline date grouping renders "Today"/"Yesterday" | ACTV-04 | Date-relative formatting requires visual check | Open task detail, verify date group headers |
| Search results highlight/match | SRCH-06 | Visual relevance ranking | Type search term, verify relevant results appear |
| Filter controls interaction | SRCH-01-05 | Multi-filter combination UX | Apply status + priority + project + assignee, verify list narrows |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
