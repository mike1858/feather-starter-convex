# Tasks: Team Collaboration

## Task 1: Backend - Team Pool Query

- [ ] 1.1 Implement `tasks.listTeamPool` query (unassigned + shared visibility)
- [ ] 1.2 Add status filter parameter
- [ ] 1.3 Add project filter parameter
- [ ] 1.4 Add priority filter parameter

## Task 2: Backend - Task Assignment Logic

- [ ] 2.1 Update `tasks.update` to handle visibility changes on assignment
- [ ] 2.2 When assigning quick task to non-creator, set visibility to shared
- [ ] 2.3 When unassigning quick task, set visibility to shared

## Task 3: Backend - Users Query

- [ ] 3.1 Implement `users.listByOrg` query for team member list
- [ ] 3.2 Implement `users.get` query with org check

## Task 4: Frontend - Team Pool View

- [ ] 4.1 Create Team Pool page with TaskList
- [ ] 4.2 Add status filter (todo, in_progress)
- [ ] 4.3 Add project filter dropdown
- [ ] 4.4 Add priority filter toggle
- [ ] 4.5 Add "Grab" button to assign task to self

## Task 5: Frontend - Task Assignment UI

- [ ] 5.1 Add assignee dropdown to task detail view
- [ ] 5.2 Show team members from `users.listByOrg`
- [ ] 5.3 Add "Assign to me" quick action for unassigned tasks
