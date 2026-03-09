import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test, seedPlans } from "../test.setup";

describe("getActivePlans", () => {
  test("returns free and pro plans when both exist", async ({
    client,
    testClient,
  }) => {
    await seedPlans(testClient);

    const result = await client.query(api.billing.queries.getActivePlans, {});
    expect(result).toBeDefined();
    expect(result!.free.key).toBe("free");
    expect(result!.pro.key).toBe("pro");
  });

  test("throws when plans are missing", async ({ client }) => {
    await expect(
      client.query(api.billing.queries.getActivePlans, {}),
    ).rejects.toThrow("Plan not found");
  });

  test("returns null when unauthenticated", async ({ testClient }) => {
    const result = await testClient.query(api.billing.queries.getActivePlans, {});
    expect(result).toBeNull();
  });
});
