import { z } from "zod";

export const identitySchema = z
  .object({
    type: z
      .enum(["auto-increment", "uuid", "expression"])
      .default("auto-increment"),
    format: z.string().optional(),
    prefix: z.string().optional(),
  })
  .superRefine((identity, ctx) => {
    if (identity.type === "expression" && !identity.format) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Expression-based identity requires a 'format' string (e.g., \"TASK-{YYYY}-{###}\")",
        path: ["format"],
      });
    }
  })
  .default({ type: "auto-increment" });

export type Identity = z.infer<typeof identitySchema>;
