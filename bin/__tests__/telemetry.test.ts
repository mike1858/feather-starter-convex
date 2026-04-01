import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  isEnabled,
  appendEvent,
  readEvents,
  postRemote,
  sanitizeEvent,
  getTelemetryLevel,
  type TelemetryEvent,
} from "../lib/telemetry";

describe("telemetry", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "telemetry-test-"));
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  const makeEvent = (overrides: Partial<TelemetryEvent> = {}): TelemetryEvent => ({
    command: "generate",
    feature: "tasks",
    success: true,
    durationMs: 150,
    timestamp: "2026-04-01T10:00:00.000Z",
    ...overrides,
  });

  describe("appendEvent", () => {
    it("writes NDJSON line to .feather/telemetry.json, creating dir if missing", () => {
      const event = makeEvent();
      appendEvent(tempDir, event);

      const filePath = path.join(tempDir, ".feather", "telemetry.json");
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.trim().split("\n");
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0])).toEqual(event);
    });

    it("appends multiple events as separate lines", () => {
      appendEvent(tempDir, makeEvent({ command: "add" }));
      appendEvent(tempDir, makeEvent({ command: "validate" }));

      const filePath = path.join(tempDir, ".feather", "telemetry.json");
      const lines = fs.readFileSync(filePath, "utf-8").trim().split("\n");
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]).command).toBe("add");
      expect(JSON.parse(lines[1]).command).toBe("validate");
    });
  });

  describe("readEvents", () => {
    it("parses all NDJSON lines from telemetry file", () => {
      const filePath = path.join(tempDir, "telemetry.json");
      const events = [makeEvent({ command: "add" }), makeEvent({ command: "generate" })];
      fs.writeFileSync(filePath, events.map((e) => JSON.stringify(e)).join("\n") + "\n");

      const result = readEvents(filePath);
      expect(result).toHaveLength(2);
      expect(result[0].command).toBe("add");
      expect(result[1].command).toBe("generate");
    });

    it("returns empty array when file does not exist", () => {
      const result = readEvents(path.join(tempDir, "nonexistent.json"));
      expect(result).toEqual([]);
    });

    it("ignores blank lines", () => {
      const filePath = path.join(tempDir, "telemetry.json");
      fs.writeFileSync(
        filePath,
        JSON.stringify(makeEvent()) + "\n\n" + JSON.stringify(makeEvent({ command: "add" })) + "\n\n",
      );

      const result = readEvents(filePath);
      expect(result).toHaveLength(2);
    });
  });

  describe("isEnabled", () => {
    it("returns false when FEATHER_TELEMETRY=false env var set", () => {
      vi.stubEnv("FEATHER_TELEMETRY", "false");
      expect(isEnabled(tempDir)).toBe(false);
    });

    it("returns false when feather.yaml has telemetry.enabled=false", () => {
      fs.writeFileSync(
        path.join(tempDir, "feather.yaml"),
        "name: test\ntelemetry:\n  enabled: false\n",
      );
      expect(isEnabled(tempDir)).toBe(false);
    });

    it("returns true by default (no config, no env var)", () => {
      expect(isEnabled(tempDir)).toBe(true);
    });
  });

  describe("postRemote", () => {
    it("sends POST to configured endpoint (mocked fetch, fire-and-forget)", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("ok", { status: 200 }),
      );

      fs.writeFileSync(
        path.join(tempDir, "feather.yaml"),
        "name: test\ntelemetry:\n  remote: https://example.com/telemetry\n",
      );

      const event = makeEvent();
      await postRemote(tempDir, event);

      expect(fetchSpy).toHaveBeenCalledOnce();
      expect(fetchSpy).toHaveBeenCalledWith("https://example.com/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    });

    it("does nothing when no remote endpoint configured", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("ok", { status: 200 }),
      );

      // No feather.yaml at all
      await postRemote(tempDir, makeEvent());
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("does not throw on network failure (fire-and-forget)", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

      fs.writeFileSync(
        path.join(tempDir, "feather.yaml"),
        "name: test\ntelemetry:\n  remote: https://example.com/telemetry\n",
      );

      // Should not throw
      await expect(postRemote(tempDir, makeEvent())).resolves.toBeUndefined();
    });
  });

  describe("sanitizeEvent", () => {
    it("strips fields matching sensitive patterns (password, token, secret, key, authorization)", () => {
      const event = makeEvent({
        error: "password=hunter2 token=abc123 secret=xyz key=mykey authorization=Bearer foo",
      });

      const sanitized = sanitizeEvent(event);
      expect(sanitized.error).not.toContain("hunter2");
      expect(sanitized.error).not.toContain("abc123");
      expect(sanitized.error).not.toContain("xyz");
      expect(sanitized.error).not.toContain("mykey");
      expect(sanitized.error).not.toContain("Bearer foo");
      expect(sanitized.command).toBe("generate"); // non-sensitive fields untouched
    });

    it("returns event unchanged when no sensitive data", () => {
      const event = makeEvent({ error: "Something went wrong" });
      const sanitized = sanitizeEvent(event);
      expect(sanitized.error).toBe("Something went wrong");
    });
  });

  describe("getTelemetryLevel", () => {
    it("returns 'basic' by default", () => {
      expect(getTelemetryLevel(tempDir)).toBe("basic");
    });

    it("reads level from feather.yaml", () => {
      fs.writeFileSync(
        path.join(tempDir, "feather.yaml"),
        "name: test\ntelemetry:\n  level: schema\n",
      );
      expect(getTelemetryLevel(tempDir)).toBe("schema");
    });

    it("returns 'basic' when feather.yaml has no telemetry section", () => {
      fs.writeFileSync(path.join(tempDir, "feather.yaml"), "name: test\n");
      expect(getTelemetryLevel(tempDir)).toBe("basic");
    });
  });
});
