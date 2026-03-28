// Test Matrix: time-parser
// | # | Function       | State                  | What to verify                    |
// |---|----------------|------------------------|-----------------------------------|
// | 1 | parseTimeInput | '30m'                  | returns 30                        |
// | 2 | parseTimeInput | '1h30m'                | returns 90                        |
// | 3 | parseTimeInput | '1h 30m' (space)       | returns 90                        |
// | 4 | parseTimeInput | '1.5h' (decimal)       | returns 90                        |
// | 5 | parseTimeInput | '2h' (whole hours)     | returns 120                       |
// | 6 | parseTimeInput | '90' (bare number)     | returns 90                        |
// | 7 | parseTimeInput | empty/whitespace       | returns undefined                 |
// | 8 | parseTimeInput | non-numeric            | returns undefined                 |
// | 9 | parseTimeInput | zero/negative          | returns undefined                 |
// |10 | parseTimeInput | uppercase              | case-insensitive                  |
// |11 | formatMinutes  | minutes only           | '45m'                             |
// |12 | formatMinutes  | exact hours            | '2h'                              |
// |13 | formatMinutes  | hours + minutes        | '1h 30m'                          |
// |14 | formatMinutes  | zero                   | '0m'                              |

import { describe, expect, test } from "vitest";
import { parseTimeInput, formatMinutes } from "./time-parser";

describe("parseTimeInput", () => {
  test("parses minutes: '30m' -> 30", () => {
    expect(parseTimeInput("30m")).toBe(30);
  });

  test("parses hours+minutes: '1h30m' -> 90", () => {
    expect(parseTimeInput("1h30m")).toBe(90);
  });

  test("parses hours+minutes with space: '1h 30m' -> 90", () => {
    expect(parseTimeInput("1h 30m")).toBe(90);
  });

  test("parses decimal hours: '1.5h' -> 90", () => {
    expect(parseTimeInput("1.5h")).toBe(90);
  });

  test("parses whole hours: '2h' -> 120", () => {
    expect(parseTimeInput("2h")).toBe(120);
  });

  test("parses bare number as minutes: '90' -> 90", () => {
    expect(parseTimeInput("90")).toBe(90);
  });

  test("returns undefined for empty string", () => {
    expect(parseTimeInput("")).toBeUndefined();
  });

  test("returns undefined for whitespace", () => {
    expect(parseTimeInput("   ")).toBeUndefined();
  });

  test("returns undefined for non-numeric", () => {
    expect(parseTimeInput("abc")).toBeUndefined();
  });

  test("returns undefined for zero", () => {
    expect(parseTimeInput("0")).toBeUndefined();
  });

  test("returns undefined for negative", () => {
    expect(parseTimeInput("-5")).toBeUndefined();
  });

  test("handles uppercase: '1H30M' -> 90", () => {
    expect(parseTimeInput("1H30M")).toBe(90);
  });

  test("trims whitespace: ' 30m ' -> 30", () => {
    expect(parseTimeInput(" 30m ")).toBe(30);
  });
});

describe("formatMinutes", () => {
  test("formats minutes only: 45 -> '45m'", () => {
    expect(formatMinutes(45)).toBe("45m");
  });

  test("formats hours only: 120 -> '2h'", () => {
    expect(formatMinutes(120)).toBe("2h");
  });

  test("formats hours and minutes: 90 -> '1h 30m'", () => {
    expect(formatMinutes(90)).toBe("1h 30m");
  });

  test("formats zero: 0 -> '0m'", () => {
    expect(formatMinutes(0)).toBe("0m");
  });
});
