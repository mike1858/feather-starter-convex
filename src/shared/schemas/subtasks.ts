// @generated-start schema
import { z } from "zod";

export const TITLE_MAX_LENGTH = 200;

export const STATUS_VALUES = ["todo", "done", "promoted"] as const;
export const status = z.enum(STATUS_VALUES);
export type Status = z.infer<typeof status>;

export const createSubtasksInput = z.object({
  title: z.string().max(TITLE_MAX_LENGTH).min(1).trim(),
  status: status.optional(),
});

export const updateSubtasksInput = z.object({
  title: z.string().max(TITLE_MAX_LENGTH).optional(),
});
// @generated-end schema

// @custom-start validators
// @custom-end validators
