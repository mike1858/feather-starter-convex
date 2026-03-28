import { z } from "zod";

export const scheduleSchema = z.object({
  cron: z.string(),
  action: z.string(),
  condition: z.string().optional(),
});

export type Schedule = z.infer<typeof scheduleSchema>;
