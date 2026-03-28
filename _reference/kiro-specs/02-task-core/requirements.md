# Requirements: Core Task Management

## Introduction

Core task functionality for individual users including quick task creation, status management, priority handling, and the personal "My Tasks" view. This spec covers the fundamental task operations before team collaboration features.

## Glossary

- **Task**: A unit of work with status, priority, visibility, and optional project association.
- **Quick_Task**: A task without a project association, used for personal or team todos.
- **My_Tasks**: View showing tasks assigned to the current user.
- **Visibility**: Access level for quick tasks - private (only creator) or shared (team-visible).

## Requirements

### Requirement 1: Quick Task Creation

**User Story:** As a team member, I want to quickly jot down a task without picking a project, so that I don't forget things I need to do.

#### Acceptance Criteria

1.1 WHEN I create a task without selecting a project, IT SHALL be created as my personal quick task
1.2 MY personal quick tasks SHALL be private to me by default (teammates cannot see them)
1.3 I SHALL only need to provide a title to create a quick task
1.4 NEW quick tasks SHALL start with status "todo" and normal priority

### Requirement 2: Task Status Management

**User Story:** As a team member, I want to update task status, so that I can track progress through my workflow.

#### Acceptance Criteria

2.1 I SHALL be able to set task status to: todo, in progress, or done
2.2 WHEN I change a task's status, THE change SHALL be saved immediately
2.3 WHEN I change a task's status, THE change SHALL appear in the task's activity history

### Requirement 3: Task Priority

**User Story:** As a team member, I want to mark tasks as high priority, so that I can signal urgency to myself and my team.

#### Acceptance Criteria

3.1 I SHALL be able to mark any task as high priority
3.2 I SHALL be able to remove the high priority flag from a task
3.3 NEW tasks SHALL default to normal priority
3.4 HIGH priority tasks SHALL be visually distinguished in task lists

### Requirement 4: My Tasks View

**User Story:** As a team member, I want to see all tasks assigned to me, so that I know what I need to work on.

#### Acceptance Criteria

4.1 THE My Tasks view SHALL show all tasks assigned to me (both quick tasks and project tasks)
4.2 I SHALL be able to filter by status (todo, in progress, done)
4.3 I SHALL be able to filter to show only high priority tasks
4.4 EACH task SHALL display its title, status, priority indicator, and project name (if applicable)
4.5 I SHALL be able to click a task to view its details
