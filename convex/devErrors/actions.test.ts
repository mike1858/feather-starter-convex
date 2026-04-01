// Test Matrix: devErrors actions & digest pipeline
// | # | Unit                  | State                         | What to verify                                          |
// |---|-----------------------|-------------------------------|---------------------------------------------------------|
// | 1 | buildTopErrors        | mixed errors                  | groups by message, sorts by frequency, respects limit   |
// | 2 | buildTopErrors        | single error                  | returns single entry with count 1                       |
// | 3 | buildTopErrors        | empty array                   | returns empty array                                     |
// | 4 | buildTopErrors        | more groups than limit        | truncates to limit                                      |
// | 5 | listUndigested        | no errors                     | returns empty array                                     |
// | 6 | listUndigested        | mixed digested/undigested     | returns only undigested errors                          |
// | 7 | markDigestedInternal  | with valid IDs                | marks errors as digested                                |
// | 8 | storeDigest           | valid digest data             | persists to errorDigests table                          |

import { describe, expect } from "vitest";
import { api, internal } from "../_generated/api";
import { test } from "../test.setup";
import { buildTopErrors } from "./actions";

describe("buildTopErrors", () => {
  test("groups by message, sorts by frequency, and includes metadata", ({}) => {
    const errors = [
      { message: "Error A", stack: "stack-a", functionName: "fn1" },
      { message: "Error B", stack: "stack-b" },
      { message: "Error A", stack: "stack-a", functionName: "fn1" },
      { message: "Error A", stack: "stack-a", functionName: "fn1" },
      { message: "Error B", stack: "stack-b" },
      { message: "Error C" },
    ];

    const result = buildTopErrors(errors, 10);

    expect(result).toHaveLength(3);
    // Sorted by frequency descending
    expect(result[0].message).toBe("Error A");
    expect(result[0].count).toBe(3);
    expect(result[0].stack).toBe("stack-a");
    expect(result[0].functionName).toBe("fn1");
    expect(result[1].message).toBe("Error B");
    expect(result[1].count).toBe(2);
    expect(result[2].message).toBe("Error C");
    expect(result[2].count).toBe(1);
  });

  test("returns single entry with count 1 for one error", ({}) => {
    const errors = [{ message: "Solo error", stack: "solo-stack" }];
    const result = buildTopErrors(errors, 10);

    expect(result).toHaveLength(1);
    expect(result[0].message).toBe("Solo error");
    expect(result[0].count).toBe(1);
  });

  test("returns empty array for no errors", ({}) => {
    const result = buildTopErrors([], 10);
    expect(result).toEqual([]);
  });

  test("truncates to limit when more groups exist", ({}) => {
    const errors = [
      { message: "A" },
      { message: "B" },
      { message: "C" },
      { message: "D" },
      { message: "E" },
    ];
    const result = buildTopErrors(errors, 3);

    expect(result).toHaveLength(3);
  });
});

describe("listUndigested query", () => {
  test("returns empty array when no errors exist", async ({ testClient }) => {
    const result = await testClient.query(
      internal.devErrors.queries.listUndigested,
      {},
    );
    expect(result).toEqual([]);
  });

  test("returns only undigested errors", async ({ testClient }) => {
    // Insert 3 errors
    await testClient.mutation(api.devErrors.mutations.store, {
      source: "frontend",
      message: "Error 1",
      timestamp: 1000,
    });
    await testClient.mutation(api.devErrors.mutations.store, {
      source: "backend",
      message: "Error 2",
      timestamp: 2000,
    });
    await testClient.mutation(api.devErrors.mutations.store, {
      source: "silent",
      message: "Error 3",
      timestamp: 3000,
    });

    // Mark first error as digested
    const allErrors = await testClient.run(async (ctx: any) => {
      return ctx.db.query("devErrors").collect();
    });
    const firstId = allErrors.find(
      (e: any) => e.message === "Error 1",
    )!._id;
    await testClient.mutation(api.devErrors.mutations.markDigested, {
      ids: [firstId],
    });

    // listUndigested should return only the 2 undigested errors
    const undigested = await testClient.query(
      internal.devErrors.queries.listUndigested,
      {},
    );
    expect(undigested).toHaveLength(2);
    const messages = undigested.map((e: any) => e.message).sort();
    expect(messages).toEqual(["Error 2", "Error 3"]);
  });
});

describe("markDigestedInternal mutation", () => {
  test("marks specified errors as digested", async ({ testClient }) => {
    // Insert errors
    await testClient.mutation(api.devErrors.mutations.store, {
      source: "frontend",
      message: "Error A",
      timestamp: 1000,
    });
    await testClient.mutation(api.devErrors.mutations.store, {
      source: "backend",
      message: "Error B",
      timestamp: 2000,
    });

    const allErrors = await testClient.run(async (ctx: any) => {
      return ctx.db.query("devErrors").collect();
    });
    const ids = allErrors.map((e: any) => e._id);

    // Use internal markDigestedInternal
    await testClient.mutation(
      internal.devErrors.mutations.markDigestedInternal,
      { ids },
    );

    // Verify all are digested
    const errors = await testClient.run(async (ctx: any) => {
      return ctx.db.query("devErrors").collect();
    });
    expect(errors.every((e: any) => e.digested === true)).toBe(true);
  });
});

describe("storeDigest mutation", () => {
  test("persists digest data to errorDigests table", async ({
    testClient,
  }) => {
    const digestPayload = JSON.stringify({
      errorCount: 5,
      topErrors: [{ message: "Test", count: 5 }],
    });

    await testClient.mutation(internal.devErrors.mutations.storeDigest, {
      digest: digestPayload,
      receivedAt: 1000,
    });

    const digests = await testClient.run(async (ctx: any) => {
      return ctx.db.query("errorDigests").collect();
    });
    expect(digests).toHaveLength(1);
    expect(digests[0].digest).toBe(digestPayload);
    expect(digests[0].receivedAt).toBe(1000);
  });
});
