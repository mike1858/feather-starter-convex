# Design: Work Tracking & History

## Overview

Technical design for work logging, activity timeline, and task relationships.

## Data Model

### workLogs
| Field | Type | Description |
|-------|------|-------------|
| _id | Id | Primary key |
| taskId | Id | Parent task |
| body | string | Work description |
| timeMinutes | number? | Time spent |
| createdAt | number | Timestamp |
| createdBy | Id | Creator |

**Indexes:** by_task

### activityLogs
| Field | Type | Description |
|-------|------|-------------|
| _id | Id | Primary key |
| taskId | Id? | Related task |
| projectId | Id? | Related project |
| orgId | Id | Organization |
| action | string | Event type |
| details | any? | Event details |
| createdAt | number | Timestamp |
| createdBy | Id | Actor |

**Indexes:** by_task, by_project, by_org

## API Design

### Work Log Functions

| Function | Type | Description |
|----------|------|-------------|
| workLogs.create | mutation | Create work log |
| workLogs.listByTask | query | List task's work logs |

### Activity Log Functions

| Function | Type | Description |
|----------|------|-------------|
| activityLogs.log | internal | Record activity |
| activityLogs.listByTask | query | List task activities |
| activityLogs.getTaskTimeline | query | Combined timeline |
