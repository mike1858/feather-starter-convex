---
status: complete
phase: 06-activity-logs-search
source: [convention-audit]
started: 2026-03-28T20:30:00Z
updated: 2026-03-28T20:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. feather.yaml exists
expected: Feature has feather.yaml (new convention from Phase 999.1)
result: issue
reported: "Only old-style activity-logs.gen.yaml exists, not renamed to feather.yaml"
severity: major

### 2. Test matrix comments
expected: All test files have structured test matrix at top
result: pass

### 3. Integration-first data setup
expected: Tests use client.mutation() for setup where possible
result: pass

### 4. describe block grouping
expected: Tests grouped in describe blocks
result: pass

### 5. Verb-first naming convention
expected: No "should..." test names
result: pass

### 6. No toBeDefined/toMatchSnapshot anti-patterns
expected: Zero instances of weak assertions
result: pass

### 7. Backend queries convention
expected: Proper @cvx/ imports, auth guard, empty array for unauth
result: pass

### 8. Resolved YAML matches schema.ts
expected: Index names and fields in YAML match actual schema
result: issue
reported: "resolved.yaml has by_userId on [userId] but schema has by_actor on [actor]; gen.yaml has by_entityType_entityId but schema has by_entity"
severity: minor

### 9. Frontend components exist
expected: Feature has components or is embedded in another feature's UI
result: issue
reported: "No frontend components, barrel export, or route exist. Activity timeline renders inside task detail view but has no standalone component file"
severity: minor

### 10. Search functionality
expected: Phase 6 goal includes search — global text search should exist
result: issue
reported: "No search implementation exists in the codebase. Phase 6 name is 'Activity Logs & Search' but only activity logs were built"
severity: major

## Summary

total: 10
passed: 6
issues: 4
pending: 0
skipped: 0

## Gaps

- truth: "activity-logs has feather.yaml"
  status: failed
  reason: "Only old-style activity-logs.gen.yaml exists"
  severity: major
  test: 1

- truth: "Resolved YAML index names match schema.ts"
  status: failed
  reason: "by_userId/userId vs by_actor/actor mismatch; by_entityType_entityId vs by_entity mismatch"
  severity: minor
  test: 8

- truth: "Search functionality exists per Phase 6 goal"
  status: failed
  reason: "No search implementation — only activity logs were built"
  severity: major
  test: 10
