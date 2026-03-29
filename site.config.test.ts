// Test Matrix: site.config
// | # | State           | What to verify                                    |
// |---|-----------------|---------------------------------------------------|
// | 1 | config object   | all required fields present with correct types    |

import { describe, expect, test } from "vitest";
import siteConfig from "./site.config";

describe("site.config", () => {
  test("exports configuration object with all required fields", () => {
    expect(typeof siteConfig).toBe("object");
    expect(siteConfig.siteTitle).toBe("Feather Starter");
    expect(typeof siteConfig.siteDescription).toBe("string");
    expect(siteConfig).toHaveProperty("siteUrl");
    expect(siteConfig).toHaveProperty("siteImage");
    expect(siteConfig).toHaveProperty("favicon");
    expect(siteConfig).toHaveProperty("twitterHandle");
    expect(siteConfig).toHaveProperty("email");
    expect(siteConfig).toHaveProperty("address");
  });
});
