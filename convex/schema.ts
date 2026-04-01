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

import {
  importStatus,
  importErrorSeverity,
} from "../src/shared/schemas/imports";

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
    .index("by_project", ["projectId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["status", "assigneeId", "projectId", "priority"],
    }),
  projects: defineTable({
    name: v.string(),
    status: zodToConvex(projectStatus),
    creatorId: v.id("users"),
  })
    .index("by_status", ["status"])
    .index("by_creator", ["creatorId"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["status"],
    }),
  devEmails: defineTable({
    to: v.array(v.string()),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),
    sentAt: v.number(),
  }).index("sentAt", ["sentAt"]),
  devErrors: defineTable({
    source: v.union(
      v.literal("frontend"),
      v.literal("backend"),
      v.literal("silent"),
      v.literal("startup"),
    ),
    message: v.string(),
    stack: v.optional(v.string()),
    route: v.optional(v.string()),
    functionName: v.optional(v.string()),
    args: v.optional(v.string()),
    browserInfo: v.optional(v.string()),
    timestamp: v.number(),
    digested: v.optional(v.boolean()),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_source", ["source"])
    .index("by_digested", ["digested"]),
  errorDigests: defineTable({
    digest: v.string(),
    receivedAt: v.number(),
    sourceUrl: v.optional(v.string()),
  }).index("by_receivedAt", ["receivedAt"]),
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

  imports: defineTable({
    userId: v.id("users"),
    fileName: v.string(),
    fileStorageId: v.optional(v.string()),
    status: zodToConvex(importStatus),
    sheetMetadata: v.optional(v.string()),
    analysisResult: v.optional(v.string()),
    confirmedSchema: v.optional(v.string()),
    importStats: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  schemaMappings: defineTable({
    userId: v.id("users"),
    importId: v.id("imports"),
    entityName: v.string(),
    systemFieldId: v.string(),
    systemFieldName: v.string(),
    excelColumnName: v.string(),
    excelColumnPosition: v.number(),
    excelSheetName: v.string(),
    importHistory: v.string(),
    dataFingerprint: v.optional(v.string()),
  })
    .index("by_entity", ["entityName"])
    .index("by_import", ["importId"]),

  importErrors: defineTable({
    importId: v.id("imports"),
    entityName: v.string(),
    rowNumber: v.number(),
    severity: zodToConvex(importErrorSeverity),
    column: v.string(),
    originalValue: v.optional(v.string()),
    fixedValue: v.optional(v.string()),
    errorMessage: v.string(),
  })
    .index("by_import", ["importId"])
    .index("by_import_severity", ["importId", "severity"]),

});

export default schema;
