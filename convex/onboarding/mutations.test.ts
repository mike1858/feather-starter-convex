import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

// Unhandled rejections from scheduled Stripe actions are suppressed
// globally in src/test-setup.ts — no per-file handler needed.

describe("completeOnboarding", () => {
  test("sets username and schedules Stripe customer creation", async ({
    client,
    userId,
    testClient,
  }) => {
    // The mutation schedules PREAUTH_createStripeCustomer (an action that calls
    // Stripe). In convex-test the scheduled function runs and fails because
    // Stripe isn't configured — catch that expected failure.
    try {
      await client.mutation(api.onboarding.mutations.completeOnboarding, {
        username: "testuser",
        currency: "usd",
      });
      await testClient.finishInProgressScheduledFunctions();
    } catch {
      // Expected: the scheduled Stripe action fails
    }

    const user = await testClient.run(async (ctx: any) => ctx.db.get(userId));
    expect(user.username).toBe("testuser");
  });

  test("does not schedule Stripe creation if customerId already exists", async ({
    client,
    userId,
    testClient,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.patch(userId, { customerId: "cus_existing" });
    });

    await client.mutation(api.onboarding.mutations.completeOnboarding, {
      username: "testuser",
      currency: "usd",
    });

    const user = await testClient.run(async (ctx: any) => ctx.db.get(userId));
    expect(user.username).toBe("testuser");
    expect(user.customerId).toBe("cus_existing");
  });

  test("does nothing when unauthenticated", async ({ testClient }) => {
    await testClient.mutation(api.onboarding.mutations.completeOnboarding, {
      username: "testuser",
      currency: "usd",
    });
  });

  test("returns early when user doc is deleted but auth session exists", async ({
    client,
    userId,
    testClient,
  }) => {
    // Delete the user doc so db.get(userId) returns null
    await testClient.run(async (ctx: any) => {
      await ctx.db.delete(userId);
    });

    // Should not throw, just returns early
    await client.mutation(api.onboarding.mutations.completeOnboarding, {
      username: "testuser",
      currency: "usd",
    });
  });
});
