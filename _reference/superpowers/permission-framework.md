# Reusable Permission Framework

A general-purpose permission system designed to be reusable across multiple full-stack applications.

---

## Overview

### The Core Question

Every permission check answers one question:

> **Can [subject] perform [action] on [resource] in [context]?**

| Component | Description | Examples |
|-----------|-------------|----------|
| **Subject** | Who is asking | User, role, API key, service |
| **Action** | What they want to do | view, create, edit, delete, assign |
| **Resource** | What type of thing | tasks, projects, invoices, users |
| **Context** | Where/what scope | org:123, project:456, own records |

---

## The Four Layers

```
┌─────────────────────────────────────────────┐
│  Layer 4: Grants                            │
│  (Who has what, in what context)            │
├─────────────────────────────────────────────┤
│  Layer 3: Roles                             │
│  (Named bundles of permissions)             │
├─────────────────────────────────────────────┤
│  Layer 2: Scopes                            │
│  (own, all, assigned, team)                 │
├─────────────────────────────────────────────┤
│  Layer 1: Atomic Permissions                │
│  (resource.action - the smallest unit)      │
└─────────────────────────────────────────────┘
```

---

## Layer 1: Atomic Permissions

The smallest, indivisible unit of access control.

### Format

```
resource.action
```

### Examples

```
tasks.view
tasks.create
tasks.edit
tasks.delete
tasks.assign

projects.view
projects.create
projects.edit
projects.archive

comments.view
comments.create
comments.delete

users.view
users.invite
users.remove

org.manage_members
org.manage_settings
org.view_billing
org.delete
```

### Guidelines for Defining Permissions

| Do | Don't |
|----|-------|
| One permission = one meaningful action | Over-split: `tasks.edit_title` vs `tasks.edit_description` |
| Use domain-specific verbs: `tasks.assign`, `invoices.send` | Under-split: single `tasks.manage` for everything |
| Keep permissions intuitive to explain | Create permissions no one will use |
| Group by resource first | Create arbitrary groupings |

### Common Actions

| Action | Meaning |
|--------|---------|
| `view` | Read/see the resource |
| `create` | Make new resources |
| `edit` | Modify existing resources |
| `delete` | Remove resources |
| `assign` | Assign to users (domain-specific) |
| `archive` | Soft-remove from active views |
| `export` | Download/extract data |
| `manage` | Administrative control |

---

## Layer 2: Scopes

Scopes limit the reach of a permission.

### Format

```
resource.action:scope
```

### Standard Scopes

| Scope | Meaning | Use case |
|-------|---------|----------|
| `all` | Any resource of this type | Admins, managers |
| `own` | Only resources I created | Default for edit/delete |
| `assigned` | Only resources assigned to me | Task workers |
| `team` | Resources in my team/group | Team-based orgs |

### Compound Scopes

Multiple scopes can be combined with commas:

```
tasks.edit:own,assigned
```

Meaning: Can edit tasks I created OR tasks assigned to me.

### Scope Rules

**Actions that DON'T need scope:**
- `create` - You're making something new; ownership is automatic

**Actions that DO need scope:**
- `view` - View what? Own, assigned, all?
- `edit` - Edit what? Own, assigned, all?
- `delete` - Delete what? Own, all?
- Domain-specific actions - Usually need scope

### Default Scope Convention

If using implicit defaults (optional - can require explicit scopes instead):

| Action type | Default scope | Rationale |
|-------------|---------------|-----------|
| `view` | `all` | Reading is permissive |
| `edit` | `own` | Writing is restrictive |
| `delete` | `own` | Deletion is restrictive |

**Recommendation:** Always be explicit. Require scope on every permission except `create`.

### Examples

| Permission | Meaning |
|------------|---------|
| `tasks.create` | Can create tasks (no scope - you own what you create) |
| `tasks.view:all` | Can view any task |
| `tasks.view:assigned` | Can only view tasks assigned to me |
| `tasks.edit:own` | Can edit tasks I created |
| `tasks.edit:assigned` | Can edit tasks assigned to me |
| `tasks.edit:own,assigned` | Can edit tasks I created OR am assigned to |
| `tasks.edit:all` | Can edit any task |
| `tasks.delete:own` | Can delete tasks I created |
| `tasks.delete:all` | Can delete any task |
| `tasks.assign:all` | Can assign/reassign any task |

---

## Layer 3: Roles

Roles are named bundles of permissions for convenience.

### Purpose

- Simplify permission assignment (assign one role vs. 20 permissions)
- Create meaningful access levels (Viewer, Editor, Manager)
- Allow customization per organization

### Role Types

| Type | Defined by | Example |
|------|------------|---------|
| **System roles** | Code/platform | `admin`, `viewer` |
| **Custom roles** | Organization | `project_lead`, `contractor` |

