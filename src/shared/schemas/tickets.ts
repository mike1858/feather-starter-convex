// @generated-start schema
import { z } from "zod";

export const TITLE_MAX_LENGTH = 200;

export const DESCRIPTION_MAX_LENGTH = 5000;

export const STATUS_VALUES = ["open", "in_progress", "resolved", "closed"] as const;
export const status = z.enum(STATUS_VALUES);
export type Status = z.infer<typeof status>;

export const PRIORITY_VALUES = ["low", "medium", "high", "critical"] as const;
export const priority = z.enum(PRIORITY_VALUES);
export type Priority = z.infer<typeof priority>;

export const createTicketsInput = z.object({
  title: z.string().max(TITLE_MAX_LENGTH).min(1).trim(),
  description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
  status: status.optional(),
  priority: priority.optional(),
});

export const updateTicketsInput = z.object({
  title: z.string().max(TITLE_MAX_LENGTH).optional(),
  description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
});
// @generated-end schema

// @custom-start validators
// @custom-end validators
