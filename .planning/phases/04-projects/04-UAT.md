---
status: complete
phase: 04-projects
source: [convention-audit]
started: 2026-03-28T20:30:00Z
updated: 2026-03-28T20:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. feather.yaml exists
expected: Feature has a feather.yaml (new convention from Phase 999.1)
result: issue
reported: "Neither feather.yaml nor projects.gen.yaml exists — feature was hand-built without spec file"
severity: major

### 2. Test matrix comments
expected: All test files have structured test matrix at top
result: pass

### 3. Integration-first data setup
expected: Tests use client.mutation() for data setup, raw insert only when justified
result: pass

### 4. findByText over waitFor(getByText)
expected: No waitFor(() => getByText()) anti-pattern
result: pass

### 5. describe block grouping
expected: Tests grouped in describe blocks
result: pass

### 6. Verb-first naming convention
expected: No "should..." test names
result: pass

### 7. No toBeDefined/toMatchSnapshot anti-patterns
expected: Zero instances of weak assertions
result: pass

### 8. zCustomMutation pattern
expected: create=zMutation, update/delete=plain mutation
result: pass

### 9. Error constants from shared/errors.ts
expected: Uses ERRORS.projects.NOT_FOUND pattern
result: pass

### 10. Feature-folder structure
expected: components/, hooks/, index.ts barrel
result: issue
reported: "Missing hooks/ directory — mutation setup duplicated across ProjectDetailPage and ProjectCard"
severity: minor

### 11. Mixed test()/it() in frontend tests
expected: Consistent test() usage
result: issue
reported: "Integration tests use test(), unit tests use it() in same file"
severity: cosmetic

## Summary

total: 11
passed: 8
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "Feature has a feather.yaml spec file"
  status: failed
  reason: "Neither feather.yaml nor projects.gen.yaml exists — feature was hand-built"
  severity: major
  test: 1

- truth: "Feature-folder has hooks/ directory"
  status: failed
  reason: "Missing hooks/ — mutation setup duplicated across components"
  severity: minor
  test: 10

- truth: "Consistent test function usage"
  status: failed
  reason: "Mixed test()/it() in projects.test.tsx"
  severity: cosmetic
  test: 11
