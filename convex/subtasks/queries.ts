// @generated-start imports
import { query } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";
// @generated-end imports

// @custom-start imports
// @custom-end imports

// @generated-start list
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const all = await ctx.db
      .query("subtasks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const filtered = all;
    return filtered.sort((a, b) => a.position - b.position);
  },
});
// @generated-end list

// @generated-start get
export const get = query({
  args: { id: v.id("subtasks") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    return await ctx.db.get(args.id);
  },
});
// @generated-end get

