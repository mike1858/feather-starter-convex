// @generated — DO NOT EDIT. Customize in src/custom/subtasks/

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const subtasksTable = defineTable({
  title: v.string(),
  status: v.string(),
  promotedToTaskId: v.optional(v.id("tasks")),
  creatorId: v.id("users"),
  position: v.number(),
});
