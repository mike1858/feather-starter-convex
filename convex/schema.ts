import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { zodToConvex } from "convex-helpers/server/zod4";
import {
  taskStatus,
  taskVisibility,
} from "../src/shared/schemas/tasks";
import { projectStatus } from "../src/shared/schemas/projects";



import {
  status,
} from "../src/shared/schemas/subtasks";

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
    status: zodToConvex(status),
    userId: v.id("users"),
    position: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_taskId", ["taskId"]),

  "work-logs": defineTable({
    body: v.string(),
    timeMinutes: v.optional(v.number()),
    userId: v.id("users"),
  })
    .index("by_task", ["taskId"])
    .index("by_userId", ["userId"])
    .index("by_taskId", ["taskId"]),

});

export default schema;
