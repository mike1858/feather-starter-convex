# Requirements: Task Details & Subtasks

## Introduction

Detailed task viewing and editing capabilities including the slide-over panel, inline editing, subtask management, and subtask promotion. This spec enables deep task interaction.

## Glossary

- **Subtask**: A smaller unit of work within a task, with position ordering and promotion capability.
- **Task_Link**: A relationship between two tasks (spawned_from, blocked_by).
- **Slide-Over**: A panel that slides in from the right side showing task details.

## Requirements

### Requirement 1: Task Detail View

**User Story:** As a team member, I want to view full task details, so that I can understand the complete context of work.

#### Acceptance Criteria

1.1 WHEN I click on a task, I SHALL see its full details including title, description, status, priority, project, and assignee
1.2 THE task details SHALL appear as a slide-over panel on the right side of the screen
1.3 I SHALL be able to close the panel by clicking outside or pressing Escape
1.4 WHILE viewing task details, I SHALL still see the task list behind the panel for context

### Requirement 2: Inline Task Editing

**User Story:** As a team member, I want to edit task details inline, so that I can quickly update information without navigating away.

#### Acceptance Criteria

2.1 I SHALL be able to edit the task title by clicking on it
2.2 I SHALL be able to edit the task description by clicking on it
2.3 WHEN editing, I SHALL save by pressing Enter (single-line) or Cmd+Enter (multi-line) or clicking away
2.4 WHEN editing, I SHALL cancel and revert by pressing Escape
2.5 I SHALL be able to toggle priority with a single click
2.6 WHEN a task is unassigned, I SHALL see an "Assign to me" button

### Requirement 3: Task Deletion

**User Story:** As a team member, I want to delete tasks, so that I can remove work that is no longer needed.

#### Acceptance Criteria

3.1 I SHALL see a delete button in the task detail view
3.2 WHEN I click delete, I SHALL see a confirmation dialog before the task is removed
3.3 WHEN I confirm deletion, ALL associated subtasks, work logs, and links SHALL be removed
3.4 AFTER deleting a task, THE detail panel SHALL close

### Requirement 4: Subtask Creation and Management

**User Story:** As a team member, I want to break down tasks into subtasks, so that I can track granular progress.

#### Acceptance Criteria

4.1 I SHALL be able to add subtasks to any task by providing a title
4.2 I SHALL be able to mark subtasks as done using a checkbox
4.3 I SHALL see subtasks in a consistent order that I can rearrange by dragging
4.4 SUBTASKS SHALL have status: todo, done, or promoted

### Requirement 5: Subtask Promotion

**User Story:** As a team member, I want to promote a subtask to a full task, so that I can properly track work that grew in scope.

#### Acceptance Criteria

5.1 I SHALL be able to promote any subtask to become a full task
5.2 WHEN I promote a subtask, A new task SHALL be created with the subtask's title
5.3 THE new task SHALL be linked to the parent task with a "spawned from" relationship
5.4 THE original subtask SHALL show as "promoted" with a link to the new task
5.5 THE new task SHALL inherit the parent task's project (if any)
