import { z } from "zod";

const permissionLevelSchema = z.enum([
  "authenticated",
  "owner",
  "admin",
  "public",
  "custom",
]);

export const accessSchema = z
  .object({
    scope: z.enum(["owner", "shared", "public", "custom"]).default("owner"),
    permissions: z
      .object({
        create: permissionLevelSchema.default("authenticated"),
        read: permissionLevelSchema.default("owner"),
        update: permissionLevelSchema.default("owner"),
        delete: permissionLevelSchema.default("owner"),
      })
      .default({}),
    sharing: z.boolean().default(false),
    ownerField: z.string().default("creatorId"),
  })
  .default({});

export type Access = z.infer<typeof accessSchema>;
