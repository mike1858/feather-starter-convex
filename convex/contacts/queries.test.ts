// @generated-start imports
import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";
// @generated-end imports

// @custom-start imports
// @custom-end imports

// @generated-start test-list
describe("list", () => {
  test("returns Contacts for authenticated user", async ({
    client,
  }) => {
    // Create 2 records via the create mutation
    await client.mutation(api.contacts.mutations.create, {
      name: "Contact 1",
    });
    await client.mutation(api.contacts.mutations.create, {
      name: "Contact 2",
    });

    const records = await client.query(api.contacts.queries.list, {});
    expect(records).toHaveLength(2);
  });

  test("returns empty array when no Contacts", async ({
    client,
  }) => {
    const records = await client.query(api.contacts.queries.list, {});
    expect(records).toHaveLength(0);
  });

  test("returns empty when unauthenticated", async ({ testClient }) => {
    const records = await testClient.query(api.contacts.queries.list, {});
    expect(records).toEqual([]);
  });

});
// @generated-end test-list

// @generated-start test-get
describe("get", () => {
  test("returns a single Contact", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.contacts.mutations.create, {
      name: "Get test",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("contacts").collect(),
    );

    const record = await client.query(api.contacts.queries.get, {
      id: records[0]._id,
    });
    expect(record).not.toBeNull();
    expect(record!.name).toBe("Get test");
  });

  test("returns null when unauthenticated", async ({ testClient }) => {
    const recordId = await testClient.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", { name: "Seed" });
      return ctx.db.insert("contacts", {
        name: "Seed",
        email: "Seed",
        company: "Seed",
        status: "lead",
        phone: "Seed",
        userId,
      });
    });

    const record = await testClient.query(api.contacts.queries.get, {
      id: recordId,
    });
    expect(record).toBeNull();
  });
});
// @generated-end test-get

