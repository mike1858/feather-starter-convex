# Tasks: Authentication & Organization

## Task 1: Backend - Authentication & Organization Setup

- [ ] 1.1 Implement atomic signup mutation that creates organization and user together
- [ ] 1.2 Add email/password authentication with Convex Auth
- [ ] 1.3 Implement sign-out mutation
- [ ] 1.4 Create `getAuthenticatedUser` helper that throws if not authenticated
- [ ] 1.5 Create `organizations.getCurrent` query to get user's organization

## Task 2: Backend - Organization Isolation Helpers

- [ ] 2.1 Create `withOrgAccess` helper to enforce org-scoped queries
- [ ] 2.2 Create `getTaskWithOrgCheck` helper for task access validation
- [ ] 2.3 Create `getProjectWithOrgCheck` helper for project access validation
- [ ] 2.4 Add org-scoped indexes to schema (by_org on tasks, projects)

## Task 3: Frontend - Auth UI

- [ ] 3.1 Create signup form with email, password, name, and organization name fields
- [ ] 3.2 Create login form with email and password
- [ ] 3.3 Add error handling for failed auth attempts
- [ ] 3.4 Implement auth state wrapper in App.tsx
