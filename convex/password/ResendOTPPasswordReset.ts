import { Email } from "@convex-dev/auth/providers/Email";
import { generateRandomString, type RandomReader } from "@oslojs/crypto/random";
import { Resend as ResendAPI } from "resend";
import { PasswordResetEmail } from "./PasswordResetEmail";
import { AUTH_EMAIL, AUTH_RESEND_KEY } from "@cvx/env";
import { APP_NAME } from "@cvx/config";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@cvx/_generated/api";

const alphabet = "0123456789";

const random: RandomReader = {
  read(bytes: Uint8Array): void {
    crypto.getRandomValues(bytes);
  },
};

async function storeDevEmail(to: string[], subject: string, html: string) {
  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) return;
  const client = new ConvexHttpClient(convexUrl);
  await client.mutation(api.devEmails.mutations.store, {
    to,
    subject,
    html,
    sentAt: Date.now(),
  });
}

export const ResendOTPPasswordReset = Email({
  id: "password-reset",
  apiKey: AUTH_RESEND_KEY,
  maxAge: 60 * 20,
  async generateVerificationToken() {
    return generateRandomString(random, alphabet, 8);
  },
  async sendVerificationRequest({
    identifier: email,
    provider,
    token,
    expires,
  }) {
    const subject = "Reset your password";
    const html = `<p>Your password reset code is: <strong>${token}</strong></p><p>Expires: ${expires.toISOString()}</p>`;

    // Store in dev mailbox when enabled
    if (process.env.DEV_MAILBOX !== "false") {
      await storeDevEmail([email], subject, html);
    }

    // Skip Resend when API key not configured (local dev)
    if (!provider.apiKey) {
      return;
    }

    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: AUTH_EMAIL ?? `${APP_NAME} <onboarding@resend.dev>`,
      to: [email],
      subject,
      react: PasswordResetEmail({ code: token, expires }),
    });

    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});
