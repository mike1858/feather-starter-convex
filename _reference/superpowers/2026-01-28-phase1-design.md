# Task Management System - Phase 1 Design

## Overview

A task management system for a 2-person dev team managing projects. Built with React + Convex.

**Phase 1 Goal:** Replace scattered task tracking (notes, spreadsheets, various tools) with a single source of truth that provides clear overview and prevents tasks from being forgotten.

**Evolution path:**
1. **Phase 1 (this doc):** Internal tool - tasks, projects, time logging
2. **Phase 2:** Collaboration - comments, questions, checklists
3. **Phase 3:** Client visibility - invite clients to view/collaborate
4. **Phase 4:** Full permissions - role-based access control
5. **Phase 5:** Knowledge - resources, org-level templates
6. **Phase 6:** SaaS - clients create own workspaces

---

## Architectural Decision: Multi-Org Foundation

### The Decision

Build the multi-org schema now, but defer multi-org features.

### Why Not Build Simple and Refactor Later?

- Users, permissions, and data ownership are deeply embedded in every query
- Retrofitting multi-tenancy is one of the hardest refactors
- The schema cost is low; the feature cost is what we defer

### Why Not Build Full Multi-Org Now?

- You don't need org switching, org settings UI, or billing yet
- Building unused features creates maintenance burden
- You'll learn what clients actually need by using it first

### The Middle Ground

- Schema supports multi-org from day one
- All queries are org-scoped (ready for isolation)
- But UI assumes single org (yours) until Phase 6
- When a client wants their own workspace: flip a flag, not a rewrite

### Future-Proofing

When a client wants their own workspace (Phase 6):
1. Create new org with `type: "provider"`
2. Migrate their users to the new org
3. They now have their own clients, projects, tasks
4. Your org becomes just another collaborator (or not)

No schema changes. No data migration headaches. Just a business logic flip.

---

## Data Model

### Standard Audit Fields (All Tables)

Every table includes:

| Field | Type | When set | Notes |
|-------|------|----------|-------|
| `createdAt` | number | On create | `Date.now()` |
| `createdBy` | ref → users | On create | Current user |
| `updatedAt` | number | On create and every update | `Date.now()` (same as createdAt initially) |
| `updatedBy` | ref → users | On create and every update | Same as createdBy initially |

**Exception:** `users` table only has `createdAt`/`updatedAt` (no `createdBy`/`updatedBy`) due to Convex Auth constraints.

**Note:** Convex provides `_creationTime` automatically, but we use our own `createdAt` for consistent naming.

**Why always populate updatedAt/updatedBy?** For ETL incremental loads, a single query `WHERE updatedAt > lastSync` captures both new and updated records. No need to check two fields.

---

### Organizations

| Field | Type | Notes |
|-------|------|-------|
| name | string | Company name |
| type | enum | `provider` (your team) or `client` (future) |
| parentOrgId | ref → organizations | For client orgs, points to provider (future) |
| + audit fields | | |

**Phase 1:** Only your org exists. `type: "provider"`.

**Atomic Signup:** Org is created atomically with user during signup (Basecamp/Linear/Slack approach). User never exists without an org. Signup form collects `orgName` along with email/password.

---

### Users

| Field | Type | Notes |
|-------|------|-------|
| email | string | From Convex Auth |
| name | string | Display name |
| orgId | ref → organizations | Which org they belong to |
| createdAt | number | Timestamp |
| updatedAt | number | Timestamp |

