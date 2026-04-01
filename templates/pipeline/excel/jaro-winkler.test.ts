import { describe, expect, it } from "vitest";
import {
  jaroSimilarity,
  jaroWinklerSimilarity,
  positionSimilarity,
  dataFingerprintSimilarity,
  computeColumnMatchScore,
} from "./jaro-winkler";

describe("jaroSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(jaroSimilarity("hello", "hello")).toBe(1);
  });

  it("returns 0 for empty strings", () => {
    expect(jaroSimilarity("", "hello")).toBe(0);
    expect(jaroSimilarity("hello", "")).toBe(0);
    expect(jaroSimilarity("", "")).toBe(1); // both empty = identical
  });

  it('returns correct score for "MARTHA"/"MARHTA" (~0.944)', () => {
    const score = jaroSimilarity("MARTHA", "MARHTA");
    expect(score).toBeCloseTo(0.944, 2);
  });

  it("returns 0 for completely different strings", () => {
    expect(jaroSimilarity("abc", "xyz")).toBe(0);
  });
});

describe("jaroWinklerSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(jaroWinklerSimilarity("hello", "hello")).toBe(1);
  });

  it("returns higher score than Jaro for strings with common prefix", () => {
    const jaro = jaroSimilarity("MARTHA", "MARHTA");
    const jaroWinkler = jaroWinklerSimilarity("MARTHA", "MARHTA");
    expect(jaroWinkler).toBeGreaterThan(jaro);
  });

  it('gives "Emp Name" vs "Employee Name" a high score (> 0.8)', () => {
    const score = jaroWinklerSimilarity("Emp Name", "Employee Name");
    expect(score).toBeGreaterThan(0.8);
  });

  it("handles empty strings", () => {
    expect(jaroWinklerSimilarity("", "hello")).toBe(0);
    expect(jaroWinklerSimilarity("hello", "")).toBe(0);
  });
});

describe("positionSimilarity", () => {
  it("returns 1 for same position", () => {
    expect(positionSimilarity(3, 3, 10)).toBe(1);
  });

  it("returns 0 for maximum distance", () => {
    expect(positionSimilarity(0, 9, 10)).toBe(0);
  });

  it("returns 1 when totalColumns is 1", () => {
    expect(positionSimilarity(0, 0, 1)).toBe(1);
  });

  it("returns partial score for intermediate distance", () => {
    // Distance 2 out of 9 possible -> 1 - 2/9 = ~0.778
    const score = positionSimilarity(1, 3, 10);
    expect(score).toBeCloseTo(0.778, 2);
  });
});

describe("dataFingerprintSimilarity", () => {
  it("returns 1 for identical value sets", () => {
    expect(dataFingerprintSimilarity(["a", "b", "c"], ["a", "b", "c"])).toBe(
      1,
    );
  });

  it("returns 0 for completely disjoint sets", () => {
    expect(dataFingerprintSimilarity(["a", "b"], ["x", "y"])).toBe(0);
  });

  it("returns partial score for overlapping sets", () => {
    // {a, b, c} intersect {b, c, d} = {b, c} -> 2/4 = 0.5
    const score = dataFingerprintSimilarity(["a", "b", "c"], ["b", "c", "d"]);
    expect(score).toBe(0.5);
  });

  it("returns 0 for empty arrays", () => {
    expect(dataFingerprintSimilarity([], ["a"])).toBe(0);
    expect(dataFingerprintSimilarity(["a"], [])).toBe(0);
  });
});

describe("computeColumnMatchScore", () => {
  it("uses correct weights (50/20/30)", () => {
    const result = computeColumnMatchScore(
      "name",
      "name",
      0,
      0,
      10,
      ["Alice", "Bob"],
      ["Alice", "Bob"],
    );
    // string=1.0*0.5 + position=1.0*0.2 + data=1.0*0.3 = 1.0
    expect(result.score).toBeCloseTo(1.0, 2);
    expect(result.stringScore).toBe(1);
    expect(result.positionScore).toBe(1);
    expect(result.dataScore).toBe(1);
  });

  it("returns isLikelyRename=true for score > 0.85", () => {
    const result = computeColumnMatchScore(
      "Employee Name",
      "Emp Name",
      0,
      0,
      10,
      ["Alice", "Bob", "Carol"],
      ["Alice", "Bob", "Carol"],
    );
    expect(result.score).toBeGreaterThan(0.85);
    expect(result.isLikelyRename).toBe(true);
  });

  it("returns isPossibleRename=true for score > 0.70", () => {
    const result = computeColumnMatchScore(
      "Employee Name",
      "Worker Name",
      0,
      1,
      10,
      ["Alice", "Bob"],
      ["Alice", "Bob"],
    );
    expect(result.score).toBeGreaterThan(0.7);
    expect(result.isPossibleRename).toBe(true);
  });

  it("returns both false for low scores", () => {
    const result = computeColumnMatchScore(
      "Name",
      "Amount",
      0,
      9,
      10,
      ["Alice", "Bob"],
      [100, 200],
    );
    expect(result.isLikelyRename).toBe(false);
    expect(result.isPossibleRename).toBe(false);
  });

  it("accepts custom weights", () => {
    const result = computeColumnMatchScore(
      "name",
      "name",
      0,
      5,
      10,
      [],
      [],
      { string: 1.0, position: 0.0, data: 0.0 },
    );
    // Only string score matters: 1.0 * 1.0 = 1.0
    expect(result.score).toBeCloseTo(1.0, 2);
  });
});
