// Test Matrix: username validator
// | # | State                  | What to verify                        |
// |---|------------------------|---------------------------------------|
// | 1 | valid alphanumeric     | parses and lowercases                 |
// | 2 | whitespace             | trims before validation               |
// | 3 | uppercase              | lowercases input                      |
// | 4 | too short (<3)         | throws validation error               |
// | 5 | too long (>20)         | throws validation error               |
// | 6 | non-alphanumeric chars | throws validation error               |
// | 7 | boundary lengths       | accepts 3 and 20 chars exactly        |

import { describe, expect, it } from "vitest";
import { username } from "./validators";

describe("username validator", () => {
  it("accepts valid alphanumeric and lowercases", () => {
    expect(username.parse("alice")).toBe("alice");
    expect(username.parse("Bob123")).toBe("bob123");
  });

  it("trims whitespace", () => {
    expect(username.parse("  alice  ")).toBe("alice");
  });

  it("lowercases input", () => {
    expect(username.parse("ALICE")).toBe("alice");
  });

  it("rejects usernames shorter than 3 characters", () => {
    expect(() => username.parse("ab")).toThrow();
  });

  it("rejects usernames longer than 20 characters", () => {
    expect(() => username.parse("a".repeat(21))).toThrow();
  });

  it("rejects non-alphanumeric characters", () => {
    expect(() => username.parse("alice!")).toThrow();
    expect(() => username.parse("alice bob")).toThrow();
    expect(() => username.parse("alice-bob")).toThrow();
    expect(() => username.parse("alice_bob")).toThrow();
  });

  it("accepts exactly 3 and 20 character usernames", () => {
    expect(username.parse("abc")).toBe("abc");
    expect(username.parse("a".repeat(20))).toBe("a".repeat(20));
  });
});
