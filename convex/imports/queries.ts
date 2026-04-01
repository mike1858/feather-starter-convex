import { query } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";

/**
 * List all imports for the current user, ordered by creation time (newest first).
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const imports = await ctx.db
      .query("imports")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return imports.sort((a, b) => b._creationTime - a._creationTime);
  },
});
