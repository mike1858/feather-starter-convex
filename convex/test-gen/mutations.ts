// @generated-start imports
import { mutation } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";
import { zCustomMutation } from "convex-helpers/server/zod4";
import { NoOp } from "convex-helpers/server/customFunctions";
import { zodToConvex } from "convex-helpers/server/zod4";
import {
  createTestGenInput,
  status,
  STATUS_VALUES,
} from "../../src/shared/schemas/test-gen";
import { ERRORS } from "../../src/shared/errors";
// @generated-end imports

// @custom-start imports
// CUSTOM: This comment should survive regeneration
// @custom-end imports

const zMutation = zCustomMutation(mutation, NoOp);

// @generated-start create
export const create = zMutation({
  args: createTestGenInput,
  handler: async (ctx, args) => {
    // @custom-start create-pre
    // @custom-end create-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.insert("test-gen", {
      title: args.title,
      description: args.description,
      status: "draft",
      priority: args.priority,
      userId,
      position: Date.now(),
    });

    // @custom-start create-post
    // @custom-end create-post
  },
});
// @generated-end create

// @generated-start update
export const update = mutation({
  args: {
    testGenId: v.id("test-gen"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // @custom-start update-pre
    // @custom-end update-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const testGen = await ctx.db.get(args.testGenId);
    if (!testGen) throw new Error(ERRORS["test-gen"].NOT_FOUND);

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) patch.description = args.description;
    if (args.priority !== undefined) patch.priority = args.priority;

    await ctx.db.patch(args.testGenId, patch);

    // @custom-start update-post
    // @custom-end update-post
  },
});
// @generated-end update

// @generated-start remove
export const remove = mutation({
  args: { testGenId: v.id("test-gen") },
  handler: async (ctx, args) => {
    // @custom-start remove-pre
    // @custom-end remove-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.delete(args.testGenId);

    // @custom-start remove-post
    // @custom-end remove-post
  },
});
// @generated-end remove

// @generated-start updateStatus
export const updateStatus = mutation({
  args: {
    testGenId: v.id("test-gen"),
    status: zodToConvex(status),
  },
  handler: async (ctx, args) => {
    // @custom-start updateStatus-pre
    // @custom-end updateStatus-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const testGen = await ctx.db.get(args.testGenId);
    if (!testGen) throw new Error(ERRORS["test-gen"].NOT_FOUND);

    const currentIndex = STATUS_VALUES.indexOf(
      testGen.status as (typeof STATUS_VALUES)[number],
    );
    const newIndex = STATUS_VALUES.indexOf(
      args.status as (typeof STATUS_VALUES)[number],
    );

    if (newIndex !== currentIndex + 1) {
      throw new Error(ERRORS["test-gen"].INVALID_STATUS_TRANSITION);
    }

    await ctx.db.patch(args.testGenId, { status: args.status });

    // @custom-start updateStatus-post
    // @custom-end updateStatus-post
  },
});
// @generated-end updateStatus


// @generated-start reorder
export const reorder = mutation({
  args: {
    testGenId: v.id("test-gen"),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    // @custom-start reorder-pre
    // @custom-end reorder-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.patch(args.testGenId, { position: args.newPosition });

    // @custom-start reorder-post
    // @custom-end reorder-post
  },
});
// @generated-end reorder
