# CalmDo — Domain Model

## Entity Relationship Overview

```
Organization
├── Members (Owner / Manager / Editor / Viewer)
├── Checklist Templates (org-level)
├── Resources (org-level knowledge base)
│
└── Clients (Phase 3)
    └── Projects
        ├── Checklist Templates (project-level)
        ├── Resources (project-level)
        │
        └── Tasks
            ├── Subtasks (promotable to tasks)
            ├── Task Checklist (from template, customizable)
            ├── Questions (Phase 2)
            ├── Comments (Phase 2)
            ├── Work Logs (with optional time)
            ├── Task Links (blocks, spawned_from, related_to)
            └── Resources (task-level)

Quick Tasks (standalone, no project, private or shared)
```

## Standard Audit Fields (All Tables)

| Field | Type | When Set |
|-------|------|----------|
| createdAt | number | On create (`Date.now()`) |
| createdBy | user ref | Current user |
| updatedAt | number | On create + every update |
| updatedBy | user ref | Current user |

**Exception:** `users` table only has `createdAt`/`updatedAt` (Convex Auth constraints).

**Why always populate updatedAt?** ETL incremental loads: `WHERE updatedAt > lastSync` captures both new and updated records.

---

## Entities

### Organization

| Field | Type | Notes |
|-------|------|-------|
| name | string | Company name |
| type | enum | `provider` (your team) or `client` (future) |
| parentOrgId | org ref | For client orgs → points to provider |

**Phase 1:** Only your org exists (`type: "provider"`). Multi-org schema from day one, but UI assumes single org until Phase 6.

**Atomic Signup:** Org is created atomically with user during signup. User never exists without an org.

### User

| Field | Type | Notes |
|-------|------|-------|
| email | string | From Convex Auth |
| name | string | Display name |
| orgId | org ref | Which org they belong to |

All custom fields must be `v.optional()` (Convex Auth doesn't guarantee them during creation). No `createdBy`/`updatedBy` — first user can't reference themselves.

### Project

| Field | Type | Notes |
|-------|------|-------|
| name | string | Required, max 100 chars |
| description | string | Optional |
| orgId | org ref | Your org |
| clientId | client ref | Phase 3 — nullable |
| status | enum | `active`, `on_hold`, `completed`, `archived` |

**Delete policy:** Deleting a project deletes its tasks and work logs.

### Task

| Field | Type | Notes |
|-------|------|-------|
| title | string | Required, max 200 chars |
| description | text | Optional, markdown |
| status | enum | `todo`, `in_progress`, `done` (configurable per org/project) |
| isHighPriority | boolean | Default false |
| visibility | enum | `private`, `shared` |
| projectId | project ref | Null = quick task |
| orgId | org ref | Always set |
| assigneeId | user ref | Null = in the pool |
| position | integer | Sort order (drag-drop) |

**Quick task rules:**
- Create → `private`, `assigneeId: creator`
- Assign to someone else → auto-flips to `shared`
- Can only be `private` when `assigneeId` is creator
- Move to project → set `projectId`, visibility no longer applies

**Task types by combination:**

| projectId | visibility | What it is |
|-----------|------------|------------|
| null | `private` | My personal quick task |
| null | `shared` | Team quick task (pool) |
| set | — | Project task |

### Subtask

| Field | Type | Notes |
|-------|------|-------|
| taskId | task ref | Parent task |
| title | string | Required |
| status | enum | `todo`, `done`, `promoted` |
| assigneeId | user ref | Optional, can differ from parent |
| position | number | Sort order |
| promotedToTaskId | task ref | If promoted, link to new task |

**Promotion flow:**
1. Click "Promote to task"
2. New task created with subtask's title
3. New task gets `spawned_from` link to parent
4. Subtask status → `promoted`, `promotedToTaskId` → new task
5. Subtask visible as "Promoted → [link]"

### Task Link

| Field | Type | Notes |
|-------|------|-------|
| sourceTaskId | task ref | Origin task |
| targetTaskId | task ref | Linked task |
| relationship | enum | `spawned_from`, `blocks`, `blocked_by`, `related_to` |

### Work Log

| Field | Type | Notes |
|-------|------|-------|
| taskId | task ref | Parent task |
| body | text | What was done, learnings |
| timeMinutes | number | Optional (not a time-tracking app, but useful when needed) |

Any user can log time on any task (not just the assignee). Multiple logs per task (each work session).

### Activity Log

Auto-generated audit trail.

| Field | Type | Notes |
|-------|------|-------|
| taskId | task ref | Nullable |
| projectId | project ref | Nullable |
| orgId | org ref | Always set |
| action | string | What happened |
| details | object | Additional context (JSON) |

**Actions tracked:** `task.created`, `task.status_changed`, `task.assigned`, `task.unassigned`, `task.edited`, `task.moved_to_project`, `task.deleted`, `subtask.created`, `subtask.completed`, `subtask.promoted`, `project.created`, `project.status_changed`, `project.edited`

---

## Phase 2+ Entities

### Question (Phase 2)

| Field | Type | Notes |
|-------|------|-------|
| taskId | task ref | Parent task |
| subject | string | Question title |
| details | text | Context |
| status | enum | `open`, `has_responses`, `closed` |
| assignees | user refs | Who should answer |

### Comment (Phase 2)

| Field | Type | Notes |
|-------|------|-------|
| taskId | task ref | Parent task |
| body | text | Content |
| type | enum | `discussion`, `decision`, `note` |
| parentCommentId | comment ref | For threading (nullable) |
| mentions | user refs | Mentioned users |

### Checklist Template (Phase 2)

Reusable lists stored at project or org level.

| Field | Type | Notes |
|-------|------|-------|
| name | string | "Done Checklist", "QA Checklist" |
| scope | enum | `project` or `org` |
| items | list | Template items with title + position |

### Resource (Phase 5)

| Field | Type | Notes |
|-------|------|-------|
| url | string | Link |
| type | enum | `article`, `video`, `docs`, `tool` |
| title | string | Auto-fetched or manual |
| notes | text | Why it's useful |
| scope | enum | `task`, `project`, `org` |

---

## Roles & Permissions (Phase 4)

| Permission | Owner | Manager | Editor | Viewer |
|------------|:-----:|:-------:|:------:|:------:|
| Delete org | x | | | |
| Edit org settings | x | x | | |
| Invite/remove people | x | x | | |
| Create/delete projects | x | x | | |
| Edit project details | x | x | | |
| View projects | x | x | x | x |
| Create tasks | x | x | x | |
| Edit any task | x | x | x | |
| Delete any task | x | x | | |
| Delete own task | x | x | x | |
| Assign tasks | x | x | x | |
| Complete tasks | x | x | x | |
| View tasks | x | x | x | x |

### Visibility Rules

- **Quick Task** (no project): Private to creator
- **Project Task**: Visible to all project members
- **Assigned Task**: Visible to assignee + project members

---

## Convex Schema (Phase 1)

See [_methodologies/superpowers/2026-01-28-phase1-design.md](../_methodologies/superpowers/2026-01-28-phase1-design.md) for the complete `schema.ts` with indexes.

Phase 1 tables: `organizations`, `users`, `projects`, `tasks`, `subtasks`, `taskLinks`, `workLogs`, `activityLogs`

Phase 2+ adds: `questions`, `comments`, `checklistTemplates`, `taskChecklists`, `resources`
