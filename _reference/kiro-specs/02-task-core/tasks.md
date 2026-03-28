# Tasks: Core Task Management

## Task 1: Backend - Task CRUD

- [ ] 1.1 Implement `tasks.create` mutation with visibility logic
- [ ] 1.2 Implement `tasks.update` mutation with org validation
- [ ] 1.3 Implement `tasks.remove` mutation with cascade delete
- [ ] 1.4 Implement `tasks.get` query with org check
- [ ] 1.5 Add task search index on title field

## Task 2: Backend - My Tasks Query

- [ ] 2.1 Implement `tasks.listMyTasks` query filtering by assigneeId
- [ ] 2.2 Add status filter parameter
- [ ] 2.3 Add priority filter parameter

## Task 3: Frontend - Task List Component

- [ ] 3.1 Create TaskList.tsx container component
- [ ] 3.2 Create TaskRow.tsx with title, status badge, priority indicator
- [ ] 3.3 Add click handler to select task
- [ ] 3.4 Display project name for project tasks

## Task 4: Frontend - My Tasks View

- [ ] 4.1 Create My Tasks page with TaskList
- [ ] 4.2 Add status filter dropdown (todo, in_progress, done)
- [ ] 4.3 Add high priority filter toggle
- [ ] 4.4 Wire up task selection to open slide-over

## Task 5: Frontend - Quick Task Creation

- [ ] 5.1 Create inline task form for quick task entry
- [ ] 5.2 Implement title-only creation (defaults: todo, normal priority, private)
- [ ] 5.3 Add form to My Tasks view
