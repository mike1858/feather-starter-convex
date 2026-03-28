// @generated-start schema
import { z } from "zod";

export const TITLE_MAX_LENGTH = 200;

export const createTodosInput = z.object({
  title: z.string().max(TITLE_MAX_LENGTH).min(1).trim(),
  completed: z.boolean().default(false),
});

export const updateTodosInput = z.object({
  title: z.string().max(TITLE_MAX_LENGTH).optional(),
  completed: z.boolean().optional(),
});
// @generated-end schema

// @custom-start validators
// @custom-end validators
