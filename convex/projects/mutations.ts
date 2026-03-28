import { mutation } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";
import { zCustomMutation } from "convex-helpers/server/zod4";
import { NoOp } from "convex-helpers/server/customFunctions";
import { zodToConvex } from "convex-helpers/server/zod4";
import { asyncMap } from "convex-helpers";
import { createProjectInput, projectStatus } from "../../src/shared/schemas/projects";
import { ERRORS } from "../../src/shared/errors";
import { logActivity } from "@cvx/activityLogs/helpers";

const zMutation = zCustomMutation(mutation, NoOp);

export const create = zMutation({
  args: createProjectInput,
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      status: "active",
      creatorId: userId,
    });

    await logActivity(ctx, {
      entityType: "project",
      entityId: projectId,
      action: "created",
      actor: userId,
    });

    return projectId;
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    status: v.optional(zodToConvex(projectStatus)),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error(ERRORS.projects.NOT_FOUND);

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.status !== undefined) patch.status = args.status;

    await ctx.db.patch(args.projectId, patch);

    if (args.status !== undefined && args.status !== project.status) {
      await logActivity(ctx, {
        entityType: "project",
        entityId: args.projectId,
        action: "status_changed",
        actor: userId,
        metadata: { from: project.status, to: args.status },
      });
    }
    const editedFields = Object.keys(patch).filter((k) => k !== "status");
    if (editedFields.length > 0) {
      await logActivity(ctx, {
        entityType: "project",
        entityId: args.projectId,
        action: "edited",
        actor: userId,
        metadata: { fields: editedFields },
      });
    }
  },
});

export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await logActivity(ctx, {
      entityType: "project",
      entityId: args.projectId,
      action: "deleted",
      actor: userId,
    });

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Cascade: delete subtasks and work logs for each task, then the task
    await asyncMap(tasks, async (task) => {
      const subtasks = await ctx.db
        .query("subtasks")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();
      await asyncMap(subtasks, (s) => ctx.db.delete(s._id));

      const workLogs = await ctx.db
        .query("workLogs")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();
      await asyncMap(workLogs, (w) => ctx.db.delete(w._id));

      await ctx.db.delete(task._id);
    });

    await ctx.db.delete(args.projectId);
  },
});
