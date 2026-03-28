// Test Matrix: users queries
// | # | Query          | State                   | What to verify                         |
// |---|----------------|-------------------------|----------------------------------------|
// | 1 | getCurrentUser | unauthenticated         | returns null                           |
// | 2 | getCurrentUser | no avatar               | returns user with undefined avatarUrl  |
// | 3 | getCurrentUser | image field set         | avatarUrl from image URL               |
// | 4 | getCurrentUser | imageId set             | avatarUrl from storage                 |
// | 5 | getCurrentUser | neither image/imageId   | avatarUrl is undefined                 |
// | 6 | getCurrentUser | user doc deleted        | returns null                           |

import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

describe("getCurrentUser", () => {
  test("returns null when unauthenticated", async ({ testClient }) => {
    const result = await testClient.query(api.users.queries.getCurrentUser, {});
    expect(result).toBeNull();
  });

  test("returns user with undefined avatarUrl when no avatar set", async ({ client, userId }) => {
    const result = await client.query(api.users.queries.getCurrentUser, {});
    expect(result!._id).toBe(userId);
    expect(result!.avatarUrl).toBeUndefined();
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
    const imageId = await testClient.run(async (ctx: any) => {
      const blob = new Blob(["test"], { type: "image/png" });
      return ctx.storage.store(blob);
    });
    await testClient.run(async (ctx: any) => {
      await ctx.db.patch(userId, { imageId });
    });

    const result = await client.query(api.users.queries.getCurrentUser, {});
    expect(typeof result!.avatarUrl).toBe("string");
    expect(result!.avatarUrl!.length).toBeGreaterThan(0);
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
