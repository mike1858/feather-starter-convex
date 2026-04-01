import { v } from "convex/values";
import { mutation, internalMutation } from "@cvx/_generated/server";

export const store = mutation({
  args: {
    source: v.union(
      v.literal("frontend"),
      v.literal("backend"),
      v.literal("silent"),
      v.literal("startup"),
    ),
    message: v.string(),
    stack: v.optional(v.string()),
    route: v.optional(v.string()),
    functionName: v.optional(v.string()),
    args: v.optional(v.string()),
    browserInfo: v.optional(v.string()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("devErrors", args);
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const errors = await ctx.db.query("devErrors").collect();
    for (const error of errors) {
      await ctx.db.delete(error._id);
    }
  },
});

export const markDigested = mutation({
  args: {
    ids: v.array(v.id("devErrors")),
  },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.patch(id, { digested: true });
    }
  },
});

export const markDigestedInternal = internalMutation({
  args: {
    ids: v.array(v.id("devErrors")),
  },
  handler: async (ctx, { ids }) => {
    for (const id of ids) {
      await ctx.db.patch(id, { digested: true });
    }
  },
});

export const storeDigest = internalMutation({
  args: {
    digest: v.string(),
    receivedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("errorDigests", args);
  },
});
