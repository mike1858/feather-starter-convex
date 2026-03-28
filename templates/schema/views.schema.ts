import { z } from "zod";

const filteredViewSchema = z.object({
  name: z.string(),
  label: z.string(),
  filter: z.record(z.string(), z.unknown()),
  navEntry: z.boolean().default(false),
});

export const viewsSchema = z
  .object({
    defaultView: z
      .enum(["list", "card", "table", "kanban", "calendar"])
      .default("list"),
    enabledViews: z.array(z.string()).default(["list", "card", "table"]),
    filteredViews: z.array(filteredViewSchema).optional(),
  })
  .default({});

export type Views = z.infer<typeof viewsSchema>;