### Example Role Definitions

```javascript
const systemRoles = {
  viewer: [
    'tasks.view:all',
    'projects.view:all',
    'comments.view:all',
    'subtasks.view:all'
  ],

  editor: [
    // Inherits viewer
    ...systemRoles.viewer,

    // Create permissions (no scope needed)
    'tasks.create',
    'subtasks.create',
    'comments.create',

    // Edit/delete own
    'tasks.edit:own',
    'tasks.delete:own',
    'subtasks.edit:own',
    'subtasks.complete:assigned',
    'comments.delete:own'
  ],

  manager: [
    // Inherits editor
    ...systemRoles.editor,

    // Elevated permissions
    'tasks.edit:all',
    'tasks.delete:all',
    'tasks.assign:all',
    'subtasks.edit:all',
    'projects.create',
    'projects.edit:all',
    'projects.archive:all'
  ],

  admin: [
    // Everything
    '*:all',

    // Or explicit org management
    'org.manage_members',
    'org.manage_settings',
    'org.view_billing'
  ],

  owner: [
    // Admin + destructive actions
    ...systemRoles.admin,
    'org.delete',
    'org.transfer_ownership'
  ]
}
```

### Role Inheritance

Roles can inherit from other roles to reduce duplication:

```javascript
const roles = {
  viewer: ['tasks.view:all', 'projects.view:all'],
  editor: ['@viewer', 'tasks.create', 'tasks.edit:own'],
  manager: ['@editor', 'tasks.edit:all', 'tasks.delete:all']
}
```

The `@rolename` syntax means "include all permissions from that role."

---

## Layer 4: Grants

Grants connect subjects (users) to permissions (via roles or direct).

### Grant Types

**Role-based grant:**
```javascript
{
  user_id: 'user_123',
  role: 'editor',
  context_type: 'org',
  context_id: 'org_456'
}
```

**Direct permission grant (override/exception):**
```javascript
{
  user_id: 'user_123',
  permission: 'tasks.delete:all',
  context_type: 'project',
  context_id: 'project_789'
}
```

### Context Types

Grants are scoped to a context - where does this permission apply?

| Context type | Meaning | Example |
|--------------|---------|---------|
| `global` | Everywhere | Platform superadmin |
| `org` | Within an organization | org:123 |
| `client` | Within a client | client:456 |
| `project` | Within a project | project:789 |

### Grant Hierarchy

More specific contexts override broader ones:

```
global → org → client → project
```

Example:
- User has `viewer` role at org level
- User has `editor` role at project level
- In that project, they're an editor; elsewhere, viewer

### Negative Grants (Optional)

For complex scenarios, allow explicit denials:

```javascript
{
  user_id: 'user_123',
  permission: 'tasks.delete:all',
  grant_type: 'deny',  // explicitly denied
  context_type: 'project',
  context_id: 'project_789'
}
```

**Resolution order:** Deny > Allow (if both exist, deny wins)

---

## Data Model

### Schema

```sql
-- Reference: All possible permissions (can also be code-defined)
permissions
  - id: uuid
  - resource: string (tasks, projects, org...)
  - action: string (view, create, edit...)
  - description: string
  - requires_scope: boolean (true for most, false for create)

-- Reference: Role definitions
roles
  - id: uuid
  - name: string (viewer, editor, manager...)
  - org_id: uuid nullable (null = system role, set = org custom role)
  - description: string

-- What permissions each role grants
role_permissions
  - id: uuid
  - role_id: uuid → roles
  - permission: string (tasks.view, tasks.edit...)
  - scope: string (all, own, assigned, or compound like own,assigned)

-- What users have been granted
user_grants
  - id: uuid
  - user_id: uuid → users
  - role_id: uuid nullable → roles (if role-based grant)
  - permission: string nullable (if direct permission grant)
  - scope: string nullable (for direct grants)
  - grant_type: enum (allow, deny) default allow
  - context_type: enum (global, org, client, project)
  - context_id: uuid nullable (null for global)
  + audit fields (created_at, created_by, updated_at, updated_by)
```

### Convex Schema (Document DB)

```typescript
// convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Role definitions
  roles: defineTable({
    name: v.string(),
    orgId: v.optional(v.id("organizations")), // null = system role
    description: v.optional(v.string()),
    permissions: v.array(v.object({
      permission: v.string(), // e.g., "tasks.edit"
      scope: v.string(),      // e.g., "own" or "all" or "own,assigned"
    })),
    createdBy: v.id("users"),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_org", ["orgId"])
    .index("by_name", ["name"]),

  // User grants
  userGrants: defineTable({
    userId: v.id("users"),
    roleId: v.optional(v.id("roles")),        // if role-based
    permission: v.optional(v.string()),        // if direct grant
    scope: v.optional(v.string()),             // for direct grants
    grantType: v.union(v.literal("allow"), v.literal("deny")),
    contextType: v.union(
      v.literal("global"),
      v.literal("org"),
      v.literal("client"),
      v.literal("project")
    ),
    contextId: v.optional(v.string()),         // the org/client/project id
    createdBy: v.id("users"),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_user_context", ["userId", "contextType", "contextId"])
    .index("by_context", ["contextType", "contextId"]),
});
```

