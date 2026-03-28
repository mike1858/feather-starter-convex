// Test Matrix: ERRORS constant
// | # | State              | What to verify                               |
// |---|--------------------| ---------------------------------------------|
// | 1 | error groups       | auth, onboarding, common groups exist        |
// | 2 | error values       | all values are non-empty strings             |
// | 3 | specific values    | key constants match expected strings         |

import { describe, it, expect } from "vitest";
import { ERRORS } from "./errors";

describe("ERRORS", () => {
  it("has auth, onboarding, and common groups", () => {
    expect(typeof ERRORS.auth).toBe("object");
    expect(typeof ERRORS.onboarding).toBe("object");
    expect(typeof ERRORS.common).toBe("object");
  });

  it("all error values are non-empty strings", () => {
    for (const group of Object.values(ERRORS)) {
      for (const [, value] of Object.entries(group)) {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });

  it("key constants match expected strings", () => {
    expect(ERRORS.auth.EMAIL_NOT_SENT).toBe("Unable to send email.");
    expect(ERRORS.common.UNKNOWN).toBe("Unknown error.");
  });
});
