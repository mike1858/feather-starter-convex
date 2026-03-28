import { z } from "zod";

const relatedRecordSchema = z.object({
  source: z.string(),
  display: z.enum(["table", "checklist", "timeline", "cards"]),
  inline: z.boolean().default(false),
  columns: z.array(z.string()).optional(),
  readonly: z.boolean().default(false),
});

export const detailViewSchema = z.object({
  layout: z.enum(["tabs", "panels", "accordion"]).default("panels"),
  relatedRecords: z.array(relatedRecordSchema).default([]),
});

export type DetailView = z.infer<typeof detailViewSchema>;
