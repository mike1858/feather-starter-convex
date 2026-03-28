# Design: Core Task Management

## Overview

Technical design for core task functionality including quick task creation, status management, priority handling, and the My Tasks view.

## Data Model

### tasks
| Field | Type | Description |
|-------|------|-------------|
| _id | Id | Primary key |
| title | string | Task title |
| description | string? | Task description |
| status | "todo" \| "in_progress" \| "done" | Task status |
| isHighPriority | boolean | Priority flag |
| visibility | "private" \| "shared" | Access level for quick tasks |
| projectId | Id? | Parent project (null = quick task) |
| orgId | Id | Owning organization |
| assigneeId | Id? | Assigned user |
| createdAt | number | Timestamp |
| createdBy | Id | Creator |
| updatedAt | number | Last modified |
| updatedBy | Id | Last modifier |

**Indexes:** by_org, by_project, by_assignee, by_org_status, by_project_status
**Search:** search_title

## API Design

### Task Functions

| Function | Type | Description |
|----------|------|-------------|
| tasks.create | mutation | Create task with visibility logic |
| tasks.update | mutation | Update task with org validation |
| tasks.remove | mutation | Delete task with cascade |
| tasks.get | query | Get task by ID with org check |
| tasks.listMyTasks | query | Tasks assigned to current user |

### tasks.create Logic
```typescript
// Quick task creation defaults
{
  title: string,           // Required
  status: "todo",          // Default
  isHighPriority: false,   // Default
  visibility: "private",   // Default for quick tasks
  projectId: null,         // Quick task = no project
  assigneeId: currentUser, // Auto-assign to creator
}
```

### tasks.listMyTasks Query
```typescript
// Filter parameters
{
  status?: "todo" | "in_progress" | "done",
  isHighPriority?: boolean,
}

// Returns tasks where assigneeId === currentUserId
// Includes both quick tasks and project tasks
```

## Component Design

### Frontend Components

```
src/components/tasks/
├── TaskList.tsx          # Container for task rows
├── TaskRow.tsx           # Single task item display
├── InlineTaskForm.tsx    # Quick task creation
└── TaskFilters.tsx       # Status/priority filters
```

### TaskRow Display
- Title (primary text)
- Status badge (colored pill)
- Priority indicator (icon if high priority)
- Project name (if applicable, secondary text)

### TaskFilters State
```typescript
type TaskFilters = {
  status: "all" | "todo" | "in_progress" | "done";
  highPriorityOnly: boolean;
};
```

## Key Design Decisions

### Quick Task Visibility
- Quick tasks (no project) default to private
- Private = only visible to creator
- Visibility changes based on assignment (covered in team-collaboration spec)

### Status Flow
```
todo ──> in_progress ──> done
  ^           │           │
  └───────────┴───────────┘
```
Any status can transition to any other status.

## Correctness Properties

### P1: Quick Task Default Privacy
New quick tasks created without explicit visibility are private to the creator.

### P2: Status Persistence
Task status changes are immediately persisted and reflected in queries.

### P3: My Tasks Completeness
The My Tasks view shows all and only tasks where assigneeId equals the current user.

## UI/UX Design

### My Tasks View Layout
```
┌─────────────────────────────────────────────────────────┐
│ My Tasks                          [Filters: Status ▼]   │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ + Add a task...                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔴 Fix login bug              [in_progress] Proj A  │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │    Review PR #123             [todo]                │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Status Badge Colors
| Status | Background | Text |
|--------|------------|------|
| todo | gray/20 | gray |
| in_progress | blue/20 | blue |
| done | green/20 | green |
