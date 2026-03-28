import { query } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";

export const listByEntity = query({
  args: {
    entityType: v.union(
      v.literal("task"),
      v.literal("project"),
      v.literal("subtask"),
    ),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("activityLogs")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId),
      )
      .collect();
  },
});

export const taskTimeline = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    // Fetch activity logs for this task
    const activities = await ctx.db
      .query("activityLogs")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "task").eq("entityId", args.taskId),
      )
      .collect();

    // Fetch subtask activity logs (subtasks belonging to this task)
    const subtasks = await ctx.db
      .query("subtasks")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const subtaskActivities = await Promise.all(
      subtasks.map((subtask) =>
        ctx.db
          .query("activityLogs")
          .withIndex("by_entity", (q) =>
            q.eq("entityType", "subtask").eq("entityId", subtask._id),
          )
          .collect(),
      ),
    );

    // Fetch work logs for this task
    const workLogs = await ctx.db
      .query("workLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    // Merge into a unified timeline
    const timeline = [
      ...activities.map((a) => ({
        type: "activity" as const,
        _creationTime: a._creationTime,
        entityType: a.entityType,
        action: a.action,
        actor: a.actor,
        metadata: a.metadata ? JSON.parse(a.metadata) : undefined,
      })),
      ...subtaskActivities.flat().map((a) => ({
        type: "activity" as const,
        _creationTime: a._creationTime,
        entityType: a.entityType,
        action: a.action,
        actor: a.actor,
        metadata: a.metadata ? JSON.parse(a.metadata) : undefined,
      })),
      ...workLogs.map((w) => ({
        type: "workLog" as const,
        _creationTime: w._creationTime,
        body: w.body,
        timeMinutes: w.timeMinutes,
        actor: w.creatorId,
      })),
    ];

    // Sort newest first
    timeline.sort((a, b) => b._creationTime - a._creationTime);

    return timeline;
  },
});
