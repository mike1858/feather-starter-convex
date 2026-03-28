# Requirements: Project Management

## Introduction

Project organization features for grouping related tasks, managing project lifecycle, and navigating project-based work. Projects provide structure for larger initiatives.

## Glossary

- **Project**: A container for related tasks, belonging to an organization with status tracking.
- **Project_Task**: A task associated with a project, always has shared visibility.
- **Quick_Task**: A task without a project association, used for personal or team todos.

## Requirements

### Requirement 1: Project Creation and Management

**User Story:** As a team member, I want to create projects, so that I can organize related tasks together.

#### Acceptance Criteria

1.1 I SHALL be able to create a project by providing a name
1.2 NEW projects SHALL start with status "active"
1.3 I SHALL be able to change project status to: active, on hold, completed, or archived
1.4 I SHALL be able to rename projects
1.5 WHEN I change a project's status, THE change SHALL appear in the project's activity history

### Requirement 2: Project Task Creation

**User Story:** As a team member, I want to create tasks within a project, so that project work is organized together.

#### Acceptance Criteria

2.1 I SHALL be able to create tasks and associate them with a project
2.2 PROJECT tasks SHALL always be visible to the entire team (not private)
2.3 I SHALL only be able to add tasks to projects in my organization

### Requirement 3: Project View

**User Story:** As a team member, I want to see all tasks in a project, so that I can understand project progress.

#### Acceptance Criteria

3.1 WHEN I open a project, I SHALL see all tasks belonging to that project
3.2 I SHALL be able to filter by status (todo, in progress, done)
3.3 I SHALL be able to filter by assignee (me, unassigned, anyone, or a specific person)
3.4 I SHALL be able to filter to show only high priority tasks
3.5 I SHALL see a count of tasks by status (e.g., "3 todo, 2 in progress, 5 done")

### Requirement 4: Project List

**User Story:** As a team member, I want to see all projects, so that I can navigate to the work I need.

#### Acceptance Criteria

4.1 I SHALL see all projects in my organization
4.2 I SHALL be able to filter by status (default shows only active projects)
4.3 EACH project SHALL display its name, status, and number of tasks
4.4 PROJECTS SHALL be displayed as cards for easy scanning

### Requirement 5: Moving Tasks Between Projects

**User Story:** As a team member, I want to move tasks between projects, so that I can reorganize work as needed.

#### Acceptance Criteria

5.1 I SHALL be able to move a task from one project to another
5.2 I SHALL be able to remove a task from a project (making it a quick task)
5.3 WHEN I move a task to a project, IT SHALL become visible to the team
5.4 WHEN I remove a task from a project, IT SHALL become private if I'm the creator and assignee, otherwise it stays shared
5.5 WHEN I move a task, THE change SHALL appear in the task's activity history
