// @generated — DO NOT EDIT. Customize in src/custom/activityLogs/

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const activityLogsTable = defineTable({
  entityType: v.string(),
  entityId: v.string(),
  action: v.string(),
  metadata: v.optional(v.string()),
  creatorId: v.id("users"),
});
