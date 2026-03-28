import { z } from "zod";

export const hooksSchema = z.object({
  beforeSave: z.string().optional(),
  afterSave: z.string().optional(),
  beforeDelete: z.string().optional(),
  afterDelete: z.string().optional(),
  onStatusChange: z.string().optional(),
  onAssign: z.string().optional(),
  custom: z.record(z.string(), z.string()).optional(),
});

export type Hooks = z.infer<typeof hooksSchema>;
