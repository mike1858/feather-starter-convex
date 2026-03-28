# Feature: TodoList

> **Context:** Teams have managers and team members. Each user tracks their own tasks independently for now.

**Goal:** Let users track their own tasks with create, view, toggle, delete, and edit.

**Scope**
- In: User authentication, create tasks, view own list, toggle completion, delete tasks, edit task title
- Out: Due dates, priorities, multiple lists, shared/manager view (future)

---

## TL-1: Create Task

- WHEN I type a task and press Enter, THE SYSTEM SHALL add it to my list

**Examples:**
| User | Input | Result |
|------|-------|--------|
| Alice (manager) | "Review quarterly reports" | Task appears in Alice's list, unchecked |
| Bob (team member) | "Fix login bug" | Task appears in Bob's list, unchecked |

---

## TL-2: View Tasks

- WHILE no tasks exist, THE SYSTEM SHALL show "No todos yet"
- WHEN tasks exist, THE SYSTEM SHALL show only my tasks
- WHEN I leave (e.g. logout, close, refresh) and return, THE SYSTEM SHALL show my existing tasks

**Examples:**
| User | State | Display |
|------|-------|---------|
| Alice (manager) | No tasks | "No todos yet" message |
| Alice (manager) | Has tasks | Only Alice's tasks visible |
| Bob (team member) | Has tasks | Only Bob's tasks visible (cannot see Alice's) |

---

## TL-3: Toggle Complete

- WHEN I click a task's checkbox, THE SYSTEM SHALL toggle its completion

**Examples:**
| Before | Action | After |
|--------|--------|-------|
| "Buy milk" unchecked | click | "Buy milk" checked |
| "Buy milk" checked | click | "Buy milk" unchecked |

---

## TL-4: Delete Task

- WHEN I click a task's delete button, THE SYSTEM SHALL remove it

**Examples:**
| Before | Action | After |
|--------|--------|-------|
| List has "Buy milk" | click delete | "Buy milk" gone |

---
// TODO  should we order the features in CRUD order?

## TL-5: Edit Task

- WHEN I click a task's title, THE SYSTEM SHALL make it editable inline
- WHEN I press Enter or blur, THE SYSTEM SHALL save the changes

**Examples:**
| Before | Action | After |
|--------|--------|-------|
| "Buy milk" | click, change to "Buy oat milk", Enter | "Buy oat milk" saved |
| "Buy milk" | click, change to "Buy oat milk", click away | "Buy oat milk" saved |

---

## Data Model

**T1: todos**
- text (string)
- completed (yes/no)
- userId (reference to user)
