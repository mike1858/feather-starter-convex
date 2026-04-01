// @generated-start imports
import { mutation } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
import { v } from "convex/values";
import { zCustomMutation } from "convex-helpers/server/zod4";
import { NoOp } from "convex-helpers/server/customFunctions";
import {
  createContactsInput,
} from "../../src/shared/schemas/contacts";
import { ERRORS } from "../../src/shared/errors";
// @generated-end imports

// @custom-start imports
// @custom-end imports

const zMutation = zCustomMutation(mutation, NoOp);

// @generated-start create
export const create = zMutation({
  args: createContactsInput,
  handler: async (ctx, args) => {
    // @custom-start create-pre
    // @custom-end create-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.insert("contacts", {
      name: args.name,
      email: args.email,
      company: args.company,
      status: args.status ?? "lead",
      phone: args.phone,
      userId,
    });

    // @custom-start create-post
    // @custom-end create-post
  },
});
// @generated-end create

// @generated-start update
export const update = mutation({
  args: {
    contactsId: v.id("contacts"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // @custom-start update-pre
    // @custom-end update-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    const contacts = await ctx.db.get(args.contactsId);
    if (!contacts) throw new Error(ERRORS.contacts.NOT_FOUND);

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.email !== undefined) patch.email = args.email;
    if (args.company !== undefined) patch.company = args.company;
    if (args.phone !== undefined) patch.phone = args.phone;

    await ctx.db.patch(args.contactsId, patch);

    // @custom-start update-post
    // @custom-end update-post
  },
});
// @generated-end update

// @generated-start remove
export const remove = mutation({
  args: { contactsId: v.id("contacts") },
  handler: async (ctx, args) => {
    // @custom-start remove-pre
    // @custom-end remove-pre

    const userId = await auth.getUserId(ctx);
    if (!userId) return;

    await ctx.db.delete(args.contactsId);

    // @custom-start remove-post
    // @custom-end remove-post
  },
});
// @generated-end remove



