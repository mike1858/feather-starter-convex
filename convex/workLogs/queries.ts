import { query } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";

export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return { entries: [], totalMinutes: 0 };

    const entries = await ctx.db
      .query("workLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const totalMinutes = entries.reduce(
      (sum, entry) => sum + (entry.timeMinutes ?? 0),
      0,
    );

    return { entries, totalMinutes };
  },
});
