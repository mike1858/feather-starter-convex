import { mutation } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";
import { ERRORS } from "../../src/shared/errors";

export const saveMappings = mutation({
  args: {
    importId: v.id("imports"),
    mappings: v.array(
      v.object({
        entityName: v.string(),
        systemFieldId: v.string(),
        systemFieldName: v.string(),
        excelColumnName: v.string(),
        excelColumnPosition: v.number(),
        excelSheetName: v.string(),
        dataFingerprint: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const importDoc = await ctx.db.get(args.importId);
    if (!importDoc || importDoc.userId !== userId)
      throw new Error(ERRORS.imports.NOT_FOUND);
    const ids = [];
    for (const mapping of args.mappings) {
      const id = await ctx.db.insert("schemaMappings", {
        userId,
        importId: args.importId,
        ...mapping,
        importHistory: JSON.stringify([]),
      });
      ids.push(id);
    }
    return ids;
  },
});

export const updateMapping = mutation({
  args: {
    mappingId: v.id("schemaMappings"),
    systemFieldName: v.optional(v.string()),
    excelColumnName: v.optional(v.string()),
    excelColumnPosition: v.optional(v.number()),
    dataFingerprint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const mapping = await ctx.db.get(args.mappingId);
    if (!mapping || mapping.userId !== userId)
      throw new Error("Mapping not found");
    const patch: Record<string, unknown> = {};
    if (args.systemFieldName !== undefined) {
      patch.systemFieldName = args.systemFieldName;
    }
    if (args.excelColumnName !== undefined) {
      // Track rename in history
      const history = JSON.parse(mapping.importHistory) as Array<{
        date: string;
        oldName: string;
        newName: string;
      }>;
      history.push({
        date: new Date().toISOString(),
        oldName: mapping.excelColumnName,
        newName: args.excelColumnName,
      });
      patch.excelColumnName = args.excelColumnName;
      patch.importHistory = JSON.stringify(history);
    }
    if (args.excelColumnPosition !== undefined)
      patch.excelColumnPosition = args.excelColumnPosition;
    if (args.dataFingerprint !== undefined)
      patch.dataFingerprint = args.dataFingerprint;
    await ctx.db.patch(args.mappingId, patch);
  },
});
