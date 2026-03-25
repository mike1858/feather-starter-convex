import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

describe("availableProviders", () => {
  test("returns provider availability", async ({ testClient }) => {
    const providers = await testClient.query(
      api.auth.queries.availableProviders,
      {},
    );
    expect(providers).toHaveProperty("password");
    expect(providers).toHaveProperty("otp");
    expect(providers).toHaveProperty("github");
    expect(providers.password).toBe(true);
    // otp and github depend on env vars -- in test env they are likely false
    expect(typeof providers.otp).toBe("boolean");
    expect(typeof providers.github).toBe("boolean");
  });
});
