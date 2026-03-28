import { mutation } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";
import { ERRORS } from "../../src/shared/errors";
import { logActivity } from "@cvx/activityLogs/helpers";

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const subtaskId = await ctx.db.insert("subtasks", {
      title: args.title,
      status: "todo",
      taskId: args.taskId,
      position: Date.now(),
      creatorId: userId,
    });

    await logActivity(ctx, {
      entityType: "subtask",
      entityId: subtaskId,
      action: "created",
      actor: userId,
    });

    return subtaskId;
  },
});

export const update = mutation({
  args: {
    subtaskId: v.id("subtasks"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const subtask = await ctx.db.get(args.subtaskId);
    if (!subtask) throw new Error(ERRORS.subtasks.NOT_FOUND);

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) patch.title = args.title;

    await ctx.db.patch(args.subtaskId, patch);
  },
});

export const remove = mutation({
  args: { subtaskId: v.id("subtasks") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.delete(args.subtaskId);
  },
});

export const toggleDone = mutation({
  args: { subtaskId: v.id("subtasks") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const subtask = await ctx.db.get(args.subtaskId);
    if (!subtask) throw new Error(ERRORS.subtasks.NOT_FOUND);

    if (subtask.status === "promoted") {
      throw new Error(ERRORS.subtasks.ALREADY_PROMOTED);
    }

    const newStatus = subtask.status === "todo" ? "done" : "todo";
    await ctx.db.patch(args.subtaskId, { status: newStatus });

    if (newStatus === "done") {
      await logActivity(ctx, {
        entityType: "subtask",
        entityId: args.subtaskId,
        action: "completed",
        actor: userId,
      });
    }
  },
});

export const reorder = mutation({
  args: {
    subtaskId: v.id("subtasks"),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.patch(args.subtaskId, { position: args.newPosition });
  },
});

export const promote = mutation({
  args: { subtaskId: v.id("subtasks") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const subtask = await ctx.db.get(args.subtaskId);
    if (!subtask) throw new Error(ERRORS.subtasks.NOT_FOUND);

    if (subtask.status === "promoted") {
      throw new Error(ERRORS.subtasks.ALREADY_PROMOTED);
    }

    // Get parent task to inherit projectId
    const parentTask = await ctx.db.get(subtask.taskId);

    // Create new full task from subtask
    const newTaskId = await ctx.db.insert("tasks", {
      title: subtask.title,
      status: "todo",
      visibility: "shared",
      priority: false,
      creatorId: userId,
      assigneeId: userId,
      projectId: parentTask?.projectId,
      position: Date.now(),
    });

    // Mark subtask as promoted with link to new task
    await ctx.db.patch(args.subtaskId, {
      status: "promoted",
      promotedToTaskId: newTaskId,
    });

    await logActivity(ctx, {
      entityType: "subtask",
      entityId: args.subtaskId,
      action: "promoted",
      actor: userId,
      metadata: { newTaskId },
    });

    return newTaskId;
  },
});
