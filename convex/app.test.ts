import { describe, expect } from "vitest";
import { api } from "./_generated/api";
import { test, seedPlans, seedSubscription } from "./test.setup";

/**
 * Some mutations schedule Stripe actions (PREAUTH_createStripeCustomer,
 * cancelCurrentUserSubscriptions) which fail in the test environment because
 * Stripe isn't configured. convex-test runs scheduled functions automatically,
 * and when they fail, "Write outside of transaction" errors fire as unhandled
 * rejections. We suppress these at the process level.
 */
function suppressHandler(reason: unknown) {
  const msg = reason instanceof Error ? reason.message : String(reason);
  if (msg.includes("Write outside of transaction")) return;
  // Re-throw anything unexpected
  throw reason;
}

process.on("unhandledRejection", suppressHandler);

describe("getCurrentUser", () => {
  test("returns null when unauthenticated", async ({ testClient }) => {
    const result = await testClient.query(api.app.getCurrentUser, {});
    expect(result).toBeNull();
  });

  test("returns user without subscription", async ({ client, userId }) => {
    const result = await client.query(api.app.getCurrentUser, {});
    expect(result).toBeDefined();
    expect(result!._id).toBe(userId);
    expect(result!.subscription).toBeUndefined();
    expect(result!.avatarUrl).toBeUndefined();
  });

  test("returns user with subscription and planKey", async ({
    client,
    testClient,
    userId,
  }) => {
    const { freePlanId } = await seedPlans(testClient);
    await seedSubscription(testClient, { userId, planId: freePlanId });

    const result = await client.query(api.app.getCurrentUser, {});
    expect(result).toBeDefined();
    expect(result!.subscription).toBeDefined();
    expect(result!.subscription!.planKey).toBe("free");
  });

  test("returns avatarUrl from image field when no imageId", async ({
    client,
    testClient,
    userId,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.patch(userId, { image: "https://example.com/avatar.png" });
    });

    const result = await client.query(api.app.getCurrentUser, {});
    expect(result!.avatarUrl).toBe("https://example.com/avatar.png");
  });

  test("returns avatarUrl from storage when imageId is set", async ({
    client,
    testClient,
    userId,
  }) => {
    // Upload a file to storage to get a valid storage ID
    const imageId = await testClient.run(async (ctx: any) => {
      const blob = new Blob(["test"], { type: "image/png" });
      return ctx.storage.store(blob);
    });
    await testClient.run(async (ctx: any) => {
      await ctx.db.patch(userId, { imageId });
    });

    const result = await client.query(api.app.getCurrentUser, {});
    expect(result!.avatarUrl).toBeDefined();
    expect(typeof result!.avatarUrl).toBe("string");
  });

  test("returns undefined avatarUrl when neither imageId nor image is set", async ({
    client,
  }) => {
    const result = await client.query(api.app.getCurrentUser, {});
    expect(result!.avatarUrl).toBeUndefined();
  });
});

describe("updateUsername", () => {
  test("updates the username for authenticated user", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api.app.updateUsername, { username: "newname" });

    const user = await testClient.run(async (ctx: any) => ctx.db.get(userId));
    expect(user.username).toBe("newname");
  });

  test("does nothing when unauthenticated", async ({ testClient }) => {
    // Should not throw, just returns early
    await testClient.mutation(api.app.updateUsername, { username: "newname" });
  });
});

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
      await client.mutation(api.app.completeOnboarding, {
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

    await client.mutation(api.app.completeOnboarding, {
      username: "testuser",
      currency: "usd",
    });

    const user = await testClient.run(async (ctx: any) => ctx.db.get(userId));
    expect(user.username).toBe("testuser");
    expect(user.customerId).toBe("cus_existing");
  });

  test("does nothing when unauthenticated", async ({ testClient }) => {
    await testClient.mutation(api.app.completeOnboarding, {
      username: "testuser",
      currency: "usd",
    });
  });
});

describe("generateUploadUrl", () => {
  test("returns an upload URL for authenticated user", async ({ client }) => {
    const url = await client.mutation(api.app.generateUploadUrl, {});
    expect(typeof url).toBe("string");
  });

  test("throws when unauthenticated", async ({ testClient }) => {
    await expect(
      testClient.mutation(api.app.generateUploadUrl, {}),
    ).rejects.toThrow("User not found");
  });
});

