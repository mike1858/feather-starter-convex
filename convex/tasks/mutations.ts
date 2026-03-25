import { mutation } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";
import { zCustomMutation } from "convex-helpers/server/zod4";
import { NoOp } from "convex-helpers/server/customFunctions";
import { zodToConvex } from "convex-helpers/server/zod4";
import {
  createTaskInput,
  taskStatus,
  TASK_STATUS_VALUES,
} from "../../src/shared/schemas/tasks";
import { ERRORS } from "../../src/shared/errors";

const zMutation = zCustomMutation(mutation, NoOp);

export const create = zMutation({
  args: createTaskInput,
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      priority: args.priority,
      status: "todo",
      visibility: "private",
      creatorId: userId,
      assigneeId: userId,
      position: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error(ERRORS.tasks.NOT_FOUND);

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) patch.description = args.description;
    if (args.priority !== undefined) patch.priority = args.priority;

    await ctx.db.patch(args.taskId, patch);
  },
});

export const remove = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.delete(args.taskId);
  },
});

export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: zodToConvex(taskStatus),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error(ERRORS.tasks.NOT_FOUND);

    const currentIndex = TASK_STATUS_VALUES.indexOf(
      task.status as (typeof TASK_STATUS_VALUES)[number],
    );
    const newIndex = TASK_STATUS_VALUES.indexOf(
      args.status as (typeof TASK_STATUS_VALUES)[number],
    );

    if (newIndex !== currentIndex + 1) {
      throw new Error(ERRORS.tasks.INVALID_STATUS_TRANSITION);
    }

    await ctx.db.patch(args.taskId, { status: args.status });
  },
});

export const assign = mutation({
  args: {
    taskId: v.id("tasks"),
    assigneeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error(ERRORS.tasks.NOT_FOUND);

    const patch: Record<string, unknown> = { assigneeId: args.assigneeId };

    // Auto-flip: assigning to another user makes task shared
    if (args.assigneeId && args.assigneeId !== task.creatorId) {
      patch.visibility = "shared";
    }

    await ctx.db.patch(args.taskId, patch);
  },
});

export const reorder = mutation({
  args: {
    taskId: v.id("tasks"),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.patch(args.taskId, { position: args.newPosition });
  },
});
