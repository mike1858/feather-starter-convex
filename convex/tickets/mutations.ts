// @generated-start imports
import { mutation } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";
import { zCustomMutation } from "convex-helpers/server/zod4";
import { NoOp } from "convex-helpers/server/customFunctions";
import {
  createTicketsInput,
} from "../../src/shared/schemas/tickets";
import { ERRORS } from "../../src/shared/errors";
// @generated-end imports

// @custom-start imports
// @custom-end imports

const zMutation = zCustomMutation(mutation, NoOp);

// @generated-start create
export const create = zMutation({
  args: createTicketsInput,
  handler: async (ctx, args) => {
    // @custom-start create-pre
    // @custom-end create-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.insert("tickets", {
      title: args.title,
      description: args.description,
      status: args.status ?? "open",
      priority: args.priority ?? "medium",
      assigneeId: userId,
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
    ticketsId: v.id("tickets"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // @custom-start update-pre
    // @custom-end update-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const tickets = await ctx.db.get(args.ticketsId);
    if (!tickets) throw new Error(ERRORS.tickets.NOT_FOUND);

    const patch: { title?: string; description?: string } = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) patch.description = args.description;

    await ctx.db.patch(args.ticketsId, patch);

    // @custom-start update-post
    // @custom-end update-post
  },
});
// @generated-end update

// @generated-start remove
export const remove = mutation({
  args: { ticketsId: v.id("tickets") },
  handler: async (ctx, args) => {
    // @custom-start remove-pre
    // @custom-end remove-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.delete(args.ticketsId);

    // @custom-start remove-post
    // @custom-end remove-post
  },
});
// @generated-end remove


// @generated-start assign
export const assign = mutation({
  args: {
    ticketsId: v.id("tickets"),
    assigneeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // @custom-start assign-pre
    // @custom-end assign-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const tickets = await ctx.db.get(args.ticketsId);
    if (!tickets) throw new Error(ERRORS.tickets.NOT_FOUND);

    await ctx.db.patch(args.ticketsId, { assigneeId: args.assigneeId });

    // @custom-start assign-post
    // @custom-end assign-post
  },
});
// @generated-end assign

// @generated-start reorder
export const reorder = mutation({
  args: {
    ticketsId: v.id("tickets"),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    // @custom-start reorder-pre
    // @custom-end reorder-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.patch(args.ticketsId, { position: args.newPosition });

    // @custom-start reorder-post
    // @custom-end reorder-post
  },
});
// @generated-end reorder
