import { mutation } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";
import { zCustomMutation } from "convex-helpers/server/zod4";
import { NoOp } from "convex-helpers/server/customFunctions";
import { zodToConvex } from "convex-helpers/server/zod4";
import { asyncMap } from "convex-helpers";
import {
  createTaskInput,
  taskStatus,
  TASK_STATUS_VALUES,
} from "../../src/shared/schemas/tasks";
import { ERRORS } from "../../src/shared/errors";
import { logActivity } from "@cvx/activityLogs/helpers";

const zMutation = zCustomMutation(mutation, NoOp);

export const create = zMutation({
  args: createTaskInput,
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      priority: args.priority,
      status: "todo",
      visibility: "private",
      creatorId: userId,
      assigneeId: userId,
      position: Date.now(),
    });

    await logActivity(ctx, {
      entityType: "task",
      entityId: taskId,
      action: "created",
      actor: userId,
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

    const changedFields = Object.keys(patch);
    if (changedFields.length > 0) {
      await logActivity(ctx, {
        entityType: "task",
        entityId: args.taskId,
        action: "edited",
        actor: userId,
        metadata: { fields: changedFields },
      });
    }
  },
});

export const remove = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await logActivity(ctx, {
      entityType: "task",
      entityId: args.taskId,
      action: "deleted",
      actor: userId,
    });

    // Cascade delete subtasks
    const subtasks = await ctx.db
      .query("subtasks")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    await asyncMap(subtasks, (s) => ctx.db.delete(s._id));

    // Cascade delete work logs
    const workLogs = await ctx.db
      .query("workLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    await asyncMap(workLogs, (w) => ctx.db.delete(w._id));

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

    await logActivity(ctx, {
      entityType: "task",
      entityId: args.taskId,
      action: "status_changed",
      actor: userId,
      metadata: { from: task.status, to: args.status },
    });
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
    // Auto-flip: unassigning makes task shared (available in Team Pool)
    if (!args.assigneeId) {
      patch.visibility = "shared";
    }

    await ctx.db.patch(args.taskId, patch);

    if (args.assigneeId) {
      await logActivity(ctx, {
        entityType: "task",
        entityId: args.taskId,
        action: "assigned",
        actor: userId,
        metadata: { assigneeId: args.assigneeId },
      });
    } else {
      await logActivity(ctx, {
        entityType: "task",
        entityId: args.taskId,
        action: "unassigned",
        actor: userId,
      });
    }
  },
});

export const createInProject = mutation({
  args: {
    title: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      status: "todo",
      visibility: "shared",
      priority: false,
      creatorId: userId,
      assigneeId: userId,
      projectId: args.projectId,
      position: Date.now(),
    });

    await logActivity(ctx, {
      entityType: "task",
      entityId: taskId,
      action: "created",
      actor: userId,
      metadata: { projectId: args.projectId },
    });
  },
});

export const assignToProject = mutation({
  args: {
    taskId: v.id("tasks"),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error(ERRORS.tasks.NOT_FOUND);

    const patch: Record<string, unknown> = { projectId: args.projectId };

    if (args.projectId) {
      // Moving to project: auto-flip to shared (per D-06)
      patch.visibility = "shared";
    } else {
      // Removing from project: restore private if creator=assignee (per D-07)
      if (!task.assigneeId || task.assigneeId === task.creatorId) {
        patch.visibility = "private";
      }
      // else: stays shared (assigned to someone other than creator)
    }

    await ctx.db.patch(args.taskId, patch);

    await logActivity(ctx, {
      entityType: "task",
      entityId: args.taskId,
      action: "edited",
      actor: userId,
      metadata: { projectId: args.projectId ?? null },
    });
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
