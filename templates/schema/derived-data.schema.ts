import { z } from "zod";

export const derivedDataItemSchema = z.object({
  type: z.enum([
    "count",
    "sum",
    "average",
    "min",
    "max",
    "template",
    "condition",
    "lookup",
    "custom",
  ]),
  source: z.string().optional(),
  field: z.string().optional(),
  template: z.string().optional(),
  condition: z
    .object({
      if: z.string(),
      then: z.unknown(),
      else: z.unknown(),
    })
    .optional(),
  customFunction: z.string().optional(),
});

export type DerivedDataItem = z.infer<typeof derivedDataItemSchema>;
