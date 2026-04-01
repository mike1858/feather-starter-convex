import { mutation } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";

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
    status: v.union(
      v.literal("draft"),
      v.literal("analyzing"),
      v.literal("confirming"),
      v.literal("generating"),
      v.literal("importing"),
      v.literal("complete"),
      v.literal("failed"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const importDoc = await ctx.db.get(args.importId);
    if (!importDoc || importDoc.userId !== userId) throw new Error("Import not found");
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
    if (!importDoc || importDoc.userId !== userId) throw new Error("Import not found");
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
    if (!importDoc || importDoc.userId !== userId) throw new Error("Import not found");
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
    if (!importDoc || importDoc.userId !== userId) throw new Error("Import not found");
    await ctx.db.patch(args.importId, {
      importStats: args.importStats,
      status: "complete",
      completedAt: Date.now(),
    });
  },
});

export const saveErrors = mutation({
  args: {
    importId: v.id("imports"),
    errors: v.array(
      v.object({
        entityName: v.string(),
        rowNumber: v.number(),
        severity: v.union(
          v.literal("green"),
          v.literal("yellow"),
          v.literal("red"),
        ),
        column: v.string(),
        originalValue: v.optional(v.string()),
        fixedValue: v.optional(v.string()),
        errorMessage: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    for (const error of args.errors) {
      await ctx.db.insert("importErrors", {
        importId: args.importId,
        ...error,
      });
    }
  },
});

export const remove = mutation({
  args: { importId: v.id("imports") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const importDoc = await ctx.db.get(args.importId);
    if (!importDoc || importDoc.userId !== userId) throw new Error("Import not found");
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
