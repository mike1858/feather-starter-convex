// Test Matrix: misc utilities
// | # | Function | State                       | What to verify                          |
// |---|----------|-----------------------------|-----------------------------------------|
// | 1 | cn       | multiple class names        | merges into single string               |
// | 2 | cn       | conditional classes         | false values excluded                   |
// | 3 | cn       | conflicting tailwind        | later class wins (tailwind-merge)       |
// | 4 | cn       | empty/undefined inputs      | returns empty or filtered string        |
// | 5 | callAll  | multiple functions          | all called with same args               |
// | 6 | callAll  | undefined entries           | skipped without throwing                |
// | 7 | callAll  | zero functions              | returns callable no-op                  |

import { describe, expect, it, vi } from "vitest";
import { cn, callAll } from "./misc";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("excludes falsy conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("deduplicates conflicting tailwind classes", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
  });

  it("handles empty and undefined inputs", () => {
    expect(cn()).toBe("");
    expect(cn(undefined, null, "a")).toBe("a");
  });
});

describe("callAll", () => {
  it("calls all provided functions with same args", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const combined = callAll(fn1, fn2);
    combined("arg1", "arg2");
    expect(fn1).toHaveBeenCalledWith("arg1", "arg2");
    expect(fn2).toHaveBeenCalledWith("arg1", "arg2");
  });

  it("skips undefined entries without throwing", () => {
    const fn1 = vi.fn();
    const combined = callAll(fn1, undefined, fn1);
    combined();
    expect(fn1).toHaveBeenCalledTimes(2);
  });

  it("returns callable no-op with zero functions", () => {
    const combined = callAll();
    expect(() => combined()).not.toThrow();
  });
});
