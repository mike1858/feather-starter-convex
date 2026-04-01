// Test Matrix: devErrors queries
// | # | Query   | State               | What to verify                                  |
// |---|---------|---------------------|-------------------------------------------------|
// | 1 | list    | no errors           | returns empty array                             |
// | 2 | list    | multiple errors     | returns errors sorted by timestamp desc         |
// | 3 | summary | no errors           | returns { total: 0, bySource: {}, undigested: 0 } |
// | 4 | summary | mixed sources+state | returns correct counts per source and undigested |

import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

describe("devErrors queries", () => {
  test("returns empty array when no errors exist", async ({ testClient }) => {
    const result = await testClient.query(api.devErrors.queries.list, {});
    expect(result).toEqual([]);
  });

  test("returns errors sorted by timestamp descending", async ({
    testClient,
  }) => {
    // Insert errors in ascending order
    await testClient.mutation(api.devErrors.mutations.store, {
      source: "frontend",
      message: "Oldest",
      timestamp: 1000,
    });
    await testClient.mutation(api.devErrors.mutations.store, {
      source: "backend",
      message: "Middle",
      timestamp: 2000,
    });
    await testClient.mutation(api.devErrors.mutations.store, {
      source: "silent",
      message: "Newest",
      timestamp: 3000,
    });

    const result = await testClient.query(api.devErrors.queries.list, {});
    expect(result).toHaveLength(3);
    expect(result[0].message).toBe("Newest");
    expect(result[1].message).toBe("Middle");
    expect(result[2].message).toBe("Oldest");
  });

  test("summary returns zeros when no errors exist", async ({
    testClient,
  }) => {
    const result = await testClient.query(api.devErrors.queries.summary, {});
    expect(result).toEqual({ total: 0, bySource: {}, undigested: 0 });
  });

  test("summary returns correct counts per source and undigested", async ({
    testClient,
  }) => {
    // Insert errors from different sources
    await testClient.mutation(api.devErrors.mutations.store, {
      source: "frontend",
      message: "FE Error 1",
      timestamp: 1000,
    });
    await testClient.mutation(api.devErrors.mutations.store, {
      source: "frontend",
      message: "FE Error 2",
      timestamp: 2000,
    });
    await testClient.mutation(api.devErrors.mutations.store, {
      source: "backend",
      message: "BE Error",
      timestamp: 3000,
    });
    await testClient.mutation(api.devErrors.mutations.store, {
      source: "silent",
      message: "Silent Error",
      timestamp: 4000,
    });

    // Get the first frontend error ID to mark as digested
    const allErrors = await testClient.run(async (ctx: any) => {
      return ctx.db.query("devErrors").collect();
    });
    const firstFEError = allErrors.find(
      (e: any) => e.message === "FE Error 1",
    );

    // Mark one as digested
    await testClient.mutation(api.devErrors.mutations.markDigested, {
      ids: [firstFEError._id],
    });

    const result = await testClient.query(api.devErrors.queries.summary, {});
    expect(result.total).toBe(4);
    expect(result.bySource).toEqual({
      frontend: 2,
      backend: 1,
      silent: 1,
    });
    expect(result.undigested).toBe(3);
  });
});
