import { query } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";

export const getMappingsForEntity = query({
  args: { entityName: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const mappings = await ctx.db
      .query("schemaMappings")
      .withIndex("by_entity", (q) => q.eq("entityName", args.entityName))
      .collect();
    return mappings.filter((m) => m.userId === userId);
  },
});

export const getMappingsForImport = query({
  args: { importId: v.id("imports") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("schemaMappings")
      .withIndex("by_import", (q) => q.eq("importId", args.importId))
      .collect();
  },
});

export const findMatchingMappings = query({
  args: {
    sheetNames: v.array(v.string()),
    columnNames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const allMappings = await ctx.db.query("schemaMappings").collect();
    return allMappings.filter(
      (m) =>
        m.userId === userId &&
        (args.sheetNames.includes(m.excelSheetName) ||
          args.columnNames.includes(m.excelColumnName)),
    );
  },
});
