import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test, seedPlans, seedSubscription } from "../test.setup";

// Unhandled rejections from scheduled Stripe actions are suppressed
// globally in src/test-setup.ts — no per-file handler needed.

describe("getCurrentUser", () => {
  test("returns null when unauthenticated", async ({ testClient }) => {
    const result = await testClient.query(api.users.queries.getCurrentUser, {});
    expect(result).toBeNull();
  });

  test("returns user without subscription", async ({ client, userId }) => {
    const result = await client.query(api.users.queries.getCurrentUser, {});
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

    const result = await client.query(api.users.queries.getCurrentUser, {});
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

    const result = await client.query(api.users.queries.getCurrentUser, {});
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

    const result = await client.query(api.users.queries.getCurrentUser, {});
    expect(result!.avatarUrl).toBeDefined();
    expect(typeof result!.avatarUrl).toBe("string");
  });

  test("returns undefined avatarUrl when neither imageId nor image is set", async ({
    client,
  }) => {
    const result = await client.query(api.users.queries.getCurrentUser, {});
    expect(result!.avatarUrl).toBeUndefined();
  });

  test("returns null when user doc is deleted but auth session exists", async ({
    client,
    userId,
    testClient,
  }) => {
    // Delete the user doc so db.get(userId) returns null
    await testClient.run(async (ctx: any) => {
      await ctx.db.delete(userId);
    });

    const result = await client.query(api.users.queries.getCurrentUser, {});
    // convex-test serializes `undefined` as `null`
    expect(result).toBeNull();
  });
});
