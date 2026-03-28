# Tasks: Task Details & Subtasks

## Task 1: Frontend - Task Slide-Over Panel

- [ ] 1.1 Create TaskSlideOver.tsx component
- [ ] 1.2 Implement slide-in animation from right
- [ ] 1.3 Add close on click outside
- [ ] 1.4 Add close on Escape key
- [ ] 1.5 Display task title, description, status, priority, project, assignee

## Task 2: Frontend - Inline Editing

- [ ] 2.1 Create EditableText.tsx component
- [ ] 2.2 Support single-line mode (save on Enter)
- [ ] 2.3 Support multi-line mode (save on Cmd+Enter)
- [ ] 2.4 Cancel on Escape
- [ ] 2.5 Save on blur

## Task 3: Frontend - Task Detail Editing

- [ ] 3.1 Make title editable with EditableText
- [ ] 3.2 Make description editable with EditableText (multi-line)
- [ ] 3.3 Add status dropdown
- [ ] 3.4 Add priority toggle button
- [ ] 3.5 Add delete button with confirmation

## Task 4: Backend - Subtask CRUD

- [ ] 4.1 Implement `subtasks.create` mutation
- [ ] 4.2 Implement `subtasks.update` mutation
- [ ] 4.3 Implement `subtasks.remove` mutation
- [ ] 4.4 Implement `subtasks.listByTask` query ordered by position

## Task 5: Backend - Subtask Reordering

- [ ] 5.1 Implement `subtasks.reorder` mutation
- [ ] 5.2 Update positions for affected subtasks

## Task 6: Backend - Subtask Promotion

- [ ] 6.1 Implement `subtasks.promote` mutation
- [ ] 6.2 Create new task with subtask title
- [ ] 6.3 Inherit parent task's project
- [ ] 6.4 Create spawned_from task link
- [ ] 6.5 Update subtask status to promoted with link to new task

## Task 7: Frontend - Subtask List

- [ ] 7.1 Create SubtaskList.tsx component
- [ ] 7.2 Add subtask creation input
- [ ] 7.3 Display subtasks with checkboxes
- [ ] 7.4 Add drag-to-reorder functionality
- [ ] 7.5 Add promote button for each subtask
- [ ] 7.6 Show promoted subtasks with link to new task
