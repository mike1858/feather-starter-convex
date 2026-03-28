# Tasks: Project Management

## Task 1: Backend - Project CRUD

- [ ] 1.1 Implement `projects.create` mutation
- [ ] 1.2 Implement `projects.update` mutation
- [ ] 1.3 Implement `projects.remove` mutation with cascade delete of tasks
- [ ] 1.4 Implement `projects.get` query with org check
- [ ] 1.5 Implement `projects.list` query with task count

## Task 2: Backend - Project Tasks Query

- [ ] 2.1 Implement `tasks.listByProject` query
- [ ] 2.2 Add status filter parameter
- [ ] 2.3 Add assignee filter parameter
- [ ] 2.4 Add priority filter parameter

## Task 3: Frontend - Project List View

- [ ] 3.1 Create ProjectList.tsx with card grid layout
- [ ] 3.2 Create ProjectCard.tsx with name, status badge, task count
- [ ] 3.3 Add status filter (default: active only)
- [ ] 3.4 Add click handler to navigate to project

## Task 4: Frontend - Project Card Menu

- [ ] 4.1 Add dropdown menu to ProjectCard
- [ ] 4.2 Add edit option to rename project
- [ ] 4.3 Add delete option with confirmation dialog

## Task 5: Frontend - Project View

- [ ] 5.1 Create project detail page with TaskList
- [ ] 5.2 Add status filter dropdown
- [ ] 5.3 Add assignee filter (me, unassigned, anyone, specific person)
- [ ] 5.4 Add priority filter toggle
- [ ] 5.5 Display task count by status

## Task 6: Frontend - Project Task Creation

- [ ] 6.1 Add task creation form to project view
- [ ] 6.2 Auto-associate new tasks with current project
- [ ] 6.3 Set visibility to shared for project tasks

## Task 7: Backend - Move Task Between Projects

- [ ] 7.1 Add projectId update logic to `tasks.update`
- [ ] 7.2 When moving to project, set visibility to shared
- [ ] 7.3 When removing from project, set visibility based on assignee/creator

## Task 8: Frontend - Move Task UI

- [ ] 8.1 Add project selector to task detail view
- [ ] 8.2 Show "No project" option to convert to quick task
- [ ] 8.3 Update task on project change
