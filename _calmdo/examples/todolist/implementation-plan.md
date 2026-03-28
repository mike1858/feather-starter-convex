# TodoList Implementation Plan

**Spec:** `docs/specs/todolist/spec.md`
**Gherkin:** `docs/specs/todolist/gherkin.md`

**Goal:** Let users track their own tasks with create, view, toggle, delete, and edit.

**Approach:** Build backend (schema + Convex functions) first, then React component. Each task follows TDD - write failing test, then implement. Integration tests verify UI + database together using ConvexTestProvider.

---

## Tasks

### Task 1: Schema - Add todos table

**Implements:** Data Model (T1: todos)

**Files:**
- Implementation: `convex/schema.ts`

**Acceptance:**
- [ ] `todos` table exists with fields: text (string), completed (boolean), userId (Id<"users">)
- [ ] `npx convex dev` succeeds with new schema

**Depends on:** None

---

### Task 2: Backend - Create and list todos

**Implements:** TL-1 (Create), TL-2 (View)

**Files:**
- Test: `convex/todos.test.ts`
- Implementation: `convex/todos.ts`

**Acceptance:**
- [ ] `create` mutation: adds todo with text, completed=false, userId from auth
- [ ] `create` mutation: rejects empty/whitespace text (returns without creating)
- [ ] `list` query: returns only current user's todos
- [ ] Tests verify user isolation (Alice can't see Bob's todos)

**Depends on:** Task 1

---

### Task 3: Backend - Toggle, delete, update todos

**Implements:** TL-3 (Toggle), TL-4 (Delete), TL-5 (Edit)

**Files:**
- Test: `convex/todos.test.ts`
- Implementation: `convex/todos.ts`

**Acceptance:**
- [ ] `toggle` mutation: flips completed status
- [ ] `remove` mutation: deletes the todo
- [ ] `update` mutation: changes text (rejects empty, reverts)
- [ ] All mutations verify ownership (can't modify others' todos)

**Depends on:** Task 2

---

### Task 4: Component - TodoList with create and view

**Implements:** TL-1 (Create), TL-2 (View)

**Files:**
- Test: `src/components/TodoList.integration.test.tsx`
- Implementation: `src/components/TodoList.tsx`

**Acceptance:**
- [ ] Shows "No todos yet" when empty
- [ ] Input field + Enter creates todo
- [ ] Empty/whitespace input does nothing
- [ ] Input clears after creation
- [ ] Created todo appears in list (unchecked)

**Depends on:** Task 2

---

### Task 5: Component - Toggle and delete

**Implements:** TL-3 (Toggle), TL-4 (Delete)

**Files:**
- Test: `src/components/TodoList.integration.test.tsx`
- Implementation: `src/components/TodoList.tsx`

**Acceptance:**
- [ ] Checkbox toggles completion status
- [ ] Delete button removes todo
- [ ] Empty state returns when last todo deleted

**Depends on:** Task 4

---

### Task 6: Component - Edit inline

**Implements:** TL-5 (Edit)

**Files:**
- Test: `src/components/TodoList.integration.test.tsx`
- Implementation: `src/components/TodoList.tsx`

**Acceptance:**
- [ ] Click on text enters edit mode
- [ ] Enter saves changes
- [ ] Blur saves changes
- [ ] Escape cancels (reverts to original)
- [ ] Empty text reverts to original

**Depends on:** Task 5

---

### Task 7: Integration - Wire up to App

**Implements:** Full flow

**Files:**
- Implementation: `src/App.tsx`

**Acceptance:**
- [ ] TodoList component shows when authenticated
- [ ] Replace demo "numbers" content with TodoList

**Depends on:** Task 6

---

## Test Strategy

**Backend tests:** `convex/todos.test.ts`
- Test Convex functions directly using convex-test
- Verify user isolation, CRUD operations, edge cases

**Integration tests:** `src/components/TodoList.integration.test.tsx`
- Test React component with real Convex backend via ConvexTestProvider
- Cover all 21 Gherkin scenarios

**Test IDs map to spec groups:**
- TL-1.x = Create tests
- TL-2.x = View tests
- TL-3.x = Toggle tests
- TL-4.x = Delete tests
- TL-5.x = Edit tests

---

## Verification Checklist

- [x] Every spec criterion has a task
- [x] Every task references spec criteria
- [x] Every task has testable acceptance
- [x] Integration tests specified
- [x] No code embedded in plan
- [x] Dependencies explicit
