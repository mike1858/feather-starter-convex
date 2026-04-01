// Test Matrix: devErrors mutations
// | # | Mutation      | State                   | What to verify                                    |
// |---|--------------|-------------------------|---------------------------------------------------|
// | 1 | store        | with all fields         | all 8 fields persisted correctly                  |
// | 2 | store        | required fields only    | optional fields are undefined                     |
// | 3 | clearAll     | with existing errors    | all errors deleted                                |
// | 4 | markDigested | with multiple error IDs | digested=true set on specified errors              |

import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

describe("devErrors mutations", () => {
  test("stores error record with all fields", async ({ testClient }) => {
    await testClient.mutation(api.devErrors.mutations.store, {
      source: "frontend",
      message: "Cannot read property 'x' of null",
      stack: "Error: Cannot read property...\n  at Component (app.tsx:42)",
      route: "/dashboard/tasks",
      functionName: "TaskList.render",
      args: '{"taskId":"123"}',
      browserInfo: '{"userAgent":"Mozilla/5.0"}',
      timestamp: 1000,
    });

    const errors = await testClient.run(async (ctx: any) => {
      return ctx.db.query("devErrors").collect();
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].source).toBe("frontend");
    expect(errors[0].message).toBe("Cannot read property 'x' of null");
    expect(errors[0].stack).toContain("at Component");
    expect(errors[0].route).toBe("/dashboard/tasks");
    expect(errors[0].functionName).toBe("TaskList.render");
    expect(errors[0].args).toBe('{"taskId":"123"}');
    expect(errors[0].browserInfo).toBe('{"userAgent":"Mozilla/5.0"}');
    expect(errors[0].timestamp).toBe(1000);
  });

  test("stores error with only required fields", async ({ testClient }) => {
    await testClient.mutation(api.devErrors.mutations.store, {
      source: "backend",
      message: "Server error",
      timestamp: 2000,
    });

    const errors = await testClient.run(async (ctx: any) => {
      return ctx.db.query("devErrors").collect();
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].source).toBe("backend");
    expect(errors[0].message).toBe("Server error");
    expect(errors[0].timestamp).toBe(2000);
    expect(errors[0].stack).toBeUndefined();
    expect(errors[0].route).toBeUndefined();
    expect(errors[0].functionName).toBeUndefined();
    expect(errors[0].args).toBeUndefined();
    expect(errors[0].browserInfo).toBeUndefined();
  });

  test("clears all error records", async ({ testClient }) => {
    // Insert two errors
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

    // Verify they exist
    let errors = await testClient.run(async (ctx: any) => {
      return ctx.db.query("devErrors").collect();
    });
    expect(errors).toHaveLength(2);

    // Clear all
    await testClient.mutation(api.devErrors.mutations.clearAll, {});

    // Verify empty
    errors = await testClient.run(async (ctx: any) => {
      return ctx.db.query("devErrors").collect();
    });
    expect(errors).toHaveLength(0);
  });

  test("marks specified errors as digested", async ({ testClient }) => {
    // Insert three errors
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

    // Get IDs of first two errors
    const allErrors = await testClient.run(async (ctx: any) => {
      return ctx.db.query("devErrors").collect();
    });
    const idsToDigest = allErrors
      .filter((e: any) => e.message !== "Error 3")
      .map((e: any) => e._id);

    // Mark first two as digested
    await testClient.mutation(api.devErrors.mutations.markDigested, {
      ids: idsToDigest,
    });

    // Verify digested state
    const errors = await testClient.run(async (ctx: any) => {
      return ctx.db.query("devErrors").collect();
    });
    const digested = errors.filter((e: any) => e.digested === true);
    const undigested = errors.filter((e: any) => !e.digested);
    expect(digested).toHaveLength(2);
    expect(undigested).toHaveLength(1);
    expect(undigested[0].message).toBe("Error 3");
  });
});
