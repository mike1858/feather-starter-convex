import { query, internalQuery } from "@cvx/_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("devErrors")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();
  },
});

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const errors = await ctx.db.query("devErrors").collect();

    const bySource: Record<string, number> = {};
    let undigested = 0;

    for (const error of errors) {
      bySource[error.source] = (bySource[error.source] ?? 0) + 1;
      if (!error.digested) {
        undigested++;
      }
    }

    return {
      total: errors.length,
      bySource,
      undigested,
    };
  },
});

export const listUndigested = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("devErrors")
      .withIndex("by_digested")
      .filter((q) => q.neq(q.field("digested"), true))
      .collect();
  },
});
