// Test Matrix: navItems
// | # | State                 | What to verify                                  |
// |---|----------------------|--------------------------------------------------|
// | 1 | array structure      | non-empty array                                  |
// | 2 | required fields      | each item has label, i18nKey, to as strings      |
// | 3 | unique paths         | no duplicate 'to' values                         |
// | 4 | path format          | all 'to' values start with /                     |
// | 5 | dev mode             | includes Dev Mailbox                             |

import { describe, it, expect } from "vitest";
import { navItems } from "./nav";

describe("navItems", () => {
  it("contains at least one item", () => {
    expect(Array.isArray(navItems)).toBe(true);
    expect(navItems.length).toBeGreaterThan(0);
  });

  it("each item has label, i18nKey, and to as non-empty strings", () => {
    for (const item of navItems) {
      expect(typeof item.label).toBe("string");
      expect(item.label.length).toBeGreaterThan(0);
      expect(typeof item.i18nKey).toBe("string");
      expect(item.i18nKey.length).toBeGreaterThan(0);
      expect(typeof item.to).toBe("string");
      expect(item.to.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate to paths", () => {
    const paths = navItems.map((item) => item.to);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(paths.length);
  });

  it("all to values start with /", () => {
    for (const item of navItems) {
      expect(item.to.startsWith("/")).toBe(true);
    }
  });

  it("includes Dev Mailbox in dev mode", () => {
    const devMailbox = navItems.find((item) => item.label === "Dev Mailbox");
    expect(devMailbox).toBeTruthy();
    expect(devMailbox!.to).toBe("/dev/mailbox");
  });
});
