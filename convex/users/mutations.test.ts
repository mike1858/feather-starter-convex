// Test Matrix: users mutations
// | # | Mutation                 | State                   | What to verify                      |
// |---|--------------------------|-------------------------|-------------------------------------|
// | 1 | updateUsername           | authenticated           | username field updated               |
// | 2 | updateUsername           | unauthenticated         | silently returns                     |
// | 3 | updateUserImage         | with valid imageId      | imageId set on user                 |
// | 4 | updateUserImage         | unauthenticated         | silently returns                     |
// | 5 | removeUserImage         | with image fields set   | imageId and image cleared           |
// | 6 | removeUserImage         | unauthenticated         | silently returns                     |
// | 7 | deleteCurrentUserAccount| authenticated           | user doc deleted                    |
// | 8 | deleteCurrentUserAccount| with auth accounts      | auth accounts cascade deleted       |
// | 9 | deleteCurrentUserAccount| user doc missing        | throws "User not found"             |
// |10 | deleteCurrentUserAccount| unauthenticated         | silently returns                     |

import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

describe("updateUsername", () => {
  test("updates the username for authenticated user", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api.users.mutations.updateUsername, { username: "newname" });

    const user = await testClient.run(async (ctx: any) => ctx.db.get(userId));
    expect(user.username).toBe("newname");
  });

  test("does nothing when unauthenticated", async ({ testClient }) => {
    // Should not throw, just returns early
    await testClient.mutation(api.users.mutations.updateUsername, { username: "newname" });
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

    await client.mutation(api.users.mutations.updateUserImage, { imageId });

    const user = await testClient.run(async (ctx: any) => ctx.db.get(userId));
    expect(user.imageId).toBe(imageId);
  });

  test("does nothing when unauthenticated", async ({ testClient }) => {
    const imageId = await testClient.run(async (ctx: any) => {
      const blob = new Blob(["test"], { type: "image/png" });
      return ctx.storage.store(blob);
    });

    await testClient.mutation(api.users.mutations.updateUserImage, { imageId });
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

    await client.mutation(api.users.mutations.removeUserImage, {});

    const user = await testClient.run(async (ctx: any) => ctx.db.get(userId));
    expect(user.imageId).toBeUndefined();
    expect(user.image).toBeUndefined();
  });

  test("does nothing when unauthenticated", async ({ testClient }) => {
    await testClient.mutation(api.users.mutations.removeUserImage, {});
  });
});

describe("deleteCurrentUserAccount", () => {
  test("deletes user", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api.users.mutations.deleteCurrentUserAccount, {});

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

    await client.mutation(api.users.mutations.deleteCurrentUserAccount, {});

    const accounts = await testClient.run(async (ctx: any) =>
      ctx.db.query("authAccounts").collect(),
    );
    expect(accounts).toHaveLength(0);
  });

  test("throws when user doc is deleted but auth session exists", async ({
    client,
    userId,
    testClient,
  }) => {
    // Delete the user doc so db.get(userId) returns null
    await testClient.run(async (ctx: any) => {
      await ctx.db.delete(userId);
    });

    await expect(
      client.mutation(api.users.mutations.deleteCurrentUserAccount, {}),
    ).rejects.toThrow("User not found");
  });

  test("does nothing when unauthenticated", async ({ testClient }) => {
    await testClient.mutation(api.users.mutations.deleteCurrentUserAccount, {});
  });
});