---

## Permission Check Logic

### Algorithm

```typescript
async function canDo(
  userId: string,
  action: string,      // e.g., "edit"
  resource: string,    // e.g., "tasks"
  resourceOwnerId?: string,  // who created the resource
  resourceAssigneeId?: string, // who it's assigned to
  context: { type: string, id: string } // e.g., { type: "project", id: "123" }
): Promise<boolean> {

  // 1. Get all grants for this user in this context (and parent contexts)
  const grants = await getGrantsForUser(userId, context);

  // 2. Check for explicit deny first
  const requiredPermission = `${resource}.${action}`;
  const denied = grants.find(g =>
    g.grantType === 'deny' &&
    matchesPermission(g, requiredPermission)
  );
  if (denied) return false;

  // 3. Check for allow grants
  for (const grant of grants.filter(g => g.grantType === 'allow')) {
    // Expand role to permissions if role-based
    const permissions = grant.roleId
      ? await getRolePermissions(grant.roleId)
      : [{ permission: grant.permission, scope: grant.scope }];

    for (const perm of permissions) {
      if (matchesPermission(perm.permission, requiredPermission)) {
        // Check scope
        if (scopeAllows(perm.scope, userId, resourceOwnerId, resourceAssigneeId)) {
          return true;
        }
      }
    }
  }

  return false;
}

function scopeAllows(
  scope: string,
  userId: string,
  ownerId?: string,
  assigneeId?: string
): boolean {
  const scopes = scope.split(','); // handle compound scopes

  for (const s of scopes) {
    switch (s.trim()) {
      case 'all':
        return true;
      case 'own':
        if (ownerId === userId) return true;
        break;
      case 'assigned':
        if (assigneeId === userId) return true;
        break;
      case 'team':
        // Would need team membership check
        break;
    }
  }

  return false;
}
```

### Context Hierarchy

When checking permissions, look up the context hierarchy:

```typescript
async function getGrantsForUser(
  userId: string,
  context: { type: string, id: string }
): Promise<Grant[]> {
  const grants: Grant[] = [];

  // Always check global grants
  grants.push(...await getGrants(userId, 'global', null));

  // Build context chain: project → client → org
  if (context.type === 'project') {
    const project = await getProject(context.id);
    const client = await getClient(project.clientId);

    grants.push(...await getGrants(userId, 'org', client.orgId));
    grants.push(...await getGrants(userId, 'client', project.clientId));
    grants.push(...await getGrants(userId, 'project', context.id));
  } else if (context.type === 'client') {
    const client = await getClient(context.id);

    grants.push(...await getGrants(userId, 'org', client.orgId));
    grants.push(...await getGrants(userId, 'client', context.id));
  } else if (context.type === 'org') {
    grants.push(...await getGrants(userId, 'org', context.id));
  }

  return grants;
}
```

---

## UI Considerations (Future Phase)

### Permission Management UI

**For admins:**
- View/create/edit roles
- Assign roles to users
- Grant/revoke direct permissions
- See effective permissions for any user

**For users:**
- See their own permissions
- Request access (optional workflow)

### UI Components Needed

1. **Role editor** - Create/edit roles, add/remove permissions
2. **User grant manager** - Assign roles, grant direct permissions
3. **Permission viewer** - Show what a user can do (computed)
4. **Permission picker** - Searchable list of all permissions
5. **Scope selector** - Choose all/own/assigned/team

### Display Considerations

Show permissions in human-readable form:
- `tasks.edit:own` → "Edit own tasks"
- `tasks.delete:all` → "Delete any task"
- `projects.archive:all` → "Archive any project"

Group by resource for readability:
```
Tasks
  ✓ View all tasks
  ✓ Create tasks
  ✓ Edit own tasks
  ✗ Delete tasks

Projects
  ✓ View all projects
  ✗ Create projects
```

---

## Implementation Phases

| Phase | Scope |
|-------|-------|
| **1: Foundation** | Permission checking logic, hardcoded roles in code |
| **2: Basic UI** | Assign predefined roles to users |
| **3: Custom roles** | Orgs can create their own roles |
| **4: Direct grants** | Fine-grained permission overrides |
| **5: Full UI** | Complete permission management interface |
| **6: Audit** | Permission change logging, access reports |

---

## Example: Task Management App

