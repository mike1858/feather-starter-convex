import { query } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";

export const myTasks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("tasks")
      .withIndex("by_assignee", (q) => q.eq("assigneeId", userId))
      .collect()
      .then((tasks) => tasks.sort((a, b) => a.position - b.position));
  },
});

export const teamPool = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const sharedTasks = await ctx.db
      .query("tasks")
      .withIndex("by_visibility", (q) => q.eq("visibility", "shared"))
      .collect();
    return sharedTasks
      .filter((t) => !t.assigneeId)
      .sort((a, b) => a.position - b.position);
  },
});

// TODO: scope to org in v3.0
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      username: u.username,
      email: u.email,
      image: u.image,
    }));
  },
});
