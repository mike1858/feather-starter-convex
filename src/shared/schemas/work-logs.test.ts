// Test Matrix: work-logs schema
// | # | Subject              | State                  | What to verify                    |
// |---|----------------------|------------------------|-----------------------------------|
// | 1 | WORK_LOG_BODY_MAX    | constant               | equals 2000                       |
// | 2 | workLogBody          | empty string           | rejects                           |
// | 3 | workLogBody          | valid string           | accepts                           |
// | 4 | workLogBody          | whitespace             | trims                             |
// | 5 | createWorkLogInput   | missing body           | rejects                           |
// | 6 | createWorkLogInput   | body only              | accepts                           |
// | 7 | createWorkLogInput   | body + timeMinutes     | accepts                           |
// | 8 | createWorkLogInput   | negative timeMinutes   | rejects                           |
// | 9 | createWorkLogInput   | non-integer time       | rejects                           |
// |10 | updateWorkLogInput   | empty object           | accepts (all optional)            |
// |11 | updateWorkLogInput   | body update            | accepts                           |

import { describe, expect, test } from "vitest";
import {
  WORK_LOG_BODY_MAX_LENGTH,
  workLogBody,
  createWorkLogInput,
  updateWorkLogInput,
} from "./work-logs";

describe("work-logs schema", () => {
  test("WORK_LOG_BODY_MAX_LENGTH is 2000", () => {
    expect(WORK_LOG_BODY_MAX_LENGTH).toBe(2000);
  });

  test("workLogBody rejects empty string", () => {
    expect(workLogBody.safeParse("").success).toBe(false);
  });

  test("workLogBody accepts valid body", () => {
    expect(workLogBody.safeParse("Did some work").success).toBe(true);
  });

  test("workLogBody trims whitespace", () => {
    const result = workLogBody.parse("  trimmed  ");
    expect(result).toBe("trimmed");
  });

  test("createWorkLogInput requires body", () => {
    expect(createWorkLogInput.safeParse({}).success).toBe(false);
  });

  test("createWorkLogInput accepts body only", () => {
    expect(
      createWorkLogInput.safeParse({ body: "work" }).success,
    ).toBe(true);
  });

  test("createWorkLogInput accepts body with timeMinutes", () => {
    const result = createWorkLogInput.safeParse({
      body: "timed work",
      timeMinutes: 30,
    });
    expect(result.success).toBe(true);
  });

  test("createWorkLogInput rejects negative timeMinutes", () => {
    expect(
      createWorkLogInput.safeParse({ body: "work", timeMinutes: -1 })
        .success,
    ).toBe(false);
  });

  test("createWorkLogInput rejects non-integer timeMinutes", () => {
    expect(
      createWorkLogInput.safeParse({ body: "work", timeMinutes: 1.5 })
        .success,
    ).toBe(false);
  });

  test("updateWorkLogInput allows optional fields", () => {
    expect(updateWorkLogInput.safeParse({}).success).toBe(true);
  });

  test("updateWorkLogInput accepts body update", () => {
    expect(
      updateWorkLogInput.safeParse({ body: "updated" }).success,
    ).toBe(true);
  });
});
