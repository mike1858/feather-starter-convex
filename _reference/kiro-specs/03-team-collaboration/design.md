# Design: Team Collaboration

## Overview

Technical design for team collaboration features including task assignment, visibility rules, team pool, and team member directory.

## Data Model

### Task Visibility Rules

| Condition | Visibility |
|-----------|------------|
| Quick task assigned to creator | private |
| Quick task assigned to someone else | shared |
| Quick task unassigned | shared (team pool) |
| Project task | always shared |

Visibility is determined by: `assigneeId === createdBy` for quick tasks.

### users (relevant fields)
| Field | Type | Description |
|-------|------|-------------|
| _id | Id | Primary key |
| name | string? | Display name |
| email | string? | Email address |
| orgId | Id? | Organization membership |

## API Design

### Team Pool Query

| Function | Type | Description |
|----------|------|-------------|
| tasks.listTeamPool | query | Unassigned shared tasks |

```typescript
// Filter parameters
{
  status?: "todo" | "in_progress",
  projectId?: Id<"projects">,
  isHighPriority?: boolean,
}

// Returns tasks where:
// - assigneeId is null
// - visibility is "shared" OR projectId is not null
// - orgId matches current user
```

### User Functions

| Function | Type | Description |
|----------|------|-------------|
| users.listByOrg | query | List org members |
| users.get | query | Get user by ID (org-scoped) |

### Assignment Logic in tasks.update

```typescript
// When assigneeId changes:
if (task.projectId === null) {
  // Quick task visibility rules
  if (newAssigneeId === task.createdBy) {
    visibility = "private";
  } else {
    visibility = "shared";
  }
}
// Project tasks always stay "shared"
```

## Component Design

### Frontend Components

```
src/components/tasks/
├── TaskFilters.tsx       # Extended with project filter
└── AssigneeSelect.tsx    # Team member dropdown
```

### Team Pool View
```
┌─────────────────────────────────────────────────────────┐
│ Team Pool                    [Project ▼] [Status ▼]     │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔴 Deploy to staging        [todo] Proj A  [Grab]   │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │    Update docs              [todo]         [Grab]   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### AssigneeSelect Component
```typescript
type AssigneeSelectProps = {
  value: Id<"users"> | null;
  onChange: (userId: Id<"users"> | null) => void;
  showUnassigned?: boolean;
};
```

## Key Design Decisions

### Grab Action
"Grab" is a convenience action that:
1. Sets assigneeId to current user
2. Visibility automatically updates based on rules

### Team Member Display
- Show name (primary)
- Show email (secondary, for disambiguation)
- Only show users from same organization

## Correctness Properties

### P1: Visibility Consistency
A quick task's visibility equals "private" if and only if assigneeId equals createdBy.

### P2: Team Pool Completeness
Team Pool shows all and only tasks that are:
- Unassigned (assigneeId is null)
- Visible to team (shared visibility OR has projectId)
- In user's organization

### P3: Assignment Activity Logging
Every assignment change creates an activity log entry.

## Activity Logging

Assignment changes trigger activity logs:
- `assigned` - when task gets an assignee
- `unassigned` - when assignee is removed
- `reassigned` - when assignee changes (optional, can be two events)
