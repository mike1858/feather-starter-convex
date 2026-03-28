---
title: "Unassigning a task leaves it in limbo (not in My Tasks or Team Pool)"
area: tasks
priority: P1
status: done
created: 2026-03-25
source: Phase 3 verify-work (unassigned task disappeared from both views)
---

## Bug

When a user unassigns their own task, the task disappears from both My Tasks (no assignee) and Team Pool (still private). The task exists in the DB but is invisible in all views.

## Root Cause

- Task created with `visibility: "private"`
- `assign` mutation only flips to "shared" when assigning to another user (`assigneeId !== creatorId`)
- Unassigning (`assigneeId = undefined`) doesn't change visibility
- Team Pool filters for `visibility === "shared" && !assigneeId`

## Fix

Auto-flip visibility to "shared" when unassigning. In `convex/tasks/mutations.ts` `assign` handler, add:

```typescript
if (!args.assigneeId) {
  patch.visibility = "shared";
}
```

This matches intent: unassigning = putting up for grabs in team pool.

## Tests to Update

- Add test: "unassign auto-flips visibility to shared" in `convex/tasks/mutations.test.ts`
