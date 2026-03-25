import { Email } from "@convex-dev/auth/providers/Email";
import { alphabet, generateRandomString } from "oslo/crypto";
import { Resend as ResendAPI } from "resend";
import { VerificationCodeEmail } from "./VerificationCodeEmail";
import { AUTH_EMAIL, AUTH_RESEND_KEY } from "@cvx/env";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@cvx/_generated/api";

async function storeDevEmail(to: string[], subject: string, html: string) {
  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) return;
  const client = new ConvexHttpClient(convexUrl);
  // @ts-ignore TS2589: ConvexHttpClient + deep api type — error shifts between files
  await client.mutation(api.devEmails.mutations.store, {
    to,
    subject,
    html,
    sentAt: Date.now(),
  });
}

export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: AUTH_RESEND_KEY,
  maxAge: 60 * 20,
  async generateVerificationToken() {
    return generateRandomString(8, alphabet("0-9"));
  },
  async sendVerificationRequest({
    identifier: email,
    provider,
    token,
    expires,
  }) {
    const subject = "Sign in to Feather Starter";
    const html = `<p>Your verification code is: <strong>${token}</strong></p><p>Expires: ${expires.toISOString()}</p>`;

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
      from: AUTH_EMAIL ?? "Feather Starter <onboarding@resend.dev>",
      to: [email],
      subject,
      react: VerificationCodeEmail({ code: token, expires }),
    });

    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});
