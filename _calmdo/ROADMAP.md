# CalmDo — Roadmap

Vertical slices — each phase is deployable and verifiable. Features from calmdo-old requirements (GTD tags, task recycling, smart recurring) are woven into later phases where they fit naturally.

---

## Phase 1: Core (Internal Tool)

**Goal:** Replace scattered task tracking with a single source of truth for a 2-person team.

| Slice | Feature | Verifiable Outcome |
|-------|---------|-------------------|
| 1.1 | Auth + Org | User signs up (org created atomically), signs in/out |
| 1.2 | Quick Tasks | Create/view/edit/delete personal tasks (private by default) |
| 1.3 | Task Status | Move tasks through todo → in_progress → done |
| 1.4 | Projects | Create projects under org with status (active/on_hold/completed/archived) |
| 1.5 | Project Tasks | Assign tasks to projects, view project task list |
| 1.6 | Subtasks | Add subtasks, mark complete, promote to full tasks |
| 1.7 | Task Assignment | Assign tasks to org members. Pool (unassigned) + My Tasks views. |
| 1.8 | Work Logs | Log work with optional time on any task |
| 1.9 | Task Links | spawned_from, blocked_by relationships |
| 1.10 | Activity Logs | Auto-generated audit trail (task/project events) |
| 1.11 | Filters | Filter by status, assignee, project, priority |
| 1.12 | Search | Text search across task titles and project names |

**Views delivered:** My Tasks, Team Pool, Projects List, Project View, Task Detail, Search

**Schema foundation:** Multi-org from day one (all queries org-scoped), but UI assumes single org.

---

## Phase 2: Collaboration

**Goal:** Team communication lives alongside the work, not in Slack threads.

| Slice | Feature | Verifiable Outcome |
|-------|---------|-------------------|
| 2.1 | Comments | Add threaded comments to tasks (discussion/decision/note) |
| 2.2 | Mentions | @mention users in comments |
| 2.3 | Questions | First-class questions with assignees and status tracking |
| 2.4 | Questions Dashboard | "Questions I need to answer" and "Questions I'm waiting on" |
| 2.5 | Checklist Templates | Create reusable checklists at project or org level |
| 2.6 | Task Checklists | Apply templates to tasks, customize per instance |
| 2.7 | Capture Checklists | Create template from completed subtasks |
| 2.8 | Kanban View | Drag tasks between status columns |
| 2.9 | Home Dashboard | Activity feed, next actions, quick cues |

---

## Phase 3: Client Visibility

**Goal:** Clients can see their projects without you sending screenshots.

| Slice | Feature | Verifiable Outcome |
|-------|---------|-------------------|
| 3.1 | Clients | Create client entities linked to provider org |
| 3.2 | Client Projects | Associate projects with clients |
| 3.3 | Client Invites | Email invite to view their projects |
| 3.4 | Time Reports | Aggregate time by project/person/client (exportable for billing) |
| 3.5 | What's New | Activity feed since last visit (no push notifications) |

---

## Phase 4: Permissions

**Goal:** Different people see different things. Clients don't see your internal notes.

| Slice | Feature | Verifiable Outcome |
|-------|---------|-------------------|
| 4.1 | Role System | Owner / Manager / Editor / Viewer per org |
| 4.2 | Permission Enforcement | Server-side access control on every function |
| 4.3 | Client Manager Role | See their projects only |
| 4.4 | Client Collaborator Role | See assigned tasks only |
| 4.5 | Permission-Aware UI | Buttons/actions hidden when user lacks permission |

---

## Phase 5: Knowledge

**Goal:** Org-level learning and resources.

| Slice | Feature | Verifiable Outcome |
|-------|---------|-------------------|
| 5.1 | Task Resources | Attach links to tasks |
| 5.2 | Project Resources | Project-level resource library |
| 5.3 | Org Resources | Shared knowledge base across all projects |
| 5.4 | Resource Tags & Search | Tag, search, and filter resources |

---

## Phase 6: SaaS

**Goal:** Clients create their own workspaces — your org becomes just another tenant.

| Slice | Feature | Verifiable Outcome |
|-------|---------|-------------------|
| 6.1 | Client Workspaces | Clients create own orgs (type: "provider") |
| 6.2 | Org Switching | Switch between orgs in the UI |
| 6.3 | Billing | Subscription management |

**Why multi-org schema from Phase 1:** When a client wants their own workspace, create new org → migrate users → no schema changes needed.

---

## Future Ideas (Not Scheduled)

From calmdo-old requirements, worth revisiting after core is stable:

| Feature | Source | Notes |
|---------|--------|-------|
| **GTD Tags** | Nirvana HQ, OmniFocus | Context tagging: location, people, energy, focus. Optional, hidden if unused. |
| **Task Recycling** | Arc browser | Stale tasks auto-recycled to special buckets. Surface important ones, archive the rest. |
| **Real vs Soft Due Dates** | Original calmdo vision | Government filings = real. "Finish by Friday" = soft. Different urgency treatment. |
| **Smart Recurring Tasks** | Original calmdo vision | Intelligent timeline transitions when tasks are completed after a gap. |
| **Contextual Coach** | Original calmdo vision | Subtle tips based on usage patterns. Suggest checklists, recurring tasks, etc. |
| **Feature Toggles** | Original calmdo vision | Disable projects, logging, or tags for simpler deployments. |

---

## Per-Feature Artifacts

Each feature gets a spec folder:

```
_calmdo/specs/
├── auth/
│   ├── spec.md              # Requirements
│   ├── design.md            # Architecture/UI
│   └── implementation-plan.md
├── quick-tasks/
│   └── ...
└── ...
```

See [examples/todolist/](examples/todolist/) for the worked example of this workflow.
