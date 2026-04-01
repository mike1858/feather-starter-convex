import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  statsAction,
  formatStats,
  statsCommand,
  type StatsResult,
} from "../commands/stats";
import type { TelemetryEvent } from "../lib/telemetry";

describe("feather stats", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "stats-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const makeEvent = (overrides: Partial<TelemetryEvent> = {}): TelemetryEvent => ({
    command: "generate",
    feature: "tasks",
    success: true,
    durationMs: 150,
    timestamp: new Date().toISOString(),
    ...overrides,
  });

  function writeTelemetry(events: TelemetryEvent[]): void {
    const dir = path.join(tempDir, ".feather");
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, "telemetry.json");
    fs.writeFileSync(filePath, events.map((e) => JSON.stringify(e)).join("\n") + "\n");
  }

  describe("statsAction", () => {
    it("reads telemetry file and returns summary object", () => {
      const events = [
        makeEvent({ command: "generate", feature: "tasks", success: true }),
        makeEvent({ command: "add", feature: "projects", success: true }),
        makeEvent({ command: "generate", feature: "tasks", success: false, error: "Some error" }),
      ];
      writeTelemetry(events);

      const result = statsAction({ days: 30 }, tempDir);

      expect(result.totalEvents).toBe(3);
      expect(result.commandCounts).toEqual({ generate: 2, add: 1 });
      expect(result.featureCounts).toEqual({ tasks: 2, projects: 1 });
      expect(result.failedCommands).toBe(1);
      expect(result.errorRate).toBeCloseTo(1 / 3);
    });

    it("returns empty summary when no telemetry file exists", () => {
      const result = statsAction({ days: 30 }, tempDir);

      expect(result.totalEvents).toBe(0);
      expect(result.commandCounts).toEqual({});
      expect(result.featureCounts).toEqual({});
      expect(result.errorRate).toBe(0);
      expect(result.failedCommands).toBe(0);
      expect(result.mostGeneratedFeature).toBeNull();
    });

    it("supports --days option to filter by time range (default: 30 days)", () => {
      const now = new Date();
      const recentEvent = makeEvent({
        timestamp: now.toISOString(),
        command: "generate",
        feature: "tasks",
      });
      const oldEvent = makeEvent({
        timestamp: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
        command: "add",
        feature: "old-feature",
      });
      writeTelemetry([recentEvent, oldEvent]);

      const result = statsAction({ days: 30 }, tempDir);
      expect(result.totalEvents).toBe(1);
      expect(result.commandCounts).toEqual({ generate: 1 });
    });

    it("correctly counts features by name, commands by name", () => {
      const events = [
        makeEvent({ command: "generate", feature: "tasks" }),
        makeEvent({ command: "generate", feature: "projects" }),
        makeEvent({ command: "generate", feature: "tasks" }),
        makeEvent({ command: "add", feature: "contacts" }),
        makeEvent({ command: "validate" }), // no feature
      ];
      writeTelemetry(events);

      const result = statsAction({ days: 30 }, tempDir);

      expect(result.commandCounts).toEqual({ generate: 3, add: 1, validate: 1 });
      expect(result.featureCounts).toEqual({ tasks: 2, projects: 1, contacts: 1 });
      expect(result.mostGeneratedFeature).toBe("tasks");
    });

    it("calculates error rate (failed / total)", () => {
      const events = [
        makeEvent({ success: false }),
        makeEvent({ success: false }),
        makeEvent({ success: true }),
        makeEvent({ success: true }),
      ];
      writeTelemetry(events);

      const result = statsAction({ days: 30 }, tempDir);
      expect(result.errorRate).toBe(0.5);
      expect(result.failedCommands).toBe(2);
    });
  });

  describe("formatStats", () => {
    it("formats result as readable terminal output", () => {
      const result: StatsResult = {
        totalEvents: 10,
        commandCounts: { generate: 7, add: 3 },
        featureCounts: { tasks: 5, projects: 2 },
        errorRate: 0.1,
        failedCommands: 1,
        mostGeneratedFeature: "tasks",
        periodDays: 30,
      };

      const output = formatStats(result);
      expect(output).toContain("Feather CLI Stats (last 30 days)");
      expect(output).toContain("Total commands: 10");
      expect(output).toContain("Error rate:");
      expect(output).toContain("generate");
      expect(output).toContain("tasks");
    });
  });

  describe("statsCommand", () => {
    it("is a Commander command named 'stats'", () => {
      expect(statsCommand.name()).toBe("stats");
      expect(statsCommand.description()).toContain("usage statistics");
    });
  });
});
