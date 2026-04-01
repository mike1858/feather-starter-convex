import { mutation } from "@cvx/_generated/server";

/**
 * Clears ALL data from every table. Used by E2E test fixtures for
 * auto-cleanup between tests. Never call this in production.
 */
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "activityLogs",
      "workLogs",
      "subtasks",
      "tasks",
      "projects",
      "todos",
      "tickets",
      "contacts",
      "users",
      "devEmails",
      // Auth tables from @convex-dev/auth
      "authAccounts",
      "authSessions",
      "authVerificationCodes",
      "authVerifiers",
      "authRateLimits",
      "authRefreshTokens",
    ] as const;

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }
  },
});
