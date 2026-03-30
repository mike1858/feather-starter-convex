// @generated — DO NOT EDIT. Customize in src/custom/projects/

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const projectsTable = defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  status: v.string(),
  creatorId: v.id("users"),
});
