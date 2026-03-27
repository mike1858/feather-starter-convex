// @generated-start imports
import { mutation } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";
import { zCustomMutation } from "convex-helpers/server/zod4";
import { NoOp } from "convex-helpers/server/customFunctions";
import {
  createWorkLogsInput,
} from "../../src/shared/schemas/work-logs";
import { ERRORS } from "../../src/shared/errors";
// @generated-end imports

// @custom-start imports
// @custom-end imports

const zMutation = zCustomMutation(mutation, NoOp);

// @generated-start create
export const create = zMutation({
  args: createWorkLogsInput,
  handler: async (ctx, args) => {
    // @custom-start create-pre
    // @custom-end create-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.insert("work-logs", {
      body: args.body,
      timeMinutes: args.timeMinutes,
      userId,
    });

    // @custom-start create-post
    // @custom-end create-post
  },
});
// @generated-end create

// @generated-start update
export const update = mutation({
  args: {
    workLogsId: v.id("work-logs"),
    body: v.optional(v.string()),
    timeMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // @custom-start update-pre
    // @custom-end update-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const workLogs = await ctx.db.get(args.workLogsId);
    if (!workLogs) throw new Error(ERRORS["work-logs"].NOT_FOUND);

    const patch: Record<string, unknown> = {};
    if (args.body !== undefined) patch.body = args.body;
    if (args.timeMinutes !== undefined) patch.timeMinutes = args.timeMinutes;

    await ctx.db.patch(args.workLogsId, patch);

    // @custom-start update-post
    // @custom-end update-post
  },
});
// @generated-end update

// @generated-start remove
export const remove = mutation({
  args: { workLogsId: v.id("work-logs") },
  handler: async (ctx, args) => {
    // @custom-start remove-pre
    // @custom-end remove-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.delete(args.workLogsId);

    // @custom-start remove-post
    // @custom-end remove-post
  },
});
// @generated-end remove



