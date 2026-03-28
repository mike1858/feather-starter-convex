# CalmDo — Product Vision

## What Is CalmDo?

A task management system for small service teams managing client projects. Think Linear's speed + Monday.com's approachability + GTD's depth — but for a 2-person dev team that doesn't need enterprise overhead.

## Evolution Path

1. **Internal tool** — Your team uses it daily
2. **Client visibility** — Invite clients to view/collaborate on their projects
3. **SaaS** — Clients create their own workspaces

## Core Principles

- **Speed first** — Quick capture, inline editing, keyboard shortcuts. Minimal friction for recurring entries.
- **Progressive complexity** — Projects, time logging, tags, checklists, subtasks, recurring tasks are all optional and unobtrusive. Hidden if unused.
- **Personal focus** — Default views filter to "My work." Expand to all tasks or teammates when needed.
- **Real behavior, not ceremony** — Task recycling for stale items. Real vs soft due dates. Smart recurring tasks.
- **Configurable** — Statuses, tags, and workflows should be configurable per org or per project.

## Inspirations

| Product | What we take |
|---------|-------------|
| **Linear** | Blazing-fast issue tracking, keyboard-first workflows |
| **Monday.com** | Approachable boards for business stakeholders |
| **Nirvana HQ** | GTD context tagging (location, people, energy, focus) |
| **OmniFocus** | Structured GTD hierarchies and review rituals |
| **Todoist** | Simplicity — works without any configuration |

## User Types

| Type | Access | Phase |
|------|--------|-------|
| **Service Provider** (your team) | All clients, all projects | Phase 1 |
| **Client Manager** | Their projects only | Phase 3 |
| **Client Collaborator** | Assigned tasks only | Phase 4 |

## Core Features

### Tasks & Organization

- **Tasks** — Create, assign, track through configurable statuses (default: todo → in_progress → done)
- **Quick Tasks** — Personal tasks without a project (private to creator). Auto-flip to "shared" when assigned to someone else.
- **Projects** — Group tasks by client project. Sidebar navigation with counts.
- **Subtasks** — Break tasks into smaller pieces, independently assignable. Can be promoted to full tasks.
- **Task Links** — `spawned_from`, `blocks`, `blocked_by`, `related_to`

### Collaboration (Phase 2+)

- **Comments** — Threaded discussion on tasks. Types: discussion, decision, note.
- **Mentions** — @mention users in comments
- **Questions** — First-class feature. Assign questions to people. Track "Questions I need to answer" and "Questions I'm waiting on."
- **Checklists** — Reusable templates at project or org level, customizable per task. Can be captured from completed subtasks.

### Productivity

- **Work Logs** — Document what was done, learnings, optional time. Any user can log time on any task (not just assignee).
- **Time Tracking** — Aggregate time by task, project, person, client. Exportable for billing.
- **Resources** — Attach links to tasks, projects, or org-wide knowledge base (Phase 5)
- **Activity Feed** — "What's New" on app open. No push notifications (deep work friendly).

### Unique Ideas

**Task Recycling** (Arc browser-inspired): Tasks left stale and untouched get recycled into special buckets. When life gets busy and you come back to a mountain of old tasks, the important ones are surfaced rather than buried.

**Real vs Soft Due Dates**: Government filings and AMC contract renewals have REAL due dates. "I'd like to finish this by Friday" is a soft date. These are tracked differently — real dates get escalating urgency, soft dates can be moved indefinitely.

**Smart Recurring Tasks**: If a recurring task is left unchecked and then completed after a gap, it transitions to the correct next timeline intelligently (not creating a backlog of missed instances).

**GTD Tags** (opt-in): Location (@office, @warehouse), people (@client, @designer), energy (low/high), focus modes. Combine tags for rapid filtering ("@Office + @Finance"). Hidden if unused, suggested when patterns detected.

**Reusable Checklists from Subtasks**: After completing a task with subtasks, capture those subtasks as a reusable checklist template. Improvise on the fly, then codify what worked.

**Contextual Coach**: Subtle tips based on usage patterns. "You've been creating similar subtasks — want to make a checklist template?" Highlight underused features without being annoying.

## Screens

| Screen | Purpose | Phase |
|--------|---------|-------|
| **My Tasks** | Tasks assigned to me (+ my quick tasks) | 1 |
| **Team Pool** | Unassigned shared tasks — "grab" to claim | 1 |
| **Project View** | All tasks in a project, filterable | 1 |
| **Task Detail** | Full view: subtasks, work logs, activity timeline | 1 |
| **Projects List** | All projects with status | 1 |
| **Search** | Find tasks and projects by text | 1 |
| **Kanban** | Drag tasks between status columns | 2 |
| **Questions Dashboard** | Questions I need to answer / waiting on | 2 |
| **Home Dashboard** | Activity feed, next actions, active contexts | 2 |

## Reports

| Report | Purpose | Phase |
|--------|---------|-------|
| Time by Task | Hours logged per task | 1 |
| Time by Project | Total hours per project | 3 |
| Time by Person | Hours logged per team member | 3 |
| Time by Client | All projects combined, exportable for billing | 3 |

## Notifications

No push notifications — deep work friendly.

| Trigger | What you see |
|---------|-------------|
| **App open** | "What's New" — changes since last visit |
| **Includes** | Questions directed to you, tasks assigned to you, activity on your tasks |

## Non-Functional

- Tenant/user scoping — users only see their own data unless shared
- Accessibility — contrast, keyboard navigation, both themes
- Feature toggles — disable projects, logging, or advanced tags for simpler deployments
- Multi-learning tasks — some tasks assigned to 2-3 people (rare, 95% single assignee)
