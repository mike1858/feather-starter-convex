# Design: Task Details & Subtasks

## Overview

Technical design for task detail viewing, inline editing, subtask management, and subtask promotion.

## Data Model

### subtasks
| Field | Type | Description |
|-------|------|-------------|
| _id | Id | Primary key |
| taskId | Id | Parent task |
| title | string | Subtask title |
| status | "todo" \| "done" \| "promoted" | Subtask status |
| position | number | Sort order |
| promotedToTaskId | Id? | Link to promoted task |
| createdAt | number | Timestamp |
| createdBy | Id | Creator |

**Indexes:** by_task, by_task_position

### taskLinks
| Field | Type | Description |
|-------|------|-------------|
| sourceTaskId | Id | Origin task |
| targetTaskId | Id | Linked task |
| relationship | "spawned_from" \| "blocked_by" | Link type |

## API Design

### Subtask Functions

| Function | Type | Description |
|----------|------|-------------|
| subtasks.create | mutation | Create subtask |
| subtasks.update | mutation | Update subtask |
| subtasks.remove | mutation | Delete subtask |
| subtasks.reorder | mutation | Change positions |
| subtasks.promote | mutation | Promote to task |
| subtasks.listByTask | query | List task's subtasks |
