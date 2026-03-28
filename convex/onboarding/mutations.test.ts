// Test Matrix: onboarding mutations
// | # | Mutation           | State              | What to verify                       |
// |---|--------------------|--------------------|--------------------------------------|
// | 1 | completeOnboarding | authenticated      | username set on user doc             |
// | 2 | completeOnboarding | unauthenticated    | silently returns                     |
// | 3 | completeOnboarding | user doc missing   | silently returns (no throw)          |

import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

describe("completeOnboarding", () => {
  test("sets username", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api.onboarding.mutations.completeOnboarding, {
      username: "testuser",
    });

    const user = await testClient.run(async (ctx: any) => ctx.db.get(userId));
    expect(user.username).toBe("testuser");
  });

  test("does nothing when unauthenticated", async ({ testClient }) => {
    await testClient.mutation(api.onboarding.mutations.completeOnboarding, {
      username: "testuser",
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
    });
  });
});
