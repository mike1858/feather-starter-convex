// @generated-start schema
import { z } from "zod";

export const BODY_MAX_LENGTH = 2000;

export const createWorkLogsInput = z.object({
  body: z.string().max(BODY_MAX_LENGTH),
  timeMinutes: z.number().optional(),
});

export const updateWorkLogsInput = z.object({
  body: z.string().max(BODY_MAX_LENGTH).optional(),
  timeMinutes: z.number().optional(),
});
// @generated-end schema

// @custom-start validators
// @custom-end validators