### Permissions Defined

```typescript
const PERMISSIONS = {
  // Tasks
  'tasks.view': { description: 'View tasks', requiresScope: true },
  'tasks.create': { description: 'Create tasks', requiresScope: false },
  'tasks.edit': { description: 'Edit tasks', requiresScope: true },
  'tasks.delete': { description: 'Delete tasks', requiresScope: true },
  'tasks.assign': { description: 'Assign tasks to users', requiresScope: true },

  // Subtasks
  'subtasks.view': { description: 'View subtasks', requiresScope: true },
  'subtasks.create': { description: 'Create subtasks', requiresScope: false },
  'subtasks.edit': { description: 'Edit subtasks', requiresScope: true },
  'subtasks.complete': { description: 'Mark subtasks complete', requiresScope: true },

  // Projects
  'projects.view': { description: 'View projects', requiresScope: true },
  'projects.create': { description: 'Create projects', requiresScope: false },
  'projects.edit': { description: 'Edit projects', requiresScope: true },
  'projects.archive': { description: 'Archive projects', requiresScope: true },

  // Clients
  'clients.view': { description: 'View clients', requiresScope: true },
  'clients.create': { description: 'Create clients', requiresScope: false },
  'clients.edit': { description: 'Edit clients', requiresScope: true },

  // Comments
  'comments.view': { description: 'View comments', requiresScope: true },
  'comments.create': { description: 'Create comments', requiresScope: false },
  'comments.delete': { description: 'Delete comments', requiresScope: true },

  // Organization
  'org.manage_members': { description: 'Invite/remove org members', requiresScope: false },
  'org.manage_settings': { description: 'Edit org settings', requiresScope: false },
  'org.delete': { description: 'Delete organization', requiresScope: false },
};
```

### Roles Defined

```typescript
const ROLES = {
  // For team members (your org)
  team_member: {
    description: 'Full access team member',
    permissions: [
      { permission: 'tasks.*', scope: 'all' },
      { permission: 'subtasks.*', scope: 'all' },
      { permission: 'projects.*', scope: 'all' },
      { permission: 'clients.*', scope: 'all' },
      { permission: 'comments.*', scope: 'all' },
    ]
  },

  team_admin: {
    description: 'Team admin with org management',
    inherits: ['team_member'],
    permissions: [
      { permission: 'org.manage_members', scope: 'all' },
      { permission: 'org.manage_settings', scope: 'all' },
    ]
  },

  // For client collaborators
  client_viewer: {
    description: 'Can view client projects and tasks',
    permissions: [
      { permission: 'tasks.view', scope: 'all' },
      { permission: 'subtasks.view', scope: 'all' },
      { permission: 'projects.view', scope: 'all' },
      { permission: 'comments.view', scope: 'all' },
    ]
  },

  client_collaborator: {
    description: 'Can view and participate in tasks',
    inherits: ['client_viewer'],
    permissions: [
      { permission: 'tasks.create', scope: 'all' },
      { permission: 'subtasks.complete', scope: 'assigned' },
      { permission: 'comments.create', scope: 'all' },
    ]
  },

  client_manager: {
    description: 'Can manage tasks within their client',
    inherits: ['client_collaborator'],
    permissions: [
      { permission: 'tasks.edit', scope: 'all' },
      { permission: 'tasks.assign', scope: 'all' },
      { permission: 'subtasks.create', scope: 'all' },
      { permission: 'subtasks.edit', scope: 'all' },
    ]
  },
};
```

### Example Grants

```typescript
// Your team member - full access to org
{
  userId: 'user_alice',
  roleId: 'role_team_member',
  grantType: 'allow',
  contextType: 'org',
  contextId: 'org_yourcompany'
}

// Client collaborator - access to specific client
{
  userId: 'user_bob_from_client',
  roleId: 'role_client_collaborator',
  grantType: 'allow',
  contextType: 'client',
  contextId: 'client_acme'
}

// Direct grant - extra permission for specific project
{
  userId: 'user_bob_from_client',
  permission: 'tasks.delete',
  scope: 'own',
  grantType: 'allow',
  contextType: 'project',
  contextId: 'project_acme_website'
}
```

---

## Summary

| Layer | Purpose | Flexibility |
|-------|---------|-------------|
| **Atomic permissions** | Define what actions exist | Per-app |
| **Scopes** | Limit reach (own, all, assigned) | Standard set |
| **Roles** | Bundle permissions for convenience | System + custom |
| **Grants** | Connect users to permissions | Per-user, per-context |

This framework provides:
- **Granularity** when needed (direct permission grants)
- **Simplicity** when preferred (role assignments)
- **Flexibility** for different apps (define your own permissions)
- **Future-proofing** for complex scenarios (deny grants, context hierarchy)
