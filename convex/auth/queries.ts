import { query } from "../_generated/server";

export const availableProviders = query({
  args: {},
  handler: async () => {
    return {
      password: true, // Always available (no external credentials needed)
      otp: !!process.env.AUTH_RESEND_KEY,
      github: !!process.env.AUTH_GITHUB_ID,
    };
  },
});
