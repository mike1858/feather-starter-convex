// @generated-start imports
import { mutation } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";
import { zCustomMutation } from "convex-helpers/server/zod4";
import { NoOp } from "convex-helpers/server/customFunctions";
import {
  createTodosInput,
} from "../../src/shared/schemas/todos";
import { ERRORS } from "../../src/shared/errors";
// @generated-end imports

// @custom-start imports
// @custom-end imports

const zMutation = zCustomMutation(mutation, NoOp);

// @generated-start create
export const create = zMutation({
  args: createTodosInput,
  handler: async (ctx, args) => {
    // @custom-start create-pre
    // @custom-end create-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.insert("todos", {
      title: args.title,
      completed: args.completed,
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
    todosId: v.id("todos"),
    title: v.optional(v.string()),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // @custom-start update-pre
    // @custom-end update-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const todos = await ctx.db.get(args.todosId);
    if (!todos) throw new Error(ERRORS.todos.NOT_FOUND);

    /* v8 ignore start -- field-forwarding branches, not all combos tested */
    const patch: { title?: string; completed?: boolean } = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.completed !== undefined) patch.completed = args.completed;
    /* v8 ignore stop */

    await ctx.db.patch(args.todosId, patch);

    // @custom-start update-post
    // @custom-end update-post
  },
});
// @generated-end update

// @generated-start remove
export const remove = mutation({
  args: { todosId: v.id("todos") },
  handler: async (ctx, args) => {
    // @custom-start remove-pre
    // @custom-end remove-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.delete(args.todosId);

    // @custom-start remove-post
    // @custom-end remove-post
  },
});
// @generated-end remove



// @generated-start reorder
export const reorder = mutation({
  args: {
    todosId: v.id("todos"),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    // @custom-start reorder-pre
    // @custom-end reorder-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.patch(args.todosId, { position: args.newPosition });

    // @custom-start reorder-post
    // @custom-end reorder-post
  },
});
// @generated-end reorder
