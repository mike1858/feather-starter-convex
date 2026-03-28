# Requirements: Team Collaboration

## Introduction

Team collaboration features enabling task assignment, sharing, and the team pool for unassigned work. This spec builds on core task management to enable multi-user workflows.

## Glossary

- **Team_Pool**: Collection of unassigned shared tasks available for team members to pick up.
- **Visibility**: Access level for quick tasks - private (only creator) or shared (team-visible).
- **Assignment**: Linking a task to a specific team member who is responsible for it.

## Requirements

### Requirement 1: Task Assignment and Sharing

**User Story:** As a team member, I want to assign tasks to teammates, so that work can be distributed and tracked.

#### Acceptance Criteria

1.1 I SHALL be able to assign any task to any team member in my organization
1.2 WHEN I assign my personal quick task to a teammate, IT SHALL become visible to the team
1.3 WHEN I unassign a quick task (remove assignee), IT SHALL become visible in the team pool
1.4 MY quick tasks SHALL only remain private when assigned to me (the creator)
1.5 WHEN I assign or unassign a task, THE change SHALL appear in the task's activity history

### Requirement 2: Team Pool View

**User Story:** As a team member, I want to see unassigned shared tasks, so that I can pick up work when I have capacity.

#### Acceptance Criteria

2.1 THE Team Pool SHALL show all unassigned tasks that are visible to the team
2.2 THE Team Pool SHALL include unassigned project tasks and shared quick tasks
2.3 I SHALL be able to filter by status (todo, in progress)
2.4 I SHALL be able to filter by project
2.5 I SHALL be able to filter to show only high priority tasks
2.6 I SHALL be able to "Grab" a task to assign it to myself

### Requirement 3: Team Member Directory

**User Story:** As a team member, I want to see who is on my team, so that I can assign tasks to the right people.

#### Acceptance Criteria

3.1 WHEN assigning tasks, I SHALL see a list of all team members in my organization
3.2 EACH team member SHALL display their name and email
3.3 I SHALL only see team members from my own organization
