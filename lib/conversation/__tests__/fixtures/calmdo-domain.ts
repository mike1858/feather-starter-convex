import type { EntityDraft, BehaviorOverlay } from "../../conversation-state";

/** CalmDo domain: 5 entities matching the feather-starter-convex reference app */
export function createCalmDoDomain(): EntityDraft[] {
  return [
    {
      name: "tasks",
      label: "Task",
      labelPlural: "Tasks",
      description: "A unit of work that can be assigned and tracked",
      fields: {
        title: { type: "string", required: true, max: 200 },
        description: { type: "text", max: 5000 },
        status: {
          type: "enum",
          values: ["todo", "in_progress", "done"],
          default: "todo",
        },
        visibility: {
          type: "enum",
          values: ["private", "shared"],
          default: "private",
        },
        priority: { type: "boolean", default: false },
      },
      relationships: [
        {
          type: "belongs_to",
          target: "projects",
          required: false,
          column: "projectId",
        },
      ],
    },
    {
      name: "projects",
      label: "Project",
      labelPlural: "Projects",
      description: "A container for organizing related tasks",
      fields: {
        name: { type: "string", required: true, max: 100 },
        description: { type: "text", max: 5000 },
        status: {
          type: "enum",
          values: ["active", "on_hold", "completed", "archived"],
          default: "active",
        },
      },
      relationships: [],
    },
    {
      name: "subtasks",
      label: "Subtask",
      labelPlural: "Subtasks",
      description: "A checklist item within a task",
      fields: {
        title: { type: "string", required: true, max: 200 },
        done: { type: "boolean", default: false },
        position: { type: "number", default: 0 },
      },
      relationships: [
        {
          type: "belongs_to",
          target: "tasks",
          required: true,
          column: "taskId",
        },
      ],
    },
    {
      name: "work-logs",
      label: "Work Log",
      labelPlural: "Work Logs",
      description: "Time entry for work performed on a task",
      fields: {
        body: { type: "text", required: true, max: 5000 },
        minutes: { type: "number", default: 0 },
      },
      relationships: [
        {
          type: "belongs_to",
          target: "tasks",
          required: true,
          column: "taskId",
        },
      ],
    },
    {
      name: "activity-logs",
      label: "Activity Log",
      labelPlural: "Activity Logs",
      description: "Audit trail entry for entity changes",
      fields: {
        entityType: { type: "string", required: true },
        entityId: { type: "string", required: true },
        action: {
          type: "enum",
          values: [
            "created",
            "updated",
            "deleted",
            "status_changed",
            "assigned",
          ],
          required: true,
        },
        details: { type: "text" },
      },
      relationships: [],
    },
  ];
}

/** Behavior overlays for CalmDo entities */
export function createCalmDoBehaviors(): Record<string, BehaviorOverlay> {
  return {
    tasks: {
      access: {
        scope: "custom",
        permissions: {
          create: "authenticated",
          read: "custom",
          update: "owner",
          delete: "owner",
        },
      },
      statusFlow: {
        field: "status",
        transitions: {
          todo: ["in_progress"],
          in_progress: ["done"],
        },
      },
      hooks: {
        afterSave: "custom/tasks/hooks/afterSave",
        onStatusChange: "custom/tasks/hooks/onStatusChange",
      },
      derivedData: {
        subtaskCount: { type: "count", source: "subtasks" },
        totalTimeLogged: {
          type: "sum",
          source: "work-logs",
          field: "minutes",
        },
      },
      views: {
        defaultView: "list",
        enabledViews: ["list"],
      },
      behaviors: { assignable: true, orderable: true },
      identity: { type: "auto-increment" },
    },
    projects: {
      access: {
        scope: "owner",
        permissions: {
          create: "authenticated",
          read: "owner",
          update: "owner",
          delete: "owner",
        },
      },
      views: {
        defaultView: "list",
        enabledViews: ["list", "card"],
      },
    },
    subtasks: {
      access: {
        scope: "owner",
        permissions: {
          create: "authenticated",
          read: "authenticated",
          update: "owner",
          delete: "owner",
        },
      },
      behaviors: { orderable: true },
    },
    "work-logs": {
      access: {
        scope: "owner",
        permissions: {
          create: "authenticated",
          read: "authenticated",
          update: "owner",
          delete: "owner",
        },
      },
    },
    "activity-logs": {
      access: {
        scope: "owner",
        permissions: {
          create: "authenticated",
          read: "authenticated",
          update: "owner",
          delete: "owner",
        },
      },
    },
  };
}
