// @generated — DO NOT EDIT. Customize in src/custom/tasks/

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tasksTable = defineTable({
  title: v.string(),
  description: v.optional(v.string()),
  status: v.string(),
  visibility: v.string(),
  priority: v.optional(v.boolean()),
  creatorId: v.id("users"),
});
