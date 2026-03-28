import { AUTH_EMAIL, AUTH_RESEND_KEY } from "@cvx/env";
import { APP_NAME } from "@cvx/config";
import { ERRORS } from "~/errors";
import { z } from "zod";

const ResendSuccessSchema = z.object({
  id: z.string(),
});
const ResendErrorSchema = z.union([
  z.object({
    name: z.string(),
    message: z.string(),
    statusCode: z.number(),
  }),
  z.object({
    name: z.literal("UnknownError"),
    message: z.literal("Unknown Error"),
    statusCode: z.literal(500),
    cause: z.any(),
  }),
]);

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(options: SendEmailOptions) {
  if (!AUTH_RESEND_KEY) {
    throw new Error(`Resend - ${ERRORS.common.ENVS_NOT_INITIALIZED}`);
  }

  const from = AUTH_EMAIL ?? `${APP_NAME} <onboarding@resend.dev>`;
  const email = { from, ...options };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AUTH_RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(email),
  });

  const data = await response.json();
  const parsedData = ResendSuccessSchema.safeParse(data);

  if (response.ok && parsedData.success) {
    return { status: "success", data: parsedData } as const;
  } else {
    const parsedErrorResult = ResendErrorSchema.safeParse(data);
    if (parsedErrorResult.success) {
      console.error(parsedErrorResult.data);
      throw new Error(ERRORS.auth.EMAIL_NOT_SENT);
    } else {
      console.error(data);
      throw new Error(ERRORS.auth.EMAIL_NOT_SENT);
    }
  }
}
