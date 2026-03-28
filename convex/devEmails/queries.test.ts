// Test Matrix: devEmails queries
// | # | Query | State              | What to verify                          |
// |---|-------|--------------------|------------------------------------------|
// | 1 | list  | no emails          | returns empty array                      |
// | 2 | list  | multiple emails    | returns emails sorted by sentAt desc     |

import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

describe("devEmails queries", () => {
  test("returns empty array when no emails exist", async ({
    testClient,
  }) => {
    const result = await testClient.query(api.devEmails.queries.list, {});
    expect(result).toEqual([]);
  });

  test("returns emails sorted by sentAt descending", async ({
    testClient,
  }) => {
    // Insert emails in ascending order
    await testClient.mutation(api.devEmails.mutations.store, {
      to: ["a@b.com"],
      subject: "Oldest",
      html: "<p>1</p>",
      sentAt: 1000,
    });
    await testClient.mutation(api.devEmails.mutations.store, {
      to: ["c@d.com"],
      subject: "Middle",
      html: "<p>2</p>",
      sentAt: 2000,
    });
    await testClient.mutation(api.devEmails.mutations.store, {
      to: ["e@f.com"],
      subject: "Newest",
      html: "<p>3</p>",
      sentAt: 3000,
    });

    const result = await testClient.query(api.devEmails.queries.list, {});
    expect(result).toHaveLength(3);
    expect(result[0].subject).toBe("Newest");
    expect(result[1].subject).toBe("Middle");
    expect(result[2].subject).toBe("Oldest");
  });
});
