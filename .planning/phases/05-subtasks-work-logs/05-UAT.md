---
status: complete
phase: 05-subtasks-work-logs
source: [convention-audit]
started: 2026-03-28T20:30:00Z
updated: 2026-03-28T20:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. feather.yaml exists (subtasks)
expected: Feature has feather.yaml (new convention from Phase 999.1)
result: issue
reported: "Only old-style subtasks.gen.yaml exists, not renamed to feather.yaml"
severity: major

### 2. feather.yaml exists (work-logs)
expected: Feature has feather.yaml
result: issue
reported: "Only old-style work-logs.gen.yaml exists, not renamed to feather.yaml"
severity: major

### 3. Test matrix comments
expected: All test files have structured test matrix at top
result: pass

### 4. Integration-first data setup
expected: Tests use client.mutation() for setup where possible
result: pass

### 5. describe block grouping
expected: Tests grouped in describe blocks
result: pass

### 6. Verb-first naming convention
expected: No "should..." test names
result: pass

### 7. No toBeDefined/toMatchSnapshot anti-patterns
expected: Zero instances of weak assertions
result: issue
reported: "convex/workLogs/mutations.test.ts:56 uses toBeUndefined() — tests absence not behavior"
severity: cosmetic

### 8. Backend mutation pattern
expected: zMutation for create (user-typed), plain mutation for update/delete
result: issue
reported: "Both subtasks and workLogs create use plain mutation (v.id gotcha is valid), but Zod schemas createSubtaskInput/createWorkLogInput exist unused on backend — no server-side validation"
severity: minor

### 9. Error constants
expected: Uses ERRORS pattern from shared/errors.ts
result: pass

### 10. Frontend components exist
expected: Feature has components, barrel export, route or panel
result: issue
reported: "No frontend components exist yet — barrel exports are placeholder comments. Deferred to Plan 05-02"
severity: major

## Summary

total: 10
passed: 5
issues: 5
pending: 0
skipped: 0

## Gaps

- truth: "subtasks has feather.yaml"
  status: failed
  reason: "Only old-style subtasks.gen.yaml exists"
  severity: major
  test: 1

- truth: "work-logs has feather.yaml"
  status: failed
  reason: "Only old-style work-logs.gen.yaml exists"
  severity: major
  test: 2

- truth: "Zod schemas used for server-side validation"
  status: failed
  reason: "createSubtaskInput and createWorkLogInput Zod schemas exist but are never imported by backend mutations"
  severity: minor
  test: 8

- truth: "Frontend components exist for subtasks and work-logs"
  status: failed
  reason: "No frontend components — barrel exports are placeholder comments"
  severity: major
  test: 10
