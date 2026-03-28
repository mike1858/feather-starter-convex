import { z } from "zod";

export const integrationSchema = z.object({
  type: z.enum(["webhook-in", "webhook-out", "api-call", "email", "sms"]),
  trigger: z.string().optional(),
  endpoint: z.string().optional(),
  handler: z.string().optional(),
});

export type Integration = z.infer<typeof integrationSchema>;
