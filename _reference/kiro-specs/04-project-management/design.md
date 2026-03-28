# Design: Project Management

## Overview

Technical design for project organization including project CRUD, project-based task views, and task movement between projects.

## Data Model

### projects
| Field | Type | Description |
|-------|------|-------------|
| _id | Id | Primary key |
| name | string | Project name |
| orgId | Id | Owning organization |
| status | "active" \| "on_hold" \| "completed" \| "archived" | Project status |
| createdAt | number | Timestamp |
| createdBy | Id | Creator |
| updatedAt | number | Last modified |
| updatedBy | Id | Last modifier |

**Indexes:** by_org, by_org_status
**Search:** search_name (name field, filtered by orgId)

### Task-Project Relationship
- `tasks.projectId` references `projects._id`
- `projectId = null` means quick task (no project)
- Project tasks always have `visibility = "shared"`

## API Design

### Project Functions

| Function | Type | Description |
|----------|------|-------------|
| projects.create | mutation | Create project |
| projects.update | mutation | Update project |
| projects.remove | mutation | Delete project + cascade tasks |
| projects.get | query | Get project by ID |
| projects.list | query | List projects with task counts |

### Project Tasks Query

| Function | Type | Description |
|----------|------|-------------|
| tasks.listByProject | query | Tasks in a project |

```typescript
// Filter parameters
{
  projectId: Id<"projects">,
  status?: "todo" | "in_progress" | "done",
  assigneeId?: Id<"users"> | "me" | "unassigned",
  isHighPriority?: boolean,
}
```

### Move Task Logic

```typescript
// In tasks.update when projectId changes:
if (newProjectId !== null) {
  // Moving to a project
  visibility = "shared";
} else {
  // Removing from project (becoming quick task)
  if (assigneeId === createdBy) {
    visibility = "private";
  } else {
    visibility = "shared";
  }
}
```

## Component Design

### Frontend Components

```
src/components/projects/
├── ProjectList.tsx       # Card grid layout
├── ProjectCard.tsx       # Single project card
├── ProjectForm.tsx       # Create/edit project
└── ProjectMenu.tsx       # Edit/delete dropdown
```

### Project Card Layout
```
┌─────────────────────────────────────────┐
│ Project Name                    [⋮]     │
│ ┌─────────┐                             │
│ │ active  │  12 tasks                   │
│ └─────────┘                             │
└─────────────────────────────────────────┘
```

### Project View Layout
```
┌─────────────────────────────────────────────────────────┐
│ Project Name                                            │
│ 3 todo · 2 in progress · 5 done                        │
├─────────────────────────────────────────────────────────┤
│ [Status ▼] [Assignee ▼] [☐ High Priority]              │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ + Add a task...                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [Task List]                                             │
└─────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Cascade Delete
Deleting a project deletes all its tasks, which cascades to:
- Subtasks
- Work logs
- Activity logs
- Task links

### Project Status Flow
```
active ──> on_hold ──> completed ──> archived
  ^           │            │
  └───────────┴────────────┘
```

### Task Count in Project List
`projects.list` returns task count per project for display efficiency.

## Correctness Properties

### P1: Project Task Visibility
All tasks with a non-null projectId have visibility "shared".

### P2: Cascade Delete Completeness
After deleting a project, no tasks reference that project ID.

### P3: Move Activity Logging
Moving a task to/from a project creates an activity log entry.

## Status Colors

| Status | Background | Text |
|--------|------------|------|
| active | green/20 | green |
| on_hold | amber/20 | amber |
| completed | gray/20 | gray |
| archived | gray/20 | gray (dimmed) |
