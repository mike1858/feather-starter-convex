import { mutation } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";
import { ERRORS } from "../../src/shared/errors";

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    body: v.string(),
    timeMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    return await ctx.db.insert("workLogs", {
      body: args.body,
      timeMinutes: args.timeMinutes,
      taskId: args.taskId,
      creatorId: userId,
    });
  },
});

export const update = mutation({
  args: {
    workLogId: v.id("workLogs"),
    body: v.optional(v.string()),
    timeMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const workLog = await ctx.db.get(args.workLogId);
    if (!workLog) throw new Error(ERRORS.workLogs.NOT_FOUND);

    if (workLog.creatorId !== userId) {
      throw new Error(ERRORS.workLogs.NOT_OWNER);
    }

    const patch: Record<string, unknown> = {};
    if (args.body !== undefined) patch.body = args.body;
    if (args.timeMinutes !== undefined) patch.timeMinutes = args.timeMinutes;

    await ctx.db.patch(args.workLogId, patch);
  },
});

export const remove = mutation({
  args: { workLogId: v.id("workLogs") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const workLog = await ctx.db.get(args.workLogId);
    if (!workLog) throw new Error(ERRORS.workLogs.NOT_FOUND);

    if (workLog.creatorId !== userId) {
      throw new Error(ERRORS.workLogs.NOT_OWNER);
    }

    await ctx.db.delete(args.workLogId);
  },
});
