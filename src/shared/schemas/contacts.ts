// @generated-start schema
import { z } from "zod";

export const NAME_MAX_LENGTH = 200;

export const EMAIL_MAX_LENGTH = 200;

export const COMPANY_MAX_LENGTH = 200;

export const STATUS_VALUES = ["lead", "active", "inactive"] as const;
export const status = z.enum(STATUS_VALUES);
export type Status = z.infer<typeof status>;

export const PHONE_MAX_LENGTH = 50;

export const createContactsInput = z.object({
  name: z.string().max(NAME_MAX_LENGTH).min(1).trim(),
  email: z.string().max(EMAIL_MAX_LENGTH).optional(),
  company: z.string().max(COMPANY_MAX_LENGTH).optional(),
  status: status.optional(),
  phone: z.string().max(PHONE_MAX_LENGTH).optional(),
});

export const updateContactsInput = z.object({
  name: z.string().max(NAME_MAX_LENGTH).optional(),
  email: z.string().max(EMAIL_MAX_LENGTH).optional(),
  company: z.string().max(COMPANY_MAX_LENGTH).optional(),
  phone: z.string().max(PHONE_MAX_LENGTH).optional(),
});
// @generated-end schema

// @custom-start validators
// @custom-end validators
