// @generated — DO NOT EDIT. Customize in src/custom/workLogs/

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const workLogsTable = defineTable({
  body: v.string(),
  timeMinutes: v.optional(v.number()),
  creatorId: v.id("users"),
});