describe("updateUserImage", () => {
  test("sets imageId for authenticated user", async ({
    client,
    userId,
    testClient,
  }) => {
    const imageId = await testClient.run(async (ctx: any) => {
      const blob = new Blob(["test"], { type: "image/png" });
      return ctx.storage.store(blob);
    });

    await client.mutation(api.app.updateUserImage, { imageId });

    const user = await testClient.run(async (ctx: any) => ctx.db.get(userId));
    expect(user.imageId).toBe(imageId);
  });

  test("does nothing when unauthenticated", async ({ testClient }) => {
    const imageId = await testClient.run(async (ctx: any) => {
      const blob = new Blob(["test"], { type: "image/png" });
      return ctx.storage.store(blob);
    });

    await testClient.mutation(api.app.updateUserImage, { imageId });
  });
});

describe("removeUserImage", () => {
  test("clears imageId and image fields", async ({
    client,
    userId,
    testClient,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.patch(userId, {
        imageId: undefined,
        image: "https://example.com/avatar.png",
      });
    });

    await client.mutation(api.app.removeUserImage, {});

    const user = await testClient.run(async (ctx: any) => ctx.db.get(userId));
    expect(user.imageId).toBeUndefined();
    expect(user.image).toBeUndefined();
  });

  test("does nothing when unauthenticated", async ({ testClient }) => {
    await testClient.mutation(api.app.removeUserImage, {});
  });
});

describe("getActivePlans", () => {
  test("returns free and pro plans when both exist", async ({
    client,
    testClient,
  }) => {
    await seedPlans(testClient);

    const result = await client.query(api.app.getActivePlans, {});
    expect(result).toBeDefined();
    expect(result!.free.key).toBe("free");
    expect(result!.pro.key).toBe("pro");
  });

  test("throws when plans are missing", async ({ client }) => {
    await expect(
      client.query(api.app.getActivePlans, {}),
    ).rejects.toThrow("Plan not found");
  });

  test("returns null when unauthenticated", async ({ testClient }) => {
    const result = await testClient.query(api.app.getActivePlans, {});
    expect(result).toBeNull();
  });
});

describe("deleteCurrentUserAccount", () => {
  test("deletes user and subscription", async ({
    client,
    userId,
    testClient,
  }) => {
    const { freePlanId } = await seedPlans(testClient);
    await seedSubscription(testClient, { userId, planId: freePlanId });

    // The mutation schedules cancelCurrentUserSubscriptions (calls Stripe).
    // Catch the expected failure from the scheduled action.
    try {
      await client.mutation(api.app.deleteCurrentUserAccount, {});
      await testClient.finishInProgressScheduledFunctions();
    } catch {
      // Expected: the scheduled Stripe cancellation action fails
    }

    const user = await testClient.run(async (ctx: any) => ctx.db.get(userId));
    expect(user).toBeNull();

    const subs = await testClient.run(async (ctx: any) =>
      ctx.db.query("subscriptions").collect(),
    );
    expect(subs).toHaveLength(0);
  });

  test("handles missing subscription gracefully", async ({
    client,
    userId,
    testClient,
  }) => {
    // No subscription seeded — should still delete user
    await client.mutation(api.app.deleteCurrentUserAccount, {});

    const user = await testClient.run(async (ctx: any) => ctx.db.get(userId));
    expect(user).toBeNull();
  });

  test("deletes associated auth accounts", async ({
    client,
    userId,
    testClient,
  }) => {
    // Seed auth accounts for the user
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("authAccounts", {
        userId,
        provider: "resend-otp",
        providerAccountId: "test@example.com",
      });
      await ctx.db.insert("authAccounts", {
        userId,
        provider: "github",
        providerAccountId: "github-123",
      });
    });

    await client.mutation(api.app.deleteCurrentUserAccount, {});

    const accounts = await testClient.run(async (ctx: any) =>
      ctx.db.query("authAccounts").collect(),
    );
    expect(accounts).toHaveLength(0);
  });

  test("does nothing when unauthenticated", async ({ testClient }) => {
    await testClient.mutation(api.app.deleteCurrentUserAccount, {});
  });
});
