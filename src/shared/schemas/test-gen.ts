// @generated-start schema
import { z } from "zod";

export const TITLE_MAX_LENGTH = 200;

export const DESCRIPTION_MAX_LENGTH = 5000;

export const STATUS_VALUES = ["draft", "active", "completed"] as const;
export const status = z.enum(STATUS_VALUES);
export type Status = z.infer<typeof status>;

export const createTestGenInput = z.object({
  title: z.string().max(TITLE_MAX_LENGTH).min(1).trim(),
  description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
  priority: z.boolean().default(false),
});

export const updateTestGenInput = z.object({
  title: z.string().max(TITLE_MAX_LENGTH).optional(),
  description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
  priority: z.boolean().optional(),
});
// @generated-end schema

// @custom-start validators
// @custom-end validators
