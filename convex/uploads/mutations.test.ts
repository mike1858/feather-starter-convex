import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

describe("generateUploadUrl", () => {
  test("returns an upload URL for authenticated user", async ({ client }) => {
    const url = await client.mutation(api.uploads.mutations.generateUploadUrl, {});
    expect(typeof url).toBe("string");
  });

  test("throws when unauthenticated", async ({ testClient }) => {
    await expect(
      testClient.mutation(api.uploads.mutations.generateUploadUrl, {}),
    ).rejects.toThrow("User not found");
  });
});
