# Gherkin Scenarios: TodoList

**Spec:** `docs/specs/todolist/spec.md`

**Tags:** `@integration` — full stack (Convex + UI); `@backend` — Convex only (e.g. data isolation); `@frontend` — UI/UX only (e.g. input clear, escape cancel); `@e2e` — browser E2E: real browser, local Convex backend, real auth; no mocks.

---

## TL-1: Create Task

### Happy Path (in spec)

```gherkin
@integration
Scenario: Create task as manager
  Given I am logged in as Alice (manager)
  When I type "Review quarterly reports" and press Enter
  Then "Review quarterly reports" appears in my task list
  And "Review quarterly reports" is unchecked

@integration
Scenario: Create task as team member
  Given I am logged in as Bob (team member)
  When I type "Fix login bug" and press Enter
  Then "Fix login bug" appears in my task list
  And "Fix login bug" is unchecked
```

### UX improvements (not in spec)

```gherkin
@frontend
Scenario: Input clears after creation
  When I type "Buy milk" and press Enter
  Then the input field is empty
```

### Edge Cases (not in spec)

```gherkin
@frontend
Scenario: Empty input is ignored
  When I press Enter with nothing typed
  Then no task is created

@frontend
Scenario: Whitespace-only input is ignored
  When I type "   " and press Enter
  Then no task is created

```

---

## TL-2: View Tasks

### Happy Path (in spec)

```gherkin
@integration
Scenario: Empty state shows message
  Given I am logged in as Alice
  And I have no tasks
  Then I see "No todos yet"

@integration
Scenario: User sees only their own tasks
  Given Alice has task "Review quarterly reports"
  And Bob has task "Fix login bug"
  When I am logged in as Alice
  Then I see "Review quarterly reports"
  And I do not see "Fix login bug"

@backend
Scenario: Team member cannot see manager's tasks
  Given Alice has task "Review quarterly reports"
  And Bob has task "Fix login bug"
  When I am logged in as Bob
  Then I see "Fix login bug"
  And I do not see "Review quarterly reports"

@integration
Scenario: Data persists after leave and return
  Given I am logged in as Alice
  And I have task "Buy milk"
  When I leave (logout or close)
  And I return and log in as Alice
  Then I see "Buy milk" in my list

```

### Edge Cases (not in spec)

```gherkin
@integration
Scenario: Empty state returns when last task deleted
  Given I have one task "Only task"
  When I delete "Only task"
  Then I see "No todos yet"

@integration
Scenario: Data persists after unmount and remount (same client and identity)
  Given I am logged in as Alice
  And I have task "Buy milk"
  When I unmount the app and mount again with the same Convex test client and identity
  Then I see "Buy milk" in my list
```

---

## TL-3: Toggle Complete

### Happy Path (in spec)

```gherkin
@integration
Scenario: Check unchecked task
  Given I have unchecked task "Buy milk"
  When I click the checkbox for "Buy milk"
  Then "Buy milk" is checked

@integration
Scenario: Uncheck checked task
  Given I have checked task "Buy milk"
  When I click the checkbox for "Buy milk"
  Then "Buy milk" is unchecked
```

### Edge Cases (not in spec)

```gherkin
@integration
Scenario: Toggle persists after refresh
  Given I have unchecked task "Buy milk"
  When I click the checkbox for "Buy milk"
  And I refresh the page
  Then "Buy milk" is still checked
```

---

## TL-4: Delete Task

### Happy Path (in spec)

```gherkin
@integration
Scenario: Delete removes task
  Given I have task "Buy milk"
  When I click the delete button for "Buy milk"
  Then "Buy milk" is no longer in my list
```

### Edge Cases (not in spec)

```gherkin
@integration
Scenario: Delete persists after refresh
  Given I have task "Buy milk"
  When I click the delete button for "Buy milk"
  And I refresh the page
  Then "Buy milk" is not in my list

@integration
Scenario: Can delete completed task
  Given I have checked task "Buy milk"
  When I click the delete button for "Buy milk"
  Then "Buy milk" is no longer in my list
```

---

## TL-5: Edit Task

### Happy Path (in spec)

```gherkin
@integration
Scenario: Edit and save with Enter
  Given I have task "Buy milk"
  When I click on "Buy milk"
  And I change the text to "Buy oat milk"
  And I press Enter
  Then I see "Buy oat milk" in my list
  And I do not see "Buy milk"

@integration
Scenario: Edit and save on blur
  Given I have task "Buy milk"
  When I click on "Buy milk"
  And I change the text to "Buy oat milk"
  And I click away
  Then I see "Buy oat milk" in my list
```

### Edge Cases (not in spec)

```gherkin
@frontend
Scenario: Escape cancels edit
  Given I have task "Buy milk"
  When I click on "Buy milk"
  And I change the text to "Buy oat milk"
  And I press Escape
  Then I see "Buy milk" in my list
  And I do not see "Buy oat milk"

@integration
Scenario: Edit persists after refresh
  Given I have task "Buy milk"
  When I edit "Buy milk" to "Buy oat milk"
  And I refresh the page
  Then I see "Buy oat milk" in my list

@frontend
Scenario: Empty edit reverts to original
  Given I have task "Buy milk"
  When I click on "Buy milk"
  And I clear the text
  And I press Enter
  Then I see "Buy milk" in my list
```

## E2E (browser, no mocks)

**Prerequisites:** App and local Convex backend running; E2E runner (e.g. Playwright) drives a real browser; auth is real (sign-in in browser). Tables cleared before E2E via [convex-helpers](https://github.com/get-convex/convex-helpers#testing-with-a-local-backend) `clearAll` + ConvexTestingHelper.

**E2E vs @integration:** `@integration` = Vitest + jsdom + convex-test; `@e2e` = real browser + local backend + real auth; "Given I am logged in as X" in E2E = sign in via UI.

**Local backend:** E2E runs against a local Convex backend (e.g. convex-backend OSS on `127.0.0.1:3210`, or Convex local dev). Tables cleared before E2E via convex-helpers `clearAll` + ConvexTestingHelper.

```gherkin
@e2e
Scenario: Full todo flow (E2E smoke)
  Given I am logged in as Alice
  And I have no tasks
  When I type "Buy milk" and press Enter
  Then "Buy milk" appears in my task list
  And "Buy milk" is unchecked
  When I click the checkbox for "Buy milk"
  Then "Buy milk" is checked
  When I click on "Buy milk"
  And I change the text to "Buy oat milk"
  And I press Enter
  Then I see "Buy oat milk" in my list
  When I click the delete button for "Buy oat milk"
  Then "Buy oat milk" is no longer in my list
  And I see "No todos yet"
```

---
