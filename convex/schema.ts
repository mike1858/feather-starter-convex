import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { zodToConvex } from "convex-helpers/server/zod4";
import {
  taskStatus,
  taskVisibility,
} from "../src/shared/schemas/tasks";
import { projectStatus } from "../src/shared/schemas/projects";
import { subtaskStatus } from "../src/shared/schemas/subtasks";
import {
  activityLogEntityType,
  activityLogAction,
} from "../src/shared/schemas/activity-logs";

import {
  status as tickets_status,
  priority as tickets_priority,
} from "../src/shared/schemas/tickets";

import {
  status as contacts_status,
} from "../src/shared/schemas/contacts";

const schema = defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  }).index("email", ["email"]),
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.boolean(),
    status: zodToConvex(taskStatus),
    visibility: zodToConvex(taskVisibility),
    creatorId: v.id("users"),
    assigneeId: v.optional(v.id("users")),
    projectId: v.optional(v.id("projects")),
    position: v.number(),
  })
    .index("by_assignee", ["assigneeId"])
    .index("by_visibility", ["visibility"])
    .index("by_creator", ["creatorId"])
    .index("by_assignee_status", ["assigneeId", "status"])
    .index("by_project", ["projectId"]),
  projects: defineTable({
    name: v.string(),
    status: zodToConvex(projectStatus),
    creatorId: v.id("users"),
  })
    .index("by_status", ["status"])
    .index("by_creator", ["creatorId"]),
  devEmails: defineTable({
    to: v.array(v.string()),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),
    sentAt: v.number(),
  }).index("sentAt", ["sentAt"]),
  subtasks: defineTable({
    title: v.string(),
    status: zodToConvex(subtaskStatus),
    taskId: v.id("tasks"),
    position: v.number(),
    promotedToTaskId: v.optional(v.id("tasks")),
    creatorId: v.id("users"),
  })
    .index("by_task", ["taskId"]),
  workLogs: defineTable({
    body: v.string(),
    timeMinutes: v.optional(v.number()),
    taskId: v.id("tasks"),
    creatorId: v.id("users"),
  })
    .index("by_task", ["taskId"]),
  activityLogs: defineTable({
    entityType: zodToConvex(activityLogEntityType),
    entityId: v.string(),
    action: zodToConvex(activityLogAction),
    actor: v.id("users"),
    metadata: v.optional(v.string()),
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_actor", ["actor"]),
  todos: defineTable({
    title: v.string(),
    completed: v.optional(v.boolean()),
    userId: v.id("users"),
    position: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_completed", ["completed"]),

  tickets: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: zodToConvex(tickets_status),
    priority: zodToConvex(tickets_priority),
    userId: v.id("users"),
    assigneeId: v.optional(v.id("users")),
    position: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"]),

  contacts: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    company: v.optional(v.string()),
    status: zodToConvex(contacts_status),
    phone: v.optional(v.string()),
    userId: v.id("users"),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

});

export default schema;
