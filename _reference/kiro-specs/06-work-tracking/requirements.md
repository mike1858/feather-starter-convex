# Requirements: Work Tracking & History

## Introduction

Work logging and activity history features for documenting progress and understanding task evolution. This spec enables time tracking and audit trails.

## Glossary

- **Work_Log**: A manual entry documenting work done on a task with optional time tracking.
- **Activity_Log**: An auto-generated audit trail entry recording system events.
- **Task_Link**: A relationship between two tasks (spawned_from, blocked_by).

## Requirements

### Requirement 1: Work Log Creation

**User Story:** As a team member, I want to log work done on tasks, so that I can document progress and learnings.

#### Acceptance Criteria

1.1 I SHALL be able to add work log entries to any task
1.2 EACH work log SHALL have a text description of what was done
1.3 I SHALL be able to optionally record time spent in minutes
1.4 I SHALL be able to add multiple work logs to the same task

### Requirement 2: Activity Timeline

**User Story:** As a team member, I want to see the history of changes on a task, so that I can understand what happened.

#### Acceptance Criteria

2.1 I SHALL see a timeline of all changes made to a task (status changes, assignments, edits, etc.)
2.2 I SHALL see subtask events in the timeline (created, completed, promoted)
2.3 THE timeline SHALL show work logs mixed with activity entries in chronological order
2.4 EACH timeline entry SHALL show who made the change
2.5 EACH timeline entry SHALL show when it happened using relative time (e.g., "2 hours ago")

### Requirement 3: Task Links

**User Story:** As a team member, I want to see relationships between tasks, so that I can understand dependencies.

#### Acceptance Criteria

3.1 I SHALL see when a task was spawned from another task (e.g., from subtask promotion)
3.2 I SHALL be able to mark a task as blocked by another task
3.3 I SHALL see linked tasks displayed in the task detail view
3.4 WHEN I delete a task, ALL links to/from that task SHALL be removed
