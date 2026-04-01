import { query } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";

export const get = query({
  args: { importId: v.id("imports") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    const importDoc = await ctx.db.get(args.importId);
    if (!importDoc || importDoc.userId !== userId) return null;
    return importDoc;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("imports")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getErrors = query({
  args: {
    importId: v.id("imports"),
    severity: v.optional(
      v.union(v.literal("green"), v.literal("yellow"), v.literal("red")),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const importDoc = await ctx.db.get(args.importId);
    if (!importDoc || importDoc.userId !== userId) return [];
    if (args.severity) {
      return await ctx.db
        .query("importErrors")
        .withIndex("by_import_severity", (q) =>
          q.eq("importId", args.importId).eq("severity", args.severity!),
        )
        .collect();
    }
    return await ctx.db
      .query("importErrors")
      .withIndex("by_import", (q) => q.eq("importId", args.importId))
      .collect();
  },
});
