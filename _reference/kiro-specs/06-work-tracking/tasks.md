# Tasks: Work Tracking & History

## Task 1: Backend - Work Log CRUD

- [ ] 1.1 Implement `workLogs.create` mutation
- [ ] 1.2 Implement `workLogs.update` mutation
- [ ] 1.3 Implement `workLogs.remove` mutation
- [ ] 1.4 Implement `workLogs.listByTask` query

## Task 2: Backend - Activity Logging

- [ ] 2.1 Create internal `activityLogs.log` function
- [ ] 2.2 Log task created, status_changed, assigned, unassigned, edited events
- [ ] 2.3 Log subtask created, completed, promoted events
- [ ] 2.4 Log project created, status_changed, edited events
- [ ] 2.5 Implement `activityLogs.listByTask` query

## Task 3: Backend - Task Timeline

- [ ] 3.1 Implement `activityLogs.getTaskTimeline` query
- [ ] 3.2 Combine activity logs and work logs
- [ ] 3.3 Sort by timestamp descending

## Task 4: Frontend - Work Log UI

- [ ] 4.1 Add work log section to task slide-over
- [ ] 4.2 Create work log entry form (description + optional time)
- [ ] 4.3 Display work logs with author and timestamp

## Task 5: Frontend - Activity Timeline

- [ ] 5.1 Create timeline component in task slide-over
- [ ] 5.2 Display activity entries with icons by type
- [ ] 5.3 Show relative timestamps ("2 hours ago")
- [ ] 5.4 Interleave work logs with activity entries

## Task 6: Backend - Task Links

- [ ] 6.1 Implement `taskLinks.create` mutation
- [ ] 6.2 Implement `taskLinks.remove` mutation
- [ ] 6.3 Implement `taskLinks.getByTask` query
- [ ] 6.4 Clean up links on task delete

## Task 7: Frontend - Task Links UI

- [ ] 7.1 Display spawned_from links in task detail
- [ ] 7.2 Display blocked_by links in task detail
- [ ] 7.3 Add "Block by" action to create blocked_by link
