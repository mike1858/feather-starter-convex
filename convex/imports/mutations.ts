import { mutation } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";
import { zodToConvex } from "convex-helpers/server/zod4";
import { importStatus } from "../../src/shared/schemas/imports";
import { ERRORS } from "../../src/shared/errors";

export const create = mutation({
  args: {
    fileName: v.string(),
    fileStorageId: v.optional(v.string()),
    sheetMetadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("imports", {
      userId,
      fileName: args.fileName,
      fileStorageId: args.fileStorageId,
      status: "draft",
      sheetMetadata: args.sheetMetadata,
    });
  },
});

export const updateStatus = mutation({
  args: {
    importId: v.id("imports"),
    status: zodToConvex(importStatus),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const importDoc = await ctx.db.get(args.importId);
    if (!importDoc || importDoc.userId !== userId)
      throw new Error(ERRORS.imports.NOT_FOUND);
    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === "complete") patch.completedAt = Date.now();
    await ctx.db.patch(args.importId, patch);
  },
});

export const saveAnalysis = mutation({
  args: {
    importId: v.id("imports"),
    analysisResult: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const importDoc = await ctx.db.get(args.importId);
    if (!importDoc || importDoc.userId !== userId)
      throw new Error(ERRORS.imports.NOT_FOUND);
    await ctx.db.patch(args.importId, {
      analysisResult: args.analysisResult,
      status: "confirming",
    });
  },
});

export const confirmSchema = mutation({
  args: {
    importId: v.id("imports"),
    confirmedSchema: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const importDoc = await ctx.db.get(args.importId);
    if (!importDoc || importDoc.userId !== userId)
      throw new Error(ERRORS.imports.NOT_FOUND);
    await ctx.db.patch(args.importId, {
      confirmedSchema: args.confirmedSchema,
      status: "generating",
    });
  },
});

export const saveImportStats = mutation({
  args: {
    importId: v.id("imports"),
    importStats: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const importDoc = await ctx.db.get(args.importId);
    if (!importDoc || importDoc.userId !== userId)
      throw new Error(ERRORS.imports.NOT_FOUND);
    await ctx.db.patch(args.importId, {
      importStats: args.importStats,
      status: "complete",
      completedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { importId: v.id("imports") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const importDoc = await ctx.db.get(args.importId);
    if (!importDoc || importDoc.userId !== userId)
      throw new Error(ERRORS.imports.NOT_FOUND);
    // Delete associated errors
    const errors = await ctx.db
      .query("importErrors")
      .withIndex("by_import", (q) => q.eq("importId", args.importId))
      .collect();
    for (const error of errors) {
      await ctx.db.delete(error._id);
    }
    // Delete associated mappings
    const mappings = await ctx.db
      .query("schemaMappings")
      .withIndex("by_import", (q) => q.eq("importId", args.importId))
      .collect();
    for (const mapping of mappings) {
      await ctx.db.delete(mapping._id);
    }
    await ctx.db.delete(args.importId);
  },
});
