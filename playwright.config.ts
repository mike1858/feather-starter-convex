import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Load .env.local for VITE_CONVEX_URL (Playwright doesn't use Vite's env loader)
try {
  const envLocal = readFileSync(".env.local", "utf-8");
  for (const line of envLocal.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.+?)(\s*#.*)?$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
} catch {
  // .env.local not found — rely on existing env vars
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: true,
  },
});