**Convex Auth Constraints:**
- Users table is managed by `@convex-dev/auth` - we override it with custom fields
- All custom fields must be `v.optional()` (Convex Auth doesn't guarantee them during creation)
- **No `createdBy`/`updatedBy`** - first user can't reference themselves during creation
- Must include all default auth fields: `name`, `image`, `email`, `emailVerificationTime`, `phone`, `phoneVerificationTime`, `isAnonymous`

**Phase 1:** All users are team members of your org.

---

### Projects

| Field | Type | Notes |
|-------|------|-------|
| name | string | Project name |
| orgId | ref → organizations | Your org |
| clientId | ref → clients | **Nullable - not used in Phase 1** |
| status | enum | `active`, `on_hold`, `completed`, `archived` |
| + audit fields | | |

**Statuses:**
- `active` - Current work (default)
- `on_hold` - Paused, not done
- `completed` - Finished successfully
- `archived` - Hidden from default views

---

### Tasks

| Field | Type | Notes |
|-------|------|-------|
| title | string | Required |
| description | text | Optional, markdown |
| status | enum | `todo`, `in_progress`, `done` |
| isHighPriority | boolean | Default false |
| visibility | enum | `private`, `shared` |
| projectId | ref → projects | Null = quick task |
| orgId | ref → organizations | Always set |
| assigneeId | ref → users | Null = in the pool |
| + audit fields | | |

**Task types:**

| projectId | visibility | What it is |
|-----------|------------|------------|
| null | `private` | My personal quick task |
| null | `shared` | Team quick task (pool) |
| set | — | Project task |

**Quick task rules:**
- Create → `private`, `assigneeId: creator`
- Assign to someone else → auto-flips to `shared`
- Can only be `private` when `assigneeId` is creator
- Move to project → set `projectId`, visibility no longer applies

---

### Subtasks

| Field | Type | Notes |
|-------|------|-------|
| taskId | ref → tasks | Parent task |
| title | string | Required |
| status | enum | `todo`, `done`, `promoted` |
| assigneeId | ref → users | Optional, can differ from parent |
| position | number | Sort order (drag-drop) |
| promotedToTaskId | ref → tasks | If promoted, link to new task |
| + audit fields | | |

**Subtask statuses:**
- `todo` - Not started
- `done` - Completed normally
- `promoted` - Graduated to a full task

**Promotion flow:**
1. Click "Promote to task"
2. New task created with subtask's title
3. New task gets `spawned_from` link to parent task
4. Subtask status → `promoted`, `promotedToTaskId` → new task
5. Subtask visible as "Promoted → [link]"

---

### Task Links

| Field | Type | Notes |
|-------|------|-------|
| sourceTaskId | ref → tasks | Origin task |
| targetTaskId | ref → tasks | Linked task |
| relationship | enum | `spawned_from`, `blocked_by` |
| + audit fields | | |

**Relationships:**
- `spawned_from` - Created from subtask promotion or related work
- `blocked_by` - Can't proceed until other task done

---

### Work Logs

Manual entries documenting work done.

| Field | Type | Notes |
|-------|------|-------|
| taskId | ref → tasks | Parent task |
| body | text | What was done, learnings, notes |
| timeMinutes | number | Optional - time spent |
| + audit fields | | |

**Notes:**
- Time is optional (not a time-tracking app, but useful when needed)
- Body captures context, learnings
- Multiple logs per task (each work session)

---

### Activity Logs

Auto-generated audit trail.

| Field | Type | Notes |
|-------|------|-------|
| taskId | ref → tasks | Nullable - for task activities |
| projectId | ref → projects | Nullable - for project activities |
| orgId | ref → organizations | Always set |
| action | string | What happened |
| details | object | Additional context (JSON) |
| + audit fields | | created_by = who did it |

**Actions to track:**

| Action | Details |
|--------|---------|
| `task.created` | - |
| `task.status_changed` | `{ from, to }` |
| `task.assigned` | `{ to }` |
| `task.unassigned` | `{ from }` |
| `task.edited` | `{ fields: [...] }` |
| `task.moved_to_project` | `{ projectId }` |
| `task.deleted` | - |
| `subtask.created` | `{ subtaskId }` |
| `subtask.completed` | `{ subtaskId }` |
| `subtask.promoted` | `{ subtaskId, newTaskId }` |
| `project.created` | - |
| `project.status_changed` | `{ from, to }` |
| `project.edited` | `{ fields: [...] }` |

---

## Views

### 1. My Tasks

**Purpose:** See what's on my plate.

**Shows:**
- Quick tasks (private + shared assigned to me)
- Project tasks assigned to me

**Filters:**
- Status: todo, in_progress, done (default: todo + in_progress)
- High priority toggle

**Actions:**
- Create quick task
- Change status
- Click to open task detail

---

### 2. Team Pool

**Purpose:** See unassigned work, grab tasks.

**Shows:**
- Shared quick tasks (unassigned)
- Project tasks (unassigned)

**Filters:**
- Status: todo, in_progress
- Project (optional)
- High priority toggle

**Actions:**
- "Grab" = assign to myself
- Click to open task detail

---

### 3. Projects List

**Purpose:** See all projects.

**Shows:**
- All projects with status

**Filters:**
- Status: active, on_hold, completed, archived (default: active)

**Actions:**
- Create project
- Click to open project view

---

### 4. Project View

**Purpose:** See all tasks in a project.

**Shows:**
- All tasks in the project
- Task count by status

**Filters:**
- Status: todo, in_progress, done
- Assignee: me, unassigned, anyone, specific person
- High priority toggle

**Actions:**
- Create task
- Change task status
- Assign/unassign
- Click to open task detail

---

### 5. Task Detail

**Purpose:** Full task view with all details.

**Shows:**
- Task title, description, status, priority, assignee
- Subtasks list
- Work logs + activity logs (combined timeline)

**Actions:**
- Edit task
- Change status
- Assign/unassign
- Add subtask
- Complete/edit/promote subtask
- Add work log
- Delete task (with confirmation)

**Timeline display:**
```
Today
  10:30 - You changed status to "in progress"
  10:45 - You logged work (45 min)
          "Investigated the auth issue..."

Yesterday
  14:00 - Sarah assigned this to you
  09:00 - Sarah created this task
```

---

### 6. Search

**Purpose:** Find tasks and projects quickly.

**Behavior:**
- Single search box in header
- Searches: task titles, task descriptions, project names
- Returns matching tasks and projects
- Click result to navigate

**Phase 1 scope:**
- Simple text search (contains)
- No filters in search
- No advanced syntax

---

### Navigation Structure

```
Header:
  [Logo]  [Search box]  [User menu]

Sidebar:
  My Tasks
  Team Pool
  ──────────
  Projects
    + New Project
    Project A
    Project B
    ...
```

---

## Not in Phase 1

These features are documented in the main design but deferred:

| Feature | Deferred to |
|---------|-------------|
| Clients | Phase 3 |
| Client users & permissions | Phase 4 |
| Comments & questions | Phase 2 |
| Checklists & templates | Phase 2 |
| Resources (links, docs) | Phase 5 |
| Kanban board view | Phase 2 |
| Notifications / "What's New" | Phase 3 |
| Dashboard / overview | Phase 2 |
| Time aggregation reports | Phase 3 |

---

## Convex Schema

```typescript
// convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  organizations: defineTable({
    name: v.string(),
    type: v.union(v.literal("provider"), v.literal("client")),
    parentOrgId: v.optional(v.id("organizations")),
    createdAt: v.number(),
    createdBy: v.optional(v.id("users")), // optional for bootstrap
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")), // optional for bootstrap
  }),

  users: defineTable({
    email: v.string(),
    name: v.string(),
    orgId: v.id("organizations"),
    createdAt: v.number(),
    createdBy: v.optional(v.id("users")), // optional for first user
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")), // optional for first user
  })
    .index("by_email", ["email"])
    .index("by_org", ["orgId"]),

  projects: defineTable({
    name: v.string(),
    orgId: v.id("organizations"),
    clientId: v.optional(v.id("clients")), // Phase 3
    status: v.union(
      v.literal("active"),
      v.literal("on_hold"),
      v.literal("completed"),
      v.literal("archived")
    ),
    createdAt: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_org", ["orgId"])
    .index("by_org_status", ["orgId", "status"]),

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("done")
    ),
    isHighPriority: v.boolean(),
    visibility: v.union(v.literal("private"), v.literal("shared")),
    projectId: v.optional(v.id("projects")),
    orgId: v.id("organizations"),
    assigneeId: v.optional(v.id("users")),
    createdAt: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_org", ["orgId"])
    .index("by_project", ["projectId"])
    .index("by_assignee", ["assigneeId"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_project_status", ["projectId", "status"])
    .searchIndex("search_title_description", {
      searchField: "title",
      filterFields: ["orgId", "projectId", "status"],
    }),

  subtasks: defineTable({
    taskId: v.id("tasks"),
    title: v.string(),
    status: v.union(
      v.literal("todo"),
      v.literal("done"),
      v.literal("promoted")
    ),
    assigneeId: v.optional(v.id("users")),
    position: v.number(),
    promotedToTaskId: v.optional(v.id("tasks")),
    createdAt: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_task", ["taskId"])
    .index("by_task_position", ["taskId", "position"]),

  taskLinks: defineTable({
    sourceTaskId: v.id("tasks"),
    targetTaskId: v.id("tasks"),
    relationship: v.union(
      v.literal("spawned_from"),
      v.literal("blocked_by")
    ),
    createdAt: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_source", ["sourceTaskId"])
    .index("by_target", ["targetTaskId"]),

  workLogs: defineTable({
    taskId: v.id("tasks"),
    body: v.string(),
    timeMinutes: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_task", ["taskId"]),

  activityLogs: defineTable({
    taskId: v.optional(v.id("tasks")),
    projectId: v.optional(v.id("projects")),
    orgId: v.id("organizations"),
    action: v.string(),
    details: v.optional(v.any()),
    createdAt: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_task", ["taskId"])
    .index("by_project", ["projectId"])
    .index("by_org", ["orgId"]),
});
```

---

## Summary

**Phase 1 delivers:**
- Organizations (single org, multi-org ready)
- Users (team members)
- Projects (no clients yet)
- Tasks (project tasks + quick tasks with private/shared)
- Subtasks (with promotion)
- Task links (spawned_from, blocked_by)
- Work logs (manual time + notes)
- Activity logs (auto audit trail)
- Views: My Tasks, Team Pool, Projects, Project View, Task Detail, Search

**Phase 1 defers:**
- Clients and client users
- Permissions (all team members have full access)
- Comments, questions, checklists
- Kanban view
- Dashboard
- Notifications
