import { z } from "zod";

const guardSchema = z.object({
  condition: z.string(),
  message: z.string(),
});

export const statusFlowSchema = z.object({
  field: z.string(),
  transitions: z.record(z.string(), z.array(z.string())),
  guards: z.record(z.string(), guardSchema).optional(),
  hooks: z.record(z.string(), z.string()).optional(),
});

export type StatusFlow = z.infer<typeof statusFlowSchema>;
